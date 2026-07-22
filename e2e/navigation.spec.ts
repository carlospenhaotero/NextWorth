import { test, expect } from "@playwright/test";
import { loginAsDemo, cardWithText, expectAssetsLoaded } from "./helpers";

// Cross-page navigation over the demo account: list -> detail, plus the advisor
// and settings pages render for a populated portfolio.

test("clicking an asset card opens its detail page", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets");
  await expectAssetsLoaded(page);

  await cardWithText(page, "Apple Inc.").click();

  await page.waitForURL("**/assets/AAPL", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "AI Predictions" })).toBeVisible({
    timeout: 30_000,
  });
});

test("advisor page renders the allocation breakdown", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/advisor");

  await expect(page.getByText("By asset type")).toBeVisible({ timeout: 30_000 });
});

test("settings page renders", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});
