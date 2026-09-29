import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2019",
  external: ["react"],
  // Marks the package as a client module so it works in the Next.js App Router
  banner: { js: '"use client";' },
});
