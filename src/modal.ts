const STYLE_ID = "creditchek-modal-styles";
const TRANSITION_MS = 280;

const CSS = `
.creditchek-modal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px}
.creditchek-modal__backdrop{position:absolute;inset:0;background:rgba(16,24,40,.6);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);opacity:0;transition:opacity ${TRANSITION_MS}ms ease}
.creditchek-modal__panel{position:relative;width:min(460px,100%);height:min(780px,100%);background:#F9FAFB;border-radius:16px;overflow:hidden;box-shadow:0 24px 48px -12px rgba(16,24,40,.35);opacity:0;transform:translateY(24px) scale(.98);transition:opacity ${TRANSITION_MS}ms ease,transform ${TRANSITION_MS}ms cubic-bezier(.2,.8,.2,1)}
.creditchek-modal--open .creditchek-modal__backdrop{opacity:1}
.creditchek-modal--open .creditchek-modal__panel{opacity:1;transform:none}
.creditchek-modal__frame{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity 200ms ease}
.creditchek-modal--ready .creditchek-modal__frame{opacity:1}
.creditchek-modal__loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity 200ms ease}
.creditchek-modal--ready .creditchek-modal__loader{opacity:0;pointer-events:none}
.creditchek-modal__spinner{width:36px;height:36px;border-radius:50%;border:3px solid rgba(0,70,230,.15);border-top-color:var(--creditchek-accent,#0046E6);animation:creditchek-spin .9s linear infinite}
.creditchek-modal__close{position:absolute;top:10px;right:10px;z-index:1;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:rgba(255,255,255,.9);color:#344054;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.12)}
.creditchek-modal__close:hover{background:#fff}
.creditchek-modal__close:focus-visible{outline:2px solid var(--creditchek-accent,#0046E6);outline-offset:2px}
@keyframes creditchek-spin{to{transform:rotate(360deg)}}
@media (max-width:560px){
  .creditchek-modal{padding:0}
  .creditchek-modal__panel{width:100%;height:100%;border-radius:0;transform:translateY(100%)}
}
@media (prefers-reduced-motion:reduce){
  .creditchek-modal__backdrop,.creditchek-modal__panel,.creditchek-modal__frame,.creditchek-modal__loader{transition:none}
  .creditchek-modal__panel{transform:none}
  .creditchek-modal__spinner{animation-duration:2.4s}
}
`;

const CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export interface ModalOptions {
  /** Spinner and focus-ring colour. */
  accentColor?: string;
  /** Called when the customer dismisses the modal with the close button or Escape. */
  onDismiss: () => void;
}

export interface Modal {
  readonly frame: HTMLIFrameElement;
  /** Loads the widget. The loader stays up until the widget reports it's ready, or the page loads. */
  navigate(url: string): void;
  /** Swaps the loader for the widget. */
  reveal(): void;
  focus(): void;
  /** Animates the modal out and removes it. */
  destroy(): void;
}

/** Renders the modal that hosts the widget iframe. Plain DOM, so it works with or without React. */
export function createModal({ accentColor, onDismiss }: ModalOptions): Modal {
  injectStyles();

  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const root = document.createElement("div");
  root.className = "creditchek-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "CreditChek verification");
  if (accentColor) root.style.setProperty("--creditchek-accent", accentColor);

  const backdrop = document.createElement("div");
  backdrop.className = "creditchek-modal__backdrop";

  const panel = document.createElement("div");
  panel.className = "creditchek-modal__panel";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "creditchek-modal__close";
  closeButton.setAttribute("aria-label", "Close verification");
  closeButton.innerHTML = CLOSE_ICON;

  const loader = document.createElement("div");
  loader.className = "creditchek-modal__loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-label", "Loading");
  loader.innerHTML = '<span class="creditchek-modal__spinner"></span>';

  const frame = document.createElement("iframe");
  frame.className = "creditchek-modal__frame";
  frame.title = "CreditChek verification";
  // Camera and microphone for the liveness check
  frame.setAttribute("allow", "camera; microphone; fullscreen");

  // Focus sentinels keep Tab inside the modal, even as focus moves in and out of the iframe
  const sentinel = () => {
    const el = document.createElement("span");
    el.tabIndex = 0;
    return el;
  };
  const startSentinel = sentinel();
  const endSentinel = sentinel();
  startSentinel.addEventListener("focus", () => frame.focus());
  endSentinel.addEventListener("focus", () => closeButton.focus());

  panel.append(startSentinel, closeButton, loader, frame, endSentinel);
  root.append(backdrop, panel);
  document.body.appendChild(root);

  let destroyed = false;
  let revealed = false;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
    }
  };
  document.addEventListener("keydown", onKeyDown);
  closeButton.addEventListener("click", () => onDismiss());

  // Start the enter transition on the next frame, after the initial styles apply
  void root.offsetWidth;
  root.classList.add("creditchek-modal--open");
  closeButton.focus();

  const reveal = () => {
    if (revealed || destroyed) return;
    revealed = true;
    root.classList.add("creditchek-modal--ready");
    frame.focus();
  };

  return {
    frame,
    navigate(url) {
      if (destroyed) return;
      // Older widget builds don't send "ready", so the first page load also reveals it
      frame.addEventListener("load", reveal, { once: true });
      frame.src = url;
    },
    reveal,
    focus() {
      if (!destroyed) (revealed ? frame : closeButton).focus();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("keydown", onKeyDown);
      root.classList.remove("creditchek-modal--open");

      const remove = () => {
        root.remove();
        document.body.style.overflow = previousOverflow;
        if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
      };
      const reducedMotion =
        typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) remove();
      else setTimeout(remove, TRANSITION_MS);
    },
  };
}
