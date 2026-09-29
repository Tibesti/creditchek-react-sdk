import { assertWidgetConfig, buildWidgetUrl, resolveWidgetUrl } from "./buildWidgetUrl";
import { CreditChekError } from "./errors";
import { createModal, type Modal } from "./modal";
import type { OpenWidgetOptions, WidgetHandle, WidgetModule, WidgetStepEvent } from "./types";

const MODULES: readonly WidgetModule[] = ["identity", "liveness"];

function parseStepEvent(data: unknown): WidgetStepEvent | null {
  if (!data || typeof data !== "object") return null;
  const { module, status } = data as Record<string, unknown>;
  if (!MODULES.includes(module as WidgetModule)) return null;
  if (status !== "successful" && status !== "failed") return null;
  return { module: module as WidgetModule, status };
}

function messageType(data: unknown): unknown {
  return data && typeof data === "object" ? (data as Record<string, unknown>).type : undefined;
}

function accentColor(themeColor: string | undefined): string | undefined {
  const hex = themeColor?.replace(/^#/, "");
  return hex && /^[0-9a-f]{3,8}$/i.test(hex) ? `#${hex}` : undefined;
}

/**
 * Opens the CreditChek widget in a modal on the current page, and tracks it until it closes.
 *
 * `sessionId` can be a function that creates the session: the modal shows a loading
 * spinner until it resolves.
 *
 * Exactly one of `onClose` or `onError` fires for each call.
 */
export function openCreditChekWidget(options: OpenWidgetOptions): WidgetHandle {
  const { sessionId: sessionSource, onStep, onClose, onError } = options;
  const reportError = onError ?? ((error: CreditChekError) => console.error(error));

  let modal: Modal | null = null;
  let sessionId: string | undefined;
  let widgetClosed = false;
  let settled = false;
  const steps: WidgetStepEvent[] = [];

  const settle = (callback: () => void) => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", handleMessage);
    callback();
  };

  const fail = (error: CreditChekError) => {
    settle(() => {
      modal?.destroy();
      reportError(error);
    });
  };

  const completeIfClosed = () => {
    // While the session is still being created there is nothing to report yet;
    // the session callback finishes the job once it knows the ID.
    if (!widgetClosed || sessionId === undefined) return;
    const result = { sessionId, steps: [...steps] };
    settle(() => onClose?.(result));
  };

  const closeWidget = () => {
    if (widgetClosed) return;
    widgetClosed = true;
    modal?.destroy();
    completeIfClosed();
  };

  function handleMessage(event: MessageEvent) {
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
      onStep?.(step);
    }
  }

  const handle: WidgetHandle = {
    close() {
      if (!settled) closeWidget();
    },
    focus() {
      if (!settled && !widgetClosed) modal?.focus();
    },
    detach() {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      modal?.destroy();
    },
    get isOpen() {
      return !settled && !widgetClosed && !!modal;
    },
  };

  let widgetOrigin: string;
  let initialUrl: string | undefined;
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
    modal.navigate(initialUrl!);
    return handle;
  }

  let pendingSession: Promise<string>;
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
        // The customer closed the modal while the session was being created
        completeIfClosed();
        return;
      }
      modal!.navigate(buildWidgetUrl(options, id));
    },
    (cause) => {
      fail(new CreditChekError("session_failed", "Could not create a CreditChek session.", { cause }));
    },
  );

  return handle;
}
