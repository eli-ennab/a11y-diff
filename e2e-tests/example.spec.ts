import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  findSeriousOrCriticalAccessibilityFindings,
  findSeriousOrCriticalViolations,
} from "./support/accessibility";
import { compareAccessibilityFindings } from "./support/accessibility-diff";
import { renderAccessibilityRegressionReport } from "./support/accessibility-report";

const baseUrl = process.env.BASE_URL;
const targetUrl = process.env.TEST_URL ?? "https://example.com";

test("target page has no serious or critical accessibility violations", async ({
  page,
  browserName,
}) => {
  if (baseUrl) {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const baseFindings = await findSeriousOrCriticalAccessibilityFindings(
      page,
      targetUrl,
    );

    await page.goto(targetUrl, { waitUntil: "networkidle" });
    const prFindings = await findSeriousOrCriticalAccessibilityFindings(
      page,
      targetUrl,
    );
    const diff = compareAccessibilityFindings(baseFindings, prFindings);

    // Every configured browser runs this test. Let Chromium create one report.
    if (browserName === "chromium") {
      const markdown = renderAccessibilityRegressionReport(diff, {
        baseUrl,
        prUrl: targetUrl,
      });

      mkdirSync("test-results", { recursive: true });
      writeFileSync("test-results/accessibility-report.md", markdown, "utf8");
    }

    expect(diff.introduced, JSON.stringify(diff.introduced, null, 2)).toEqual(
      [],
    );
    return;
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });

  const criticalViolations = await findSeriousOrCriticalViolations(page);

  // Every configured browser runs this test. Let Chromium create one report.
  if (browserName === "chromium") {
    const violationRows = criticalViolations.length
      ? criticalViolations.map(
          (violation) =>
            `| [${violation.id}](${violation.helpUrl}) | ${violation.impact} | ${violation.help.replaceAll("|", "\\|")} | ${violation.nodes.length} |`,
        )
      : ["| None | — | No serious or critical violations found | 0 |"];

    const markdown = [
      `## ${criticalViolations.length ? "❌" : "✅"} a11y diff`,
      "",
      `Tested: ${targetUrl}`,
      "",
      "| Axe rule | Impact | Description | Affected elements |",
      "| --- | --- | --- | ---: |",
      ...violationRows,
      "",
      `**${criticalViolations.length} serious or critical violations found.**`,
      "",
    ].join("\n");

    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/accessibility-report.md", markdown, "utf8");
  }

  expect(
    criticalViolations,
    JSON.stringify(criticalViolations, null, 2),
  ).toEqual([]);
});
