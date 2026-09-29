import { describe, expect, it, vi } from "vitest";

describe("release guard", () => {
  it("does not ship with a local widget override", async () => {
    const constants = await vi.importActual<typeof import("../src/constants")>("../src/constants");
    expect(
      constants.LOCAL_WIDGET_URL,
      "LOCAL_WIDGET_URL in src/constants.ts must be an empty string before publishing",
    ).toBe("");
  });
});
