import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers";

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

  // The prediction is on by default (roadmap point 15): the AI Predictions pill
  // is present and pressed, and the Chronos source line shows, with no interaction.
  const toggle = page.getByRole("button", { name: "AI Predictions" });
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Forecasts generated with Amazon Chronos")
  ).toBeVisible({ timeout: 30_000 });
});

test("asset detail draws the p10-p90 confidence band", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/assets/AAPL");

  // The band legend and the dashed p10/p90 edge labels only render when the
  // forecast carries confidence_low/high, i.e. the full ML -> DB -> chart chain works.
  // These three only render when the forecast carries confidence_low/high, i.e.
  // when the whole ML -> DB -> chart chain produced the band: the legend, plus the
  // dashed p10/p90 edge labels drawn at the last forecast point.
  await expect(page.getByText(/confidence band \(p10-p90\)/i)).toBeVisible({ timeout: 30_000 });
  const surface = page.locator(".recharts-surface");
  await expect(surface.getByText("p90", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(surface.getByText("p10", { exact: true })).toBeVisible();
});
