import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // E2E tests are intentionally not run in parallel — each spins up its own browser
  workers: 1,
  use: {
    trace: "on-first-retry",
  },
});
