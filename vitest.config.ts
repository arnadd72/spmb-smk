import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom", // test server memakai "// @vitest-environment node"
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup-env.ts", "./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", "_archive/**"],
    // Test database berbagi satu Postgres: jalankan berkas satu per satu.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
