import * as react from 'react';
import { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

type CreditChekErrorCode = 
/** The `sessionId` function threw or returned an empty value. */
"session_failed"
/** Required options are missing or invalid. */
 | "invalid_config";
declare class CreditChekError extends Error {
    readonly code: CreditChekErrorCode;
    constructor(code: CreditChekErrorCode, message: string, options?: {
        cause?: unknown;
    });
}

/** A step the customer goes through in the widget, in the order you list them. */
type WidgetModule = "identity" | "liveness";
/** Whether the widget runs live (`production`) or in test mode (`development`). */
type CreditChekEnvironment = "production" | "development";
/** Customer details you already hold. Prefilled identity fields are locked in the widget. */
interface WidgetPrefill {
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
interface WidgetConfig {
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
interface WidgetStepEvent {
    module: WidgetModule;
    status: "successful" | "failed";
}
/** Passed to `onClose` once the widget has closed, for any reason. */
interface WidgetCloseResult {
    sessionId: string;
    /** Step events received while the widget was open, oldest first. */
    steps: WidgetStepEvent[];
}
/** A session ID, or a function that creates one (usually by calling your server). */
type SessionIdSource = string | (() => string | Promise<string>);
interface WidgetCallbacks {
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
interface OpenWidgetOptions extends WidgetConfig, WidgetCallbacks {
    /**
     * The session to open, or a function that creates one.
     * With a function, the modal opens straight away and shows a spinner until the session is ready.
     */
    sessionId: SessionIdSource;
}
interface WidgetHandle {
    /** Close the widget. `onClose` fires as normal. */
    close(): void;
    /** Move keyboard focus into the widget. */
    focus(): void;
    /** Remove the modal without calling `onClose`. No further callbacks fire. */
    detach(): void;
    /** Whether the widget is still open and tracked. */
    readonly isOpen: boolean;
}

interface UseCreditChekOptions extends WidgetConfig, WidgetCallbacks {
}
interface UseCreditChekResult {
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
declare function useCreditChek(options: UseCreditChekOptions): UseCreditChekResult;

interface CreditChekButtonProps extends UseCreditChekOptions, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onError" | keyof UseCreditChekOptions> {
    /** The session to open, or a function that creates one on click. */
    sessionId: SessionIdSource;
    /** Runs before the widget opens. Call `event.preventDefault()` to stop it opening. */
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    children?: ReactNode;
}
/** A button that opens the CreditChek widget in a modal. Other props are passed to the `<button>`. */
declare function CreditChekButton({ sessionId, publicKey, modules, themeColor, prefill, environment, widgetUrl, onStep, onClose, onError, onClick, children, type, ...buttonProps }: CreditChekButtonProps): react.JSX.Element;

/**
 * Opens the CreditChek widget in a modal on the current page, and tracks it until it closes.
 *
 * `sessionId` can be a function that creates the session: the modal shows a loading
 * spinner until it resolves.
 *
 * Exactly one of `onClose` or `onError` fires for each call.
 */
declare function openCreditChekWidget(options: OpenWidgetOptions): WidgetHandle;

/** Builds the full widget URL for a session. */
declare function buildWidgetUrl(config: WidgetConfig, sessionId: string): string;

declare const WIDGET_URL = "https://securedwidget.creditchek.africa/";

export { CreditChekButton, type CreditChekButtonProps, type CreditChekEnvironment, CreditChekError, type CreditChekErrorCode, type OpenWidgetOptions, type SessionIdSource, type UseCreditChekOptions, type UseCreditChekResult, WIDGET_URL, type WidgetCallbacks, type WidgetCloseResult, type WidgetConfig, type WidgetHandle, type WidgetModule, type WidgetPrefill, type WidgetStepEvent, buildWidgetUrl, openCreditChekWidget, useCreditChek };
