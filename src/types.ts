import type { CreditChekError } from "./errors";

/** A step the customer goes through in the widget, in the order you list them. */
export type WidgetModule = "identity" | "liveness";

/** Whether the widget runs live (`production`) or in test mode (`development`). */
export type CreditChekEnvironment = "production" | "development";

/** Customer details you already hold. Prefilled identity fields are locked in the widget. */
export interface WidgetPrefill {
  firstName?: string;
  lastName?: string;
  /** `YYYY-MM-DD` */
  dob?: string;
  /** 11-digit BVN */
  bvn?: string;
  /** 11-digit NIN */
  nin?: string;
  email?: string;
}

/** Everything that shapes the widget URL, apart from the session. */
export interface WidgetConfig {
  /** Your public key. Must belong to the same app as the secret key that created the session. */
  publicKey: string;
  /** Steps to run, in order. Defaults to `["identity"]`. Put `identity` before `liveness`. */
  modules?: WidgetModule[];
  /** Brand colour as hex, with or without `#`, e.g. `"#0046E6"`. */
  themeColor?: string;
  prefill?: WidgetPrefill;
  /**
   * Sent to the widget as the `environment` query parameter. `"development"` runs it in test mode
   * and shows its Test mode notice. Left out, the widget takes live or test mode from the public key.
   */
  environment?: CreditChekEnvironment;
  /** Override the widget address, e.g. for a preview build. */
  widgetUrl?: string;
}

/**
 * Sent by the widget as each step finishes.
 *
 * Use it for progress in your UI only. Decide whether the customer is verified on
 * your server, by reading the session with your secret key.
 */
export interface WidgetStepEvent {
  module: WidgetModule;
  status: "successful" | "failed";
}

/** Passed to `onClose` once the widget has closed, for any reason. */
export interface WidgetCloseResult {
  sessionId: string;
  /** Step events received while the widget was open, oldest first. */
  steps: WidgetStepEvent[];
}

/** A session ID, or a function that creates one (usually by calling your server). */
export type SessionIdSource = string | (() => string | Promise<string>);

export interface WidgetCallbacks {
  /** Called as each step finishes. See {@link WidgetStepEvent}. */
  onStep?: (event: WidgetStepEvent) => void;
  /**
   * Called once the widget closes: the customer finished, hit an error screen, or closed it.
   * Closing does not mean the customer passed. Check the session on your server.
   */
  onClose?: (result: WidgetCloseResult) => void;
  /** Called if the widget can't be opened, or `sessionId` fails. `onClose` is not called after this. */
  onError?: (error: CreditChekError) => void;
}

export interface OpenWidgetOptions extends WidgetConfig, WidgetCallbacks {
  /**
   * The session to open, or a function that creates one.
   * With a function, the modal opens straight away and shows a spinner until the session is ready.
   */
  sessionId: SessionIdSource;
}

export interface WidgetHandle {
  /** Close the widget. `onClose` fires as normal. */
  close(): void;
  /** Move keyboard focus into the widget. */
  focus(): void;
  /** Remove the modal without calling `onClose`. No further callbacks fire. */
  detach(): void;
  /** Whether the widget is still open and tracked. */
  readonly isOpen: boolean;
}
