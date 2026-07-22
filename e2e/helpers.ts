import { expect, type Page } from "@playwright/test";

// Public demo account (prisma/seed-demo.ts). Read-only sample data: the whole
// e2e suite only navigates and reads, never mutates this shared account.
export const DEMO_EMAIL = "demo-e2e@nextworth.app";
export const DEMO_PASSWORD = "NextWorth2026!";

/** Logs in with the demo account and waits for the overview to load. */
export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(DEMO_EMAIL);
  await page.locator("#password").fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/overview", { timeout: 30_000 });
}

/** The `.glass-card` that contains the given text (e.g. an asset name). */
export function cardWithText(page: Page, text: string) {
  return page.locator(".glass-card", { hasText: text }).first();
}

/** Asserts the asset list is on screen (KPI stat cards are rendered). */
export async function expectAssetsLoaded(page: Page) {
  await expect(page.getByText("Total Assets")).toBeVisible({ timeout: 30_000 });
}
