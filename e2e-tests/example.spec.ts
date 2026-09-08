import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const targetUrl = process.env.TEST_URL ?? "https://example.com";

test("target page has no serious or critical accessibility violations", async ({
  page,
}) => {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveTitle(/.+/);

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    criticalViolations,
    JSON.stringify(criticalViolations, null, 2),
  ).toEqual([]);
});
