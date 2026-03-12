import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    bin: "src/bin.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: false,
  clean: true,
  bundle: true,
  external: ["@modelcontextprotocol/sdk", "adm-zip"],
  noExternal: ["@codemcp/knowledge-core", "@codemcp/knowledge-content-loader"],
  target: "node20",
  sourcemap: false,
});
