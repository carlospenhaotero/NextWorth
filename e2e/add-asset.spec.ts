import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers";

// The add-asset flow: a static catalog of popular assets (client-side filtered)
// plus a remote Yahoo search. The catalog test is fully deterministic; the
// search test exercises the live search endpoint with a generous timeout.

test("catalog shows popular assets and the category filter narrows it", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/add-asset");

  await expect(page.getByText("Popular assets")).toBeVisible();
  // "All" shows a stock and a crypto from the catalog.
  await expect(page.getByText("Apple Inc.")).toBeVisible();
  await expect(page.getByText("Bitcoin")).toBeVisible();

  // Filtering to Crypto drops the stocks, keeps crypto.
  await page.getByRole("button", { name: "Crypto" }).click();
  await expect(page.getByText("Bitcoin")).toBeVisible();
  await expect(page.getByText("Apple Inc.")).toBeHidden();
});

test("remote search returns matching results", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/add-asset");

  await page
    .getByPlaceholder("Search any stock, ETF, fund (name or ISIN), crypto...")
    .fill("Apple");

  // The results header confirms the live search resolved.
  await expect(page.getByText(/Found \d+ for/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Apple Inc.").first()).toBeVisible();
});
