import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreditChekButton, useCreditChek } from "../src";
import { getModal, postFrom } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.querySelectorAll(".creditchek-modal").forEach((el) => el.remove());
  document.body.style.overflow = "";
});

describe("useCreditChek", () => {
  it("tracks isOpen and steps through a full flow", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useCreditChek({ publicKey: "pk", onClose }));

    act(() => result.current.open("s-1"));
    expect(result.current.isOpen).toBe(true);
    const frameWindow = getModal().frame!.contentWindow;

    act(() => postFrom(frameWindow, { module: "identity", status: "successful" }));
    expect(result.current.steps).toEqual([{ module: "identity", status: "successful" }]);

    act(() => postFrom(frameWindow, { type: "close" }));
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledWith({ sessionId: "s-1", steps: [{ module: "identity", status: "successful" }] });
  });

  it("does not open a second modal while one is open", () => {
    const { result } = renderHook(() => useCreditChek({ publicKey: "pk" }));
    act(() => result.current.open("s-1"));
    act(() => result.current.open("s-2"));
    expect(document.querySelectorAll(".creditchek-modal")).toHaveLength(1);
  });

  it("closes from close()", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useCreditChek({ publicKey: "pk", onClose }));
    act(() => result.current.open("s-1"));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes the modal on unmount without calling back", () => {
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() => useCreditChek({ publicKey: "pk", onClose }));
    act(() => result.current.open("s-1"));
    unmount();
    vi.advanceTimersByTime(300);
    expect(getModal().root).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useCreditChek errors and options", () => {
  it("exposes errors and resets isOpen", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useCreditChek({ publicKey: "", onError }));

    act(() => result.current.open("s-1"));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.error?.code).toBe("invalid_config");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("uses the latest callbacks", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ onStep }) => useCreditChek({ publicKey: "pk", onStep }), {
      initialProps: { onStep: first },
    });

    act(() => result.current.open("s-1"));
    rerender({ onStep: second });
    act(() => postFrom(getModal().frame!.contentWindow, { module: "liveness", status: "successful" }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("CreditChekButton", () => {
  it("opens the modal on click and passes button props through", () => {
    render(
      <CreditChekButton publicKey="pk" sessionId="s-1" className="cta" modules={["identity", "liveness"]}>
        Verify
      </CreditChekButton>,
    );

    const button = screen.getByRole("button", { name: "Verify" });
    expect(button.className).toBe("cta");
    expect(button.getAttribute("type")).toBe("button");

    fireEvent.click(button);
    expect(getModal().frame?.src).toContain("module=identity%2Cliveness");
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("runs onClick first and lets it cancel the open", () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <CreditChekButton publicKey="pk" sessionId="s-1" onClick={onClick}>
        Verify
      </CreditChekButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(getModal().root).toBeNull();
  });
});
