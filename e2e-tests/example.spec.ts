import { appendFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const targetUrl = process.env.TEST_URL ?? "https://example.com";

test("the report has no failing Perceivable guidelines", async ({
  page,
  browserName,
}) => {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveTitle(/Inaccessible Home Page Report/i);

  const perceivableTable = page
    .getByRole("table", {
      name: /Conformance of Home Page to WCAG 2\.0 - Perceivable/i,
    })
    .first();
  await expect(perceivableTable).toBeVisible();

  const guidelineResults = await perceivableTable
    .locator("tr")
    .evaluateAll((rows) =>
      rows.flatMap((row) => {
        const cells = Array.from(
          row.querySelectorAll(":scope > th, :scope > td"),
        );
        const number = cells[0]?.textContent?.trim();
        const title = cells[1]?.textContent?.trim();
        const result = cells[3]
          ?.querySelector("img")
          ?.getAttribute("alt")
          ?.trim();

        return number && /^1\.\d$/.test(number) && title && result
          ? [{ number, title, result }]
          : [];
      }),
    );

  const failingGuidelines = guidelineResults
    .filter(({ result }) =>
      result.toLowerCase().includes("some success criteria failed"),
    )
    .map(({ number, title }) => `${number} ${title}`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  // Each browser runs this test, so only Chromium writes the shared PR summary.
  if (summaryPath && browserName === "chromium") {
    const passed = failingGuidelines.length === 0;
    const resultRows = failingGuidelines.length
      ? failingGuidelines.map((guideline) => `| ${guideline} | ❌ Failed |`)
      : ["| None | ✅ Passed |"];

    const markdown = [
      `## ${passed ? "✅" : "❌"} Perceivable accessibility check`,
      "",
      `Tested: ${targetUrl}`,
      "",
      "| Guideline | Result |",
      "| --- | --- |",
      ...resultRows,
      "",
      `**${failingGuidelines.length} Perceivable guidelines failed.**`,
      "",
    ].join("\n");

    appendFileSync(summaryPath, markdown, "utf8");
  }

  expect(
    failingGuidelines,
    `Expected no failing Perceivable guidelines, but found ${failingGuidelines.length}`,
  ).toEqual([]);
});
