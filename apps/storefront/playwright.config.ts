import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests run against the already-running storefront + backend (the Docker
 * Compose stack). Override the targets with E2E_BASE_URL / E2E_BACKEND_URL if needed.
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:8000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
