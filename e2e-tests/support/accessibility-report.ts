import type {
  AccessibilityDiff,
  AccessibilityFinding,
} from "./accessibility-diff";

export interface AccessibilityReportOptions {
  baseUrl: string;
  prUrl: string;
  manualChecks?: readonly string[];
}

export const defaultManualAccessibilityChecks = [
  "Complete all interactions using only a keyboard.",
  "Verify focus order, focus visibility, and focus restoration.",
  "Check names, roles, states, and announcements with a screen reader.",
  "Verify content at 200% zoom and with narrow-screen reflow.",
  "Check touch target behavior and mobile interaction where applicable.",
] as const;

function escapeMarkdown(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, " ");
}

interface FindingGroup {
  finding: AccessibilityFinding;
  count: number;
}

function groupFindings(findings: readonly AccessibilityFinding[]) {
  const groups = new Map<string, FindingGroup>();

  for (const finding of findings) {
    const key = JSON.stringify([
      finding.ruleId,
      finding.impact,
      finding.page,
      finding.help,
    ]);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.count += 1;
    } else {
      groups.set(key, { finding, count: 1 });
    }
  }

  return [...groups.values()];
}

function findingRows(findings: readonly AccessibilityFinding[]) {
  if (findings.length === 0) {
    return ["None."];
  }

  return [
    "| Axe rule | Impact | Page | Description | Affected elements |",
    "| --- | --- | --- | --- | ---: |",
    ...groupFindings(findings).map(
      ({ finding, count }) =>
        `| ${escapeMarkdown(finding.ruleId)} | ${finding.impact} | ${escapeMarkdown(finding.page)} | ${escapeMarkdown(finding.help)} | ${count} |`,
    ),
  ];
}

function uncertainFindingRows(diff: AccessibilityDiff) {
  const findings = [
    ...diff.uncertain.base.map((finding) => ({ source: "Base", finding })),
    ...diff.uncertain.pr.map((finding) => ({ source: "PR", finding })),
  ];

  if (findings.length === 0) {
    return ["None."];
  }

  const groups = new Map<
    string,
    { source: string; finding: AccessibilityFinding; count: number }
  >();

  for (const { source, finding } of findings) {
    const key = JSON.stringify([
      source,
      finding.ruleId,
      finding.impact,
      finding.page,
      finding.help,
    ]);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.count += 1;
    } else {
      groups.set(key, { source, finding, count: 1 });
    }
  }

  return [
    "| Source | Axe rule | Impact | Page | Description | Affected elements |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...[...groups.values()].map(
      ({ source, finding, count }) =>
        `| ${source} | ${escapeMarkdown(finding.ruleId)} | ${finding.impact} | ${escapeMarkdown(finding.page)} | ${escapeMarkdown(finding.help)} | ${count} |`,
    ),
  ];
}

export function renderAccessibilityRegressionReport(
  diff: AccessibilityDiff,
  options: AccessibilityReportOptions,
) {
  const unchangedFindings = diff.unchanged.map(({ pr }) => pr);
  const uncertainCount = Math.max(
    diff.uncertain.base.length,
    diff.uncertain.pr.length,
  );
  const manualChecks =
    options.manualChecks ?? defaultManualAccessibilityChecks;
  const hasRegressions = diff.introduced.length > 0;

  return [
    "## Accessibility regression check",
    "",
    `**${hasRegressions ? "FAIL" : "PASS"}: ${diff.introduced.length} serious or critical finding${diff.introduced.length === 1 ? "" : "s"} introduced.**`,
    "",
    `Base: ${escapeMarkdown(options.baseUrl)}`,
    `PR: ${escapeMarkdown(options.prUrl)}`,
    "",
    "| Result | Count |",
    "| --- | ---: |",
    `| Introduced | ${diff.introduced.length} |`,
    `| Fixed | ${diff.fixed.length} |`,
    `| Unchanged | ${diff.unchanged.length} |`,
    `| Requires review | ${uncertainCount} |`,
    "",
    "Counts represent affected elements.",
    "",
    "### Introduced by this PR",
    "",
    ...findingRows(diff.introduced),
    "",
    "### Fixed by this PR",
    "",
    ...findingRows(diff.fixed),
    "",
    "### Existing and unchanged",
    "",
    ...findingRows(unchangedFindings),
    "",
    "### Findings requiring review",
    "",
    "These findings could not be matched confidently and do not automatically fail the regression check.",
    "",
    ...uncertainFindingRows(diff),
    "",
    "### Manual accessibility testing still required",
    "",
    "Automated checks cannot establish complete accessibility. Manually verify:",
    "",
    ...manualChecks.map((check) => `- [ ] ${escapeMarkdown(check)}`),
    "",
  ].join("\n");
}
