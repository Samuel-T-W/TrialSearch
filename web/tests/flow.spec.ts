import { test, expect, type Page } from "@playwright/test";

// Full intake -> results -> narrow -> trial flow, at a 375px phone viewport.
// Fixture data: NCT09900001 (weekly shot, T2D) and NCT09900002 (lifestyle)
// match a 58yo male in Springfield with T2D on metformin. NCT07589608 is a
// T1D trial that EXCLUDES T2D, so it belongs under "Not a fit".

async function doIntake(page: Page) {
  await page.goto("/");
  await page.getByTestId("lang-es").click();
  await page.getByTestId("start").click();

  await page.getByTestId("age").fill("58");
  await page.getByTestId("sex-MALE").click();
  await page.getByTestId("zip").fill("01109");

  // distance slider -> 25 miles
  const slider = page.getByTestId("distance");
  await slider.evaluate((el: HTMLInputElement) => {
    el.value = "25";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // condition: Type 2 diabetes
  await page.getByTestId("condition-input").fill("Type 2");
  await page.getByRole("option", { name: /Type 2 diabetes/i }).first().click();

  // medication: metformin
  await page.getByTestId("med-input").fill("metformin");
  await page.getByRole("option", { name: /Metformin/i }).first().click();

  await page.getByTestId("see-results").click();
}

test("intake to results in Spanish, 25 miles", async ({ page }) => {
  await expect(page.viewportSize()?.width).toBe(375);
  await doIntake(page);

  await expect(page.getByTestId("match-count")).toBeVisible();
  const cards = page.getByTestId("trial-card");
  await expect(cards.first()).toBeVisible();
  const countBefore = await cards.count();
  expect(countBefore).toBeGreaterThan(0);

  // Spanish UI string is present (not the English key).
  await expect(page.getByTestId("match-count")).toContainText(/estudio/i);
});

test("answering a narrowing question changes the counts", async ({ page }) => {
  await doIntake(page);

  const matchList = page.getByTestId("match-list").getByTestId("trial-card");
  const before = await matchList.count();

  // Answer the pancreatitis question "Yes" -> excludes the weekly-shot trial.
  const yesBtn = page.getByTestId("answer-q_pancreatitis-yes");
  await expect(yesBtn).toBeVisible();
  await yesBtn.click();

  await expect
    .poll(async () => page.getByTestId("match-list").getByTestId("trial-card").count())
    .toBeLessThan(before);
});

test("opening a trial shows met / not-met / unknown rules", async ({ page }) => {
  await doIntake(page);
  await page.getByTestId("match-list").getByTestId("trial-card").first().click();

  await expect(page.getByTestId("rule-list")).toBeVisible();
  // The weekly-shot trial has at least one met, and unknown (clinician) rules.
  await expect(page.getByTestId("rule-met").first()).toBeVisible();
  await expect(page.getByTestId("rule-unknown").first()).toBeVisible();
});

test("at 100 miles the T1D trial is under Not a fit (excludes T2D)", async ({ page }) => {
  await doIntake(page);

  // widen the distance so the T1D trial's Boston/Springfield sites are in range
  await page.getByText(/← /).first().click(); // back to intake
  const slider = page.getByTestId("distance");
  await slider.evaluate((el: HTMLInputElement) => {
    el.value = "100";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByTestId("see-results").click();

  await page.getByTestId("not-a-fit-toggle").click();
  const hidden = page.getByTestId("not-a-fit-card").filter({ has: page.locator("[data-nct='NCT07589608']") });
  // the card carries data-nct; assert it is present in the not-a-fit list
  await expect(page.locator("[data-testid='not-a-fit-card'][data-nct='NCT07589608']")).toBeVisible();
  void hidden;
});
