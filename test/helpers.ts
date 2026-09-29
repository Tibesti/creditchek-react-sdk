import { vi } from "vitest";

export const WIDGET_ORIGIN = "https://securedwidget.creditchek.africa";

export interface FakePopup {
  closed: boolean;
  close: () => void;
  focus: ReturnType<typeof vi.fn>;
  location: { href: string };
  document: { title: string; body: { innerHTML: string } };
}

/** Stubs `window.open` with a fake pop-up. Pass `null` to simulate a pop-up blocker. */
export function stubWindowOpen(result: "popup" | null = "popup") {
  const popup: FakePopup = {
    closed: false,
    close() {
      this.closed = true;
    },
    focus: vi.fn(),
    location: { href: "" },
    document: { title: "", body: { innerHTML: "" } },
  };
  const open = vi.spyOn(window, "open").mockImplementation((url) => {
    if (result === null) return null;
    popup.location.href = String(url);
    return popup as unknown as Window;
  });
  return { popup, open };
}

/** Dispatches a message on `window` as if `source` had posted it. */
export function postFrom(source: unknown, data: unknown, origin = WIDGET_ORIGIN) {
  const event = new MessageEvent("message", { data, origin });
  Object.defineProperty(event, "source", { value: source });
  window.dispatchEvent(event);
}

/** The SDK's modal, if one is on the page. */
export function getModal() {
  const root = document.querySelector<HTMLElement>(".creditchek-modal");
  const frame = root?.querySelector("iframe") ?? null;
  const closeButton = root?.querySelector<HTMLButtonElement>(".creditchek-modal__close") ?? null;
  return { root, frame, closeButton };
}
