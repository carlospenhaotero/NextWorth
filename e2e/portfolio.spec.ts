import { test, expect, type Page } from "@playwright/test";

// Public demo account (prisma/seed-demo.ts). Read-only sample data.
const DEMO_EMAIL = "demo-e2e@nextworth.app";
const DEMO_PASSWORD = "NextWorth2026!";

async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(DEMO_EMAIL);
  await page.locator("#password").fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/overview", { timeout: 30_000 });
}

test("demo login lands on the overview with the fixed KPIs", async ({ page }) => {
  await loginAsDemo(page);
  // Scope to the KPI cards: the same words can also appear in a chart tooltip.
  await expect(page.locator(".glass-card", { hasText: "Invested" }).first()).toBeVisible();
  await expect(page.locator(".glass-card", { hasText: "Today" }).first()).toBeVisible();
  await expect(page.locator(".glass-card", { hasText: "Last 30 days" }).first()).toBeVisible();
});

test("asset detail shows the AI prediction, active by default", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets/AAPL");

  // The prediction is on by default (roadmap point 15): the toggle to hide it and
  // the Chronos source line are present without any extra interaction.
  await expect(page.getByText("Hide prediction")).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText("Forecasts generated with Amazon Chronos")
  ).toBeVisible({ timeout: 30_000 });
});
