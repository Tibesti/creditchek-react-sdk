import type { CreditChekEnvironment } from "./types";

export const WIDGET_URL = "https://securedwidget.creditchek.africa/";

export const ENVIRONMENTS: readonly CreditChekEnvironment[] = ["production", "development"];

/** TEMPORARY: sends the widget to a locally running copy. Set to `""` to restore `WIDGET_URL`. */
export const LOCAL_WIDGET_URL = "";

/** Tells the widget to report each finished step back to this window with `postMessage`. */
export const WIDGET_SOURCE = "react";
