import type { CreditChekEnvironment } from "./types";

export const WIDGET_URLS: Record<CreditChekEnvironment, string> = {
  production: "https://securedwidget.creditchek.africa/",
  development: "https://development--securedwidget.netlify.app/",
};

/** TEMPORARY: sends every environment to a locally running widget. Set to `""` to restore `WIDGET_URLS`. */
export const LOCAL_WIDGET_URL = "";

/** Tells the widget to report each finished step back to this window with `postMessage`. */
export const WIDGET_SOURCE = "react";
