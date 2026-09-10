import { describe, expect, it } from "vitest";
import type {
  AccessibilityDiff,
  AccessibilityFinding,
} from "../e2e-tests/support/accessibility-diff";
import { renderAccessibilityRegressionReport } from "../e2e-tests/support/accessibility-report";

function finding(
  ruleId: string,
  help = `Help for ${ruleId}`,
): AccessibilityFinding {
  return {
    page: "/checkout",
    ruleId,
    impact: "serious",
    help,
    helpUrl: `https://example.com/rules/${ruleId}`,
    identity: { kind: "explicit", value: ruleId },
  };
}

function emptyDiff(): AccessibilityDiff {
  return {
    introduced: [],
    fixed: [],
    unchanged: [],
    uncertain: { base: [], pr: [] },
  };
}

describe("renderAccessibilityRegressionReport", () => {
  it("reports every comparison category and the manual checklist", () => {
    const introduced = finding("button-name");
    const fixed = finding("label");
    const existingBase = finding("image-alt");
    const existingPr = { ...existingBase };
    const uncertain = finding("color-contrast");
    const report = renderAccessibilityRegressionReport(
      {
        introduced: [introduced],
        fixed: [fixed, { ...fixed }],
        unchanged: [{ base: existingBase, pr: existingPr }],
        uncertain: { base: [], pr: [uncertain] },
      },
      {
        baseUrl: "https://base.example.com",
        prUrl: "https://pr.example.com",
        manualChecks: ["Test keyboard interaction."],
      },
    );

    expect(report).toContain("**FAIL: 1 serious or critical finding introduced.**");
    expect(report).toContain("| Introduced | 1 |");
    expect(report).toContain("| Fixed | 2 |");
    expect(report).toContain("| Unchanged | 1 |");
    expect(report).toContain("| Requires review | 1 |");
    expect(report).toContain(
      "| label | serious | /checkout | Help for label | 2 |",
    );
    expect(report).toContain(
      "| PR | color-contrast | serious | /checkout | Help for color-contrast | 1 |",
    );
    expect(report).toContain("Counts represent affected elements.");
    expect(report).toContain("- [ ] Test keyboard interaction.");
  });

  it("passes without introduced findings and escapes Markdown table content", () => {
    const diff = emptyDiff();
    diff.fixed.push(finding("label", "Labels must be clear | descriptive\ntext"));

    const report = renderAccessibilityRegressionReport(diff, {
      baseUrl: "https://base.example.com",
      prUrl: "https://pr.example.com",
    });

    expect(report).toContain("**PASS: 0 serious or critical findings introduced.**");
    expect(report).toContain("Labels must be clear \\| descriptive text");
  });
});
