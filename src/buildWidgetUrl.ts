import { ENVIRONMENTS, LOCAL_WIDGET_URL, WIDGET_SOURCE, WIDGET_URL } from "./constants";
import { CreditChekError } from "./errors";
import type { WidgetConfig, WidgetPrefill } from "./types";

const PREFILL_KEYS: (keyof WidgetPrefill)[] = ["firstName", "lastName", "dob", "bvn", "nin", "email"];

/** The widget address for this config, without any query string. */
export function resolveWidgetUrl(config: Pick<WidgetConfig, "widgetUrl">): string {
  return config.widgetUrl || LOCAL_WIDGET_URL || WIDGET_URL;
}

/** Throws a `CreditChekError` with code `invalid_config` if the config can't open a widget. */
export function assertWidgetConfig(config: WidgetConfig): void {
  if (!config.publicKey || typeof config.publicKey !== "string") {
    throw new CreditChekError("invalid_config", "`publicKey` is required.");
  }
  if (config.modules && config.modules.length === 0) {
    throw new CreditChekError("invalid_config", "`modules` must list at least one step, or be left out.");
  }
  if (config.environment !== undefined && !ENVIRONMENTS.includes(config.environment)) {
    throw new CreditChekError("invalid_config", '`environment` must be "production" or "development".');
  }
  try {
    new URL(resolveWidgetUrl(config));
  } catch (cause) {
    throw new CreditChekError("invalid_config", "`widgetUrl` is not a valid URL.", { cause });
  }
}

/** Builds the full widget URL for a session. */
export function buildWidgetUrl(config: WidgetConfig, sessionId: string): string {
  assertWidgetConfig(config);
  if (!sessionId) {
    throw new CreditChekError("invalid_config", "`sessionId` is required.");
  }

  const url = new URL(resolveWidgetUrl(config));
  // URLSearchParams URL-encodes the public key, which can contain / + =
  const params = url.searchParams;
  params.set("publicKey", config.publicKey);
  params.set("sessionId", sessionId);
  params.set("module", (config.modules ?? ["identity"]).join(","));
  params.set("source", WIDGET_SOURCE);
  // Without it the widget picks live or sandbox from the key's type
  if (config.environment) params.set("environment", config.environment);

  // Lets the widget address its messages to this page only
  const hostOrigin = typeof window !== "undefined" ? window.location.origin : "";
  if (hostOrigin && hostOrigin !== "null") params.set("hostOrigin", hostOrigin);

  if (config.themeColor) params.set("themeColor", config.themeColor.replace(/^#/, ""));

  for (const key of PREFILL_KEYS) {
    const value = config.prefill?.[key]?.trim();
    if (value) params.set(key, value);
  }

  return url.toString();
}
