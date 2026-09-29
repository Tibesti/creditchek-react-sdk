import { useCallback, useEffect, useRef, useState } from "react";
import type { CreditChekError } from "./errors";
import { openCreditChekWidget } from "./openWidget";
import type { SessionIdSource, WidgetCallbacks, WidgetConfig, WidgetHandle, WidgetStepEvent } from "./types";

export interface UseCreditChekOptions extends WidgetConfig, WidgetCallbacks {}

export interface UseCreditChekResult {
  /**
   * Opens the widget in a modal on this page.
   * Pass a function to create the session on click; see {@link OpenWidgetOptions.sessionId}.
   * If the widget is already open, this focuses it instead.
   */
  open: (sessionId: SessionIdSource) => void;
  /** Closes the widget. `onClose` fires as normal. */
  close: () => void;
  /** True from `open` until the widget closes or an error occurs. */
  isOpen: boolean;
  /** Step events received since the last `open`. */
  steps: WidgetStepEvent[];
  /** The error from the last `open`, if any. */
  error: CreditChekError | null;
}

/**
 * Opens and tracks the CreditChek widget.
 *
 * Options are read when `open` is called, so they can change between renders.
 * If the component unmounts while the widget is open, the modal is removed and
 * callbacks stop firing.
 */
export function useCreditChek(options: UseCreditChekOptions): UseCreditChekResult {
  const optionsRef = useRef(options);
  const handleRef = useRef<WidgetHandle | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<WidgetStepEvent[]>([]);
  const [error, setError] = useState<CreditChekError | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => () => handleRef.current?.detach(), []);

  const open = useCallback((sessionId: SessionIdSource) => {
    const current = handleRef.current;
    if (current?.isOpen) {
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
        setSteps((previous) => [...previous, step]);
        optionsRef.current.onStep?.(step);
      },
      onClose: (result) => {
        handleRef.current = null;
        setIsOpen(false);
        optionsRef.current.onClose?.(result);
      },
      onError: (err) => {
        handleRef.current = null;
        setIsOpen(false);
        setError(err);
        optionsRef.current.onError?.(err);
      },
    });
    // Bad config fails synchronously, and the handle is already dead
    handleRef.current = handle.isOpen ? handle : null;
  }, []);

  const close = useCallback(() => handleRef.current?.close(), []);

  return { open, close, isOpen, steps, error };
}
