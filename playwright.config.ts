import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3005";

/**
 * E2E config. Points at the local dev server on :3005 and forces English via
 * Accept-Language so text assertions are stable. If a dev server is already
 * running it is reused; otherwise Playwright starts `pnpm dev` (needs the DB and
 * a seeded demo account: `pnpm db:seed:demo`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL + "/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
