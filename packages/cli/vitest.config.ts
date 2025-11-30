import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@codemcp/knowledge-core": resolve(__dirname, "../core/src/index.ts"),
      "@codemcp/knowledge-content-loader": resolve(
        __dirname,
        "../content-loader/src/index.ts",
      ),
      "@codemcp/knowledge": resolve(__dirname, "../mcp-server/src/index.ts"),
    },
  },
});
