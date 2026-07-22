import { test, expect } from "@playwright/test";
import { loginAsDemo, cardWithText, expectAssetsLoaded } from "./helpers";

// The assets list runs over the demo portfolio (stocks, ETFs, crypto, cash,
// savings, a bond). These read-only checks cover the list itself plus the
// category-colored type chip and today/7d variation now shown on each card.

test("assets list renders holdings with colored type chips and variation", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets");
  await expectAssetsLoaded(page);

  // A known demo holding is on screen.
  const apple = cardWithText(page, "Apple Inc.");
  await expect(apple).toBeVisible();

  // Category-colored chip: the stock type uses the sky tint (bg/text-sky-*).
  await expect(apple.locator('[class*="sky"]').first()).toBeVisible();

  // Today/7d variation labels render on the card (values load async; the
  // labels are present regardless of the quote fetch).
  await expect(apple.getByText("Today", { exact: true })).toBeVisible();
  await expect(apple.getByText("7d", { exact: true })).toBeVisible();
});

test("category filter narrows the list to one asset type", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets");
  await expectAssetsLoaded(page);

  await expect(page.getByText("Apple Inc.")).toBeVisible();

  // Filter to crypto. Only the filter chips carry aria-pressed; the asset cards
  // are also role=button (their type badge reads "Crypto"), so scope by the
  // attribute to hit just the filter pill.
  await page.locator("button[aria-pressed]", { hasText: "Crypto" }).click();

  await expect(page.getByText("Bitcoin")).toBeVisible();
  await expect(page.getByText("Apple Inc.")).toBeHidden();
});

test("search filters the list by name", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets");
  await expectAssetsLoaded(page);

  await page.getByPlaceholder("Search assets...").fill("Apple");

  await expect(page.getByText("Apple Inc.")).toBeVisible();
  await expect(page.getByText("Bitcoin")).toBeHidden();
});
