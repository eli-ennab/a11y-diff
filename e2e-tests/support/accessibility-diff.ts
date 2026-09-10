export type AccessibilityImpact = "serious" | "critical";

export type FindingIdentity =
  | {
      kind: "explicit";
      value: string;
    }
  | {
      kind: "semantic";
      value: string;
    }
  | {
      kind: "uncertain";
      value: string;
    };

export interface AccessibilityFinding {
  page: string;
  ruleId: string;
  impact: AccessibilityImpact;
  help: string;
  helpUrl: string;
  identity: FindingIdentity;
}

export interface MatchedAccessibilityFinding {
  base: AccessibilityFinding;
  pr: AccessibilityFinding;
}

export interface AccessibilityDiff {
  introduced: AccessibilityFinding[];
  fixed: AccessibilityFinding[];
  unchanged: MatchedAccessibilityFinding[];
  uncertain: {
    base: AccessibilityFinding[];
    pr: AccessibilityFinding[];
  };
}

function comparisonKey(finding: AccessibilityFinding) {
  return JSON.stringify([
    finding.page,
    finding.ruleId,
    finding.identity.kind,
    finding.identity.value,
  ]);
}

function ambiguityKey(finding: AccessibilityFinding) {
  return JSON.stringify([finding.page, finding.ruleId]);
}

/**
 * Compares already-normalized findings without using CSS classes, Axe target
 * selectors, or DOM positions. Findings with an uncertain identity are kept
 * out of the automatic introduced/fixed classification.
 */
export function compareAccessibilityFindings(
  baseFindings: readonly AccessibilityFinding[],
  prFindings: readonly AccessibilityFinding[],
): AccessibilityDiff {
  const introduced: AccessibilityFinding[] = [];
  const unchanged: MatchedAccessibilityFinding[] = [];
  const uncertainBase: AccessibilityFinding[] = [];
  const uncertainPr: AccessibilityFinding[] = [];
  const matchedBaseIndexes = new Set<number>();
  const matchedPrIndexes = new Set<number>();
  const baseIndexesByKey = new Map<string, number[]>();

  baseFindings.forEach((finding, index) => {
    if (finding.identity.kind !== "uncertain") {
      const key = comparisonKey(finding);
      const indexes = baseIndexesByKey.get(key) ?? [];
      indexes.push(index);
      baseIndexesByKey.set(key, indexes);
    }
  });

  prFindings.forEach((prFinding, prIndex) => {
    if (prFinding.identity.kind === "uncertain") {
      return;
    }

    const matchingBaseIndexes = baseIndexesByKey.get(
      comparisonKey(prFinding),
    );
    const baseIndex = matchingBaseIndexes?.shift();

    if (baseIndex === undefined) {
      return;
    }

    matchedBaseIndexes.add(baseIndex);
    matchedPrIndexes.add(prIndex);
    unchanged.push({ base: baseFindings[baseIndex], pr: prFinding });
  });

  const unmatchedBaseIndexesByRule = new Map<string, number[]>();

  baseFindings.forEach((finding, index) => {
    if (!matchedBaseIndexes.has(index)) {
      const key = ambiguityKey(finding);
      const indexes = unmatchedBaseIndexesByRule.get(key) ?? [];
      indexes.push(index);
      unmatchedBaseIndexesByRule.set(key, indexes);
    }
  });

  prFindings.forEach((prFinding, prIndex) => {
    if (matchedPrIndexes.has(prIndex)) {
      return;
    }

    const matchingBaseIndexes = unmatchedBaseIndexesByRule.get(
      ambiguityKey(prFinding),
    );
    const baseIndex = matchingBaseIndexes?.shift();

    if (baseIndex === undefined) {
      introduced.push(prFinding);
      return;
    }

    matchedBaseIndexes.add(baseIndex);
    uncertainBase.push(baseFindings[baseIndex]);
    uncertainPr.push(prFinding);
  });

  const fixed = baseFindings.filter(
    (_finding, index) => !matchedBaseIndexes.has(index),
  );

  return {
    introduced,
    fixed,
    unchanged,
    uncertain: {
      base: uncertainBase,
      pr: uncertainPr,
    },
  };
}
