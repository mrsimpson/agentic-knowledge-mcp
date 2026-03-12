import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    exports: "src/exports.ts",
  },
  format: ["esm"],
  dts: false,
  clean: true,
  bundle: true,
  // External: CommonJS packages that use Node.js built-ins via require()
  // These must be in the ROOT package.json dependencies (CLI sub-package is private)
  // - commander: uses require('events'), require('child_process'), etc.
  // - adm-zip: CommonJS with complex require() patterns
  // - @modelcontextprotocol/sdk: shared MCP protocol dependency
  external: ["commander", "@modelcontextprotocol/sdk", "adm-zip"],
  // Bundle everything else (pure ESM packages + internal)
  noExternal: [
    "@codemcp/knowledge-core",
    "@codemcp/knowledge-content-loader",
    "@codemcp/knowledge-server",
    "chalk",
    "ora",
  ],
  target: "node20",
  sourcemap: false,
});
