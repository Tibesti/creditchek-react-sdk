import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import type { SessionIdSource } from "./types";
import { useCreditChek, type UseCreditChekOptions } from "./useCreditChek";

export interface CreditChekButtonProps
  extends UseCreditChekOptions,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onError" | keyof UseCreditChekOptions> {
  /** The session to open, or a function that creates one on click. */
  sessionId: SessionIdSource;
  /** Runs before the widget opens. Call `event.preventDefault()` to stop it opening. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

/** A button that opens the CreditChek widget in a modal. Other props are passed to the `<button>`. */
export function CreditChekButton({
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
}: CreditChekButtonProps) {
  const { open, isOpen } = useCreditChek({
    publicKey,
    modules,
    themeColor,
    prefill,
    environment,
    widgetUrl,
    onStep,
    onClose,
    onError,
  });

  return (
    <button
      {...buttonProps}
      type={type}
      aria-busy={isOpen || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) open(sessionId);
      }}
    >
      {children}
    </button>
  );
}
