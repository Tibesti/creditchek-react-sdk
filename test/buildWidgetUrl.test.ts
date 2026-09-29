import { describe, expect, it } from "vitest";
import { buildWidgetUrl, CreditChekError } from "../src";

const PUBLIC_KEY = "vy6LZWI/l/pOc868+z8LAg==";

describe("buildWidgetUrl", () => {
  it("builds the production URL with defaults", () => {
    const url = new URL(buildWidgetUrl({ publicKey: PUBLIC_KEY }, "session-1"));
    expect(url.origin).toBe("https://securedwidget.creditchek.africa");
    expect(url.searchParams.get("publicKey")).toBe(PUBLIC_KEY);
    expect(url.searchParams.get("sessionId")).toBe("session-1");
    expect(url.searchParams.get("module")).toBe("identity");
    expect(url.searchParams.get("source")).toBe("react");
    expect(url.searchParams.get("hostOrigin")).toBe(window.location.origin);
  });

  it("URL-encodes the public key", () => {
    const raw = buildWidgetUrl({ publicKey: PUBLIC_KEY }, "s");
    expect(raw).toContain("publicKey=vy6LZWI%2Fl%2FpOc868%2Bz8LAg%3D%3D");
  });

  it("uses the development widget and optional params", () => {
    const url = new URL(
      buildWidgetUrl(
        {
          publicKey: PUBLIC_KEY,
          environment: "development",
          modules: ["identity", "liveness"],
          themeColor: "#0046E6",
          prefill: { firstName: " Ada ", lastName: "", dob: "1990-01-31", nin: "12345678901" },
        },
        "s",
      ),
    );
    expect(url.origin).toBe("https://development--securedwidget.netlify.app");
    expect(url.searchParams.get("module")).toBe("identity,liveness");
    expect(url.searchParams.get("themeColor")).toBe("0046E6");
    expect(url.searchParams.get("firstName")).toBe("Ada");
    expect(url.searchParams.has("lastName")).toBe(false);
    expect(url.searchParams.get("dob")).toBe("1990-01-31");
    expect(url.searchParams.get("nin")).toBe("12345678901");
  });

  it("ignores options the SDK does not support", () => {
    const config = {
      publicKey: PUBLIC_KEY,
      prefill: { firstName: "Ada", phone: "0800" },
      widgetId: "w-1",
      incomeForm: "long",
    } as never;
    const url = new URL(buildWidgetUrl(config, "s"));
    expect(url.searchParams.has("phone")).toBe(false);
    expect(url.searchParams.has("widgetId")).toBe(false);
    expect(url.searchParams.has("incomeForm")).toBe(false);
  });

  it("honours a custom widgetUrl", () => {
    const url = new URL(buildWidgetUrl({ publicKey: PUBLIC_KEY, widgetUrl: "http://localhost:5173/" }, "s"));
    expect(url.origin).toBe("http://localhost:5173");
  });

  it.each([
    [{ publicKey: "" }, "s"],
    [{ publicKey: PUBLIC_KEY }, ""],
    [{ publicKey: PUBLIC_KEY, modules: [] }, "s"],
    [{ publicKey: PUBLIC_KEY, widgetUrl: "not a url" }, "s"],
  ])("rejects invalid config %#", (config, sessionId) => {
    expect(() => buildWidgetUrl(config, sessionId)).toThrow(CreditChekError);
  });
});
