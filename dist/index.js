"use client";

// src/useCreditChek.ts
import { useCallback, useEffect, useRef, useState } from "react";

// src/constants.ts
var WIDGET_URL = "https://securedwidget.creditchek.africa/";
var ENVIRONMENTS = ["production", "development"];
var LOCAL_WIDGET_URL = "";
var WIDGET_SOURCE = "react";

// src/errors.ts
var CreditChekError = class extends Error {
  constructor(code, message, options) {
    super(message);
    this.name = "CreditChekError";
    this.code = code;
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
};

// src/buildWidgetUrl.ts
var PREFILL_KEYS = ["firstName", "lastName", "dob", "bvn", "nin", "email"];
function resolveWidgetUrl(config) {
  return config.widgetUrl || LOCAL_WIDGET_URL || WIDGET_URL;
}
function assertWidgetConfig(config) {
  if (!config.publicKey || typeof config.publicKey !== "string") {
    throw new CreditChekError("invalid_config", "`publicKey` is required.");
  }
  if (config.modules && config.modules.length === 0) {
    throw new CreditChekError("invalid_config", "`modules` must list at least one step, or be left out.");
  }
  if (config.environment !== void 0 && !ENVIRONMENTS.includes(config.environment)) {
    throw new CreditChekError("invalid_config", '`environment` must be "production" or "development".');
  }
  try {
    new URL(resolveWidgetUrl(config));
  } catch (cause) {
    throw new CreditChekError("invalid_config", "`widgetUrl` is not a valid URL.", { cause });
  }
}
function buildWidgetUrl(config, sessionId) {
  var _a, _b, _c;
  assertWidgetConfig(config);
  if (!sessionId) {
    throw new CreditChekError("invalid_config", "`sessionId` is required.");
  }
  const url = new URL(resolveWidgetUrl(config));
  const params = url.searchParams;
  params.set("publicKey", config.publicKey);
  params.set("sessionId", sessionId);
  params.set("module", ((_a = config.modules) != null ? _a : ["identity"]).join(","));
  params.set("source", WIDGET_SOURCE);
  if (config.environment) params.set("environment", config.environment);
  const hostOrigin = typeof window !== "undefined" ? window.location.origin : "";
  if (hostOrigin && hostOrigin !== "null") params.set("hostOrigin", hostOrigin);
  if (config.themeColor) params.set("themeColor", config.themeColor.replace(/^#/, ""));
  for (const key of PREFILL_KEYS) {
    const value = (_c = (_b = config.prefill) == null ? void 0 : _b[key]) == null ? void 0 : _c.trim();
    if (value) params.set(key, value);
  }
  return url.toString();
}

// src/modal.ts
var STYLE_ID = "creditchek-modal-styles";
var TRANSITION_MS = 280;
var CSS = `
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
var CLOSE_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
function createModal({ accentColor: accentColor2, onDismiss }) {
  injectStyles();
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  const root = document.createElement("div");
  root.className = "creditchek-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "CreditChek verification");
  if (accentColor2) root.style.setProperty("--creditchek-accent", accentColor2);
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
  frame.setAttribute("allow", "camera; microphone; fullscreen");
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
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
    }
  };
  document.addEventListener("keydown", onKeyDown);
  closeButton.addEventListener("click", () => onDismiss());
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
      const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) remove();
      else setTimeout(remove, TRANSITION_MS);
    }
  };
}

// src/openWidget.ts
var MODULES = ["identity", "liveness"];
function parseStepEvent(data) {
  if (!data || typeof data !== "object") return null;
  const { module, status } = data;
  if (!MODULES.includes(module)) return null;
  if (status !== "successful" && status !== "failed") return null;
  return { module, status };
}
function messageType(data) {
  return data && typeof data === "object" ? data.type : void 0;
}
function accentColor(themeColor) {
  const hex = themeColor == null ? void 0 : themeColor.replace(/^#/, "");
  return hex && /^[0-9a-f]{3,8}$/i.test(hex) ? `#${hex}` : void 0;
}
function openCreditChekWidget(options) {
  const { sessionId: sessionSource, onStep, onClose, onError } = options;
  const reportError = onError != null ? onError : ((error) => console.error(error));
  let modal = null;
  let sessionId;
  let widgetClosed = false;
  let settled = false;
  const steps = [];
  const settle = (callback) => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", handleMessage);
    callback();
  };
  const fail = (error) => {
    settle(() => {
      modal == null ? void 0 : modal.destroy();
      reportError(error);
    });
  };
  const completeIfClosed = () => {
    if (!widgetClosed || sessionId === void 0) return;
    const result = { sessionId, steps: [...steps] };
    settle(() => onClose == null ? void 0 : onClose(result));
  };
  const closeWidget = () => {
    if (widgetClosed) return;
    widgetClosed = true;
    modal == null ? void 0 : modal.destroy();
    completeIfClosed();
  };
  function handleMessage(event) {
    if (settled || !modal || event.source !== modal.frame.contentWindow) return;
    if (event.origin !== widgetOrigin) return;
    const type = messageType(event.data);
    if (type === "ready") {
      modal.reveal();
      return;
    }
    if (type === "close") {
      closeWidget();
      return;
    }
    const step = parseStepEvent(event.data);
    if (step) {
      steps.push(step);
      onStep == null ? void 0 : onStep(step);
    }
  }
  const handle = {
    close() {
      if (!settled) closeWidget();
    },
    focus() {
      if (!settled && !widgetClosed) modal == null ? void 0 : modal.focus();
    },
    detach() {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      modal == null ? void 0 : modal.destroy();
    },
    get isOpen() {
      return !settled && !widgetClosed && !!modal;
    }
  };
  let widgetOrigin;
  let initialUrl;
  try {
    assertWidgetConfig(options);
    widgetOrigin = new URL(resolveWidgetUrl(options)).origin;
    if (typeof sessionSource === "string") {
      sessionId = sessionSource;
      initialUrl = buildWidgetUrl(options, sessionSource);
    }
  } catch (error) {
    fail(error instanceof CreditChekError ? error : new CreditChekError("invalid_config", String(error)));
    return handle;
  }
  modal = createModal({ accentColor: accentColor(options.themeColor), onDismiss: closeWidget });
  window.addEventListener("message", handleMessage);
  if (typeof sessionSource === "string") {
    modal.navigate(initialUrl);
    return handle;
  }
  let pendingSession;
  try {
    pendingSession = Promise.resolve(sessionSource());
  } catch (cause) {
    pendingSession = Promise.reject(cause);
  }
  pendingSession.then(
    (id) => {
      if (settled) return;
      if (!id || typeof id !== "string") {
        fail(new CreditChekError("session_failed", "The `sessionId` function did not return a session ID."));
        return;
      }
      sessionId = id;
      if (widgetClosed) {
        completeIfClosed();
        return;
      }
      modal.navigate(buildWidgetUrl(options, id));
    },
    (cause) => {
      fail(new CreditChekError("session_failed", "Could not create a CreditChek session.", { cause }));
    }
  );
  return handle;
}

// src/useCreditChek.ts
function useCreditChek(options) {
  const optionsRef = useRef(options);
  const handleRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    optionsRef.current = options;
  });
  useEffect(() => () => {
    var _a;
    return (_a = handleRef.current) == null ? void 0 : _a.detach();
  }, []);
  const open = useCallback((sessionId) => {
    const current = handleRef.current;
    if (current == null ? void 0 : current.isOpen) {
      current.focus();
      return;
    }
    setSteps([]);
    setError(null);
    setIsOpen(true);
    const handle = openCreditChekWidget({
      ...optionsRef.current,
      sessionId,
      onStep: (step) => {
        var _a, _b;
        setSteps((previous) => [...previous, step]);
        (_b = (_a = optionsRef.current).onStep) == null ? void 0 : _b.call(_a, step);
      },
      onClose: (result) => {
        var _a, _b;
        handleRef.current = null;
        setIsOpen(false);
        (_b = (_a = optionsRef.current).onClose) == null ? void 0 : _b.call(_a, result);
      },
      onError: (err) => {
        var _a, _b;
        handleRef.current = null;
        setIsOpen(false);
        setError(err);
        (_b = (_a = optionsRef.current).onError) == null ? void 0 : _b.call(_a, err);
      }
    });
    handleRef.current = handle.isOpen ? handle : null;
  }, []);
  const close = useCallback(() => {
    var _a;
    return (_a = handleRef.current) == null ? void 0 : _a.close();
  }, []);
  return { open, close, isOpen, steps, error };
}

// src/CreditChekButton.tsx
import { jsx } from "react/jsx-runtime";
function CreditChekButton({
  sessionId,
  publicKey,
  modules,
  themeColor,
  prefill,
  environment,
  widgetUrl,
  onStep,
  onClose,
  onError,
  onClick,
  children = "Verify with CreditChek",
  type = "button",
  ...buttonProps
}) {
  const { open, isOpen } = useCreditChek({
    publicKey,
    modules,
    themeColor,
    prefill,
    environment,
    widgetUrl,
    onStep,
    onClose,
    onError
  });
  return /* @__PURE__ */ jsx(
    "button",
    {
      ...buttonProps,
      type,
      "aria-busy": isOpen || void 0,
      onClick: (event) => {
        onClick == null ? void 0 : onClick(event);
        if (!event.defaultPrevented) open(sessionId);
      },
      children
    }
  );
}
export {
  CreditChekButton,
  CreditChekError,
  WIDGET_URL,
  buildWidgetUrl,
  openCreditChekWidget,
  useCreditChek
};
//# sourceMappingURL=index.js.map