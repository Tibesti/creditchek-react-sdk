import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openCreditChekWidget } from "../src";
import { getModal, postFrom, stubWindowOpen } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("openCreditChekWidget", () => {
  const base = { publicKey: "pk_test" };

  it("renders a dialog with a camera-enabled iframe pointed at the widget", () => {
    document.body.style.overflow = "auto";
    openCreditChekWidget({ ...base, sessionId: "s-1" });

    const { root, frame } = getModal();
    expect(root?.getAttribute("role")).toBe("dialog");
    expect(root?.getAttribute("aria-modal")).toBe("true");
    expect(frame?.getAttribute("allow")).toContain("camera");
    expect(frame?.src).toContain("sessionId=s-1");
    expect(frame?.src).toContain("hostOrigin=");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not open a window", () => {
    const { open } = stubWindowOpen();
    openCreditChekWidget({ ...base, sessionId: "s-1" });
    expect(open).not.toHaveBeenCalled();
  });

  it("reports step events from the widget frame only", () => {
    const onStep = vi.fn();
    openCreditChekWidget({ ...base, sessionId: "s-1", onStep });
    const { frame } = getModal();

    postFrom(frame!.contentWindow, { module: "liveness", status: "successful" });
    postFrom(window, { module: "identity", status: "successful" }); // another window
    postFrom(frame!.contentWindow, { module: "identity", status: "successful" }, "https://evil.example");
    postFrom(frame!.contentWindow, { module: "credit", status: "successful" }); // not supported

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith({ module: "liveness", status: "successful" });
  });

  it("reveals the widget when it reports ready", () => {
    openCreditChekWidget({ ...base, sessionId: "s-1" });
    const { root, frame } = getModal();
    expect(root?.classList.contains("creditchek-modal--ready")).toBe(false);

    postFrom(frame!.contentWindow, { type: "ready" });
    expect(root?.classList.contains("creditchek-modal--ready")).toBe(true);
  });

  it("closes when the widget asks, then removes the modal and restores the page", () => {
    document.body.style.overflow = "auto";
    const onClose = vi.fn();
    const handle = openCreditChekWidget({ ...base, sessionId: "s-1", onClose });
    const { frame } = getModal();

    postFrom(frame!.contentWindow, { module: "identity", status: "failed" });
    postFrom(frame!.contentWindow, { type: "close" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith({ sessionId: "s-1", steps: [{ module: "identity", status: "failed" }] });
    expect(handle.isOpen).toBe(false);

    vi.advanceTimersByTime(300);
    expect(getModal().root).toBeNull();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("closes from the close button", () => {
    const onClose = vi.fn();
    openCreditChekWidget({ ...base, sessionId: "s-1", onClose });
    getModal().closeButton!.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    openCreditChekWidget({ ...base, sessionId: "s-1", onClose });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from handle.close()", () => {
    const onClose = vi.fn();
    const handle = openCreditChekWidget({ ...base, sessionId: "s-1", onClose });
    handle.close();
    handle.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes the modal without callbacks on detach()", () => {
    const onClose = vi.fn();
    const handle = openCreditChekWidget({ ...base, sessionId: "s-1", onClose });
    handle.detach();
    vi.advanceTimersByTime(300);
    expect(getModal().root).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the loader while a sessionId function runs, then loads the widget", async () => {
    let resolve!: (id: string) => void;
    openCreditChekWidget({ ...base, sessionId: () => new Promise<string>((r) => (resolve = r)) });

    const { frame } = getModal();
    expect(frame?.getAttribute("src")).toBeNull();

    resolve("s-async");
    await vi.waitFor(() => expect(frame?.src).toContain("sessionId=s-async"));
  });

  it("removes the modal and reports session_failed when the function throws", async () => {
    const onError = vi.fn();
    const onClose = vi.fn();
    openCreditChekWidget({ ...base, sessionId: () => Promise.reject(new Error("500")), onError, onClose });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "session_failed" })));
    vi.advanceTimersByTime(300);
    expect(getModal().root).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports onClose with the session ID if dismissed while the session loads", async () => {
    const onClose = vi.fn();
    let resolve!: (id: string) => void;
    openCreditChekWidget({ ...base, sessionId: () => new Promise<string>((r) => (resolve = r)), onClose });

    getModal().closeButton!.click();
    expect(onClose).not.toHaveBeenCalled();

    resolve("s-late");
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith({ sessionId: "s-late", steps: [] }));
  });

  it("reports invalid_config without rendering anything", () => {
    const onError = vi.fn();
    openCreditChekWidget({ publicKey: "", sessionId: "s-1", onError });
    expect(getModal().root).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_config" }));
  });
});

describe("openCreditChekWidget edge cases", () => {
  it("never opens another window", () => {
    const { open } = stubWindowOpen();
    openCreditChekWidget({ publicKey: "pk_test", sessionId: () => "s-1" });
    openCreditChekWidget({ publicKey: "pk_test", sessionId: "s-2" });
    expect(open).not.toHaveBeenCalled();
  });

  it("reports session_failed when the sessionId function returns nothing", async () => {
    const onError = vi.fn();
    openCreditChekWidget({ publicKey: "pk_test", sessionId: () => "", onError });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "session_failed" })));
  });

  it("reports session_failed when the sessionId function throws synchronously", async () => {
    const onError = vi.fn();
    openCreditChekWidget({
      publicKey: "pk_test",
      sessionId: () => {
        throw new Error("boom");
      },
      onError,
    });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "session_failed" })));
  });

  it("ignores messages after the widget has closed", () => {
    const onStep = vi.fn();
    openCreditChekWidget({ publicKey: "pk_test", sessionId: "s-1", onStep });
    const frameWindow = getModal().frame!.contentWindow;
    postFrom(frameWindow, { type: "close" });
    postFrom(frameWindow, { module: "identity", status: "successful" });
    expect(onStep).not.toHaveBeenCalled();
  });
});
