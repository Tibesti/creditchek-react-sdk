import { vi } from "vitest";

// Tests run against the real widget URLs, whatever local override is set for development.
// test/release.test.ts checks separately that the override is cleared before publishing.
vi.mock("../src/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/constants")>()),
  LOCAL_WIDGET_URL: "",
}));
