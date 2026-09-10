import { describe, expect, it } from "vitest";
import {
  compareAccessibilityFindings,
  type AccessibilityFinding,
  type FindingIdentity,
} from "../e2e-tests/support/accessibility-diff";

function finding(
  ruleId: string,
  identity: FindingIdentity,
  page = "/checkout",
): AccessibilityFinding {
  return {
    page,
    ruleId,
    impact: "serious",
    help: `Help for ${ruleId}`,
    helpUrl: `https://example.com/rules/${ruleId}`,
    identity,
  };
}

describe("compareAccessibilityFindings", () => {
  it("classifies introduced, fixed, and unchanged findings", () => {
    const unchangedBase = finding("button-name", {
      kind: "explicit",
      value: "submit-order",
    });
    const unchangedPr = { ...unchangedBase, help: "Updated help text" };
    const fixed = finding("label", {
      kind: "semantic",
      value: "input|email|Email address",
    });
    const introduced = finding("image-alt", {
      kind: "semantic",
      value: "img|Product photo",
    });

    const result = compareAccessibilityFindings(
      [unchangedBase, fixed],
      [introduced, unchangedPr],
    );

    expect(result.introduced).toEqual([introduced]);
    expect(result.fixed).toEqual([fixed]);
    expect(result.unchanged).toEqual([
      { base: unchangedBase, pr: unchangedPr },
    ]);
  });

  it("does not depend on finding order", () => {
    const first = finding("button-name", {
      kind: "explicit",
      value: "save",
    });
    const second = finding("label", {
      kind: "explicit",
      value: "email",
    });

    const result = compareAccessibilityFindings(
      [first, second],
      [second, first],
    );

    expect(result.introduced).toEqual([]);
    expect(result.fixed).toEqual([]);
    expect(result.unchanged).toHaveLength(2);
  });

  it("compares duplicate identities as a multiset", () => {
    const duplicate = finding("link-name", {
      kind: "semantic",
      value: "a|Read more",
    });

    const result = compareAccessibilityFindings(
      [duplicate, duplicate],
      [duplicate],
    );

    expect(result.unchanged).toHaveLength(1);
    expect(result.fixed).toEqual([duplicate]);
    expect(result.introduced).toEqual([]);
  });

  it("keeps paired uncertain identities out of automatic classification", () => {
    const uncertainBase = finding("color-contrast", {
      kind: "uncertain",
      value: "text element",
    });
    const uncertainPr = finding("color-contrast", {
      kind: "uncertain",
      value: "another text element",
    });

    const result = compareAccessibilityFindings(
      [uncertainBase],
      [uncertainPr],
    );

    expect(result.introduced).toEqual([]);
    expect(result.fixed).toEqual([]);
    expect(result.unchanged).toEqual([]);
    expect(result.uncertain).toEqual({
      base: [uncertainBase],
      pr: [uncertainPr],
    });
  });

  it("classifies an unmatched uncertain base finding as fixed", () => {
    const fixed = finding("image-alt", {
      kind: "uncertain",
      value: "img without stable identity",
    });

    const result = compareAccessibilityFindings([fixed], []);

    expect(result.fixed).toEqual([fixed]);
    expect(result.uncertain).toEqual({ base: [], pr: [] });
  });

  it("classifies an unmatched uncertain PR finding as introduced", () => {
    const introduced = finding("image-alt", {
      kind: "uncertain",
      value: "img without stable identity",
    });

    const result = compareAccessibilityFindings([], [introduced]);

    expect(result.introduced).toEqual([introduced]);
    expect(result.uncertain).toEqual({ base: [], pr: [] });
  });
});
