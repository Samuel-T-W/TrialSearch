import { test, expect, type Page } from "@playwright/test";

// Offline mode (plan section 10): after the first load the service worker has
// precached the app and the data bundles, so a full search works with the
// network off. Skipped automatically if the service worker is not controlling
// the page (e.g. dev server).

async function search(page: Page) {
  await page.getByTestId("lang-en").click();
  await page.getByTestId("start").click();
  await page.getByTestId("age").fill("58");
  await page.getByTestId("sex-MALE").click();
  await page.getByTestId("zip").fill("01109");
  await page.getByTestId("condition-input").fill("Type 2");
  await page.getByRole("option", { name: /Type 2 diabetes/i }).first().click();
  await page.getByTestId("see-results").click();
}

test("works offline after first load", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "load" });

  // Wait for the service worker to activate and control the page.
  const controlled = await page
    .waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!controlled, "No active service worker controlling the page.");

  // Prime the data caches by running once online.
  await search(page);
  await expect(page.getByTestId("match-count")).toBeVisible();

  // Go offline and reload; a full search must still work.
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await search(page);
  await expect(page.getByTestId("match-count")).toBeVisible();
  await expect(page.getByTestId("trial-card").first()).toBeVisible();

  await context.setOffline(false);
});
