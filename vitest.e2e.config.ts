import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/node_modules/**'],
    testTimeout: 30000, // E2E tests might take longer
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Allow sequential execution for e2e tests to avoid port conflicts
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@agentic-knowledge/core': './packages/@agentic-knowledge/core/src/index.ts',
      '@agentic-knowledge/mcp-server': './packages/@agentic-knowledge/mcp-server/src/index.ts'
    }
  }
});