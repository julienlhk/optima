import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  // Inline workspace packages so npm consumers don't need @optima/* installed
  noExternal: [
    "@optima/core",
    "@optima/classify",
    "@optima/compress",
    "@optima/cache",
    "@optima/analyze",
  ],
});
