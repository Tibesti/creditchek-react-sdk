export type CreditChekErrorCode =
  /** The `sessionId` function threw or returned an empty value. */
  | "session_failed"
  /** Required options are missing or invalid. */
  | "invalid_config";

export class CreditChekError extends Error {
  readonly code: CreditChekErrorCode;

  constructor(code: CreditChekErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CreditChekError";
    this.code = code;
    if (options && "cause" in options) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}
