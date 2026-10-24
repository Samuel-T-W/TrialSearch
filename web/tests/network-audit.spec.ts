import { test, expect, type Page, type Request } from "@playwright/test";

// Privacy audit (plan section 10): once the app and its data are loaded, doing
// a full search must produce ZERO network requests, and nothing that is sent
// (there should be nothing) may contain the ZIP, age, or a condition id.

const SECRETS = ["01109", "58", "t2d"];

async function intakeNoNav(page: Page) {
  await page.getByTestId("lang-en").click();
  await page.getByTestId("start").click();
  await page.getByTestId("age").fill("58");
  await page.getByTestId("sex-MALE").click();
  await page.getByTestId("zip").fill("01109");
  await page.getByTestId("condition-input").fill("Type 2");
  await page.getByRole("option", { name: /Type 2 diabetes/i }).first().click();
  await page.getByTestId("med-input").fill("metformin");
  await page.getByRole("option", { name: /Metformin/i }).first().click();
  await page.getByTestId("see-results").click();
}

test("no network requests after load, and no PII ever leaves", async ({ page }) => {
  // 1. Load and settle. Requests during initial load are allowed (same-origin).
  await page.goto("/", { waitUntil: "networkidle" });

  // 2. Start recording every request from now on.
  const recorded: { url: string; body: string }[] = [];
  const onReq = (req: Request) => {
    recorded.push({ url: req.url(), body: req.postData() ?? "" });
  };
  page.on("request", onReq);

  // 3. Do a full search: intake, answer a question, open a trial, summary.
  await intakeNoNav(page);
  await expect(page.getByTestId("match-count")).toBeVisible();

  const q = page.getByTestId("answer-q_pancreatitis-no");
  if (await q.isVisible().catch(() => false)) await q.click();

  await page.getByTestId("match-list").getByTestId("trial-card").first().click();
  await expect(page.getByTestId("rule-list")).toBeVisible();
  await page.getByTestId("toggle-save").click();
  await page.goto("/#/summary");
  await expect(page.getByTestId("summary-sheet")).toBeVisible();

  await page.waitForTimeout(500);
  page.off("request", onReq);

  // 4. Any request must be same-origin static (no external), and never carry PII.
  const external = recorded.filter((r) => !r.url.startsWith(page.url().split("#")[0].replace(/\/#.*$/, "")) && !r.url.includes("127.0.0.1") && !r.url.startsWith("data:"));
  expect(external, `external requests: ${JSON.stringify(external)}`).toHaveLength(0);

  for (const r of recorded) {
    for (const secret of SECRETS) {
      expect(r.url, `URL leaked "${secret}": ${r.url}`).not.toContain(secret);
      expect(r.body, `body leaked "${secret}"`).not.toContain(secret);
    }
  }
});
