import { describe, expect, it } from "vitest";
import {
  createFindingIdentity,
  normalizeAccessibilityFinding,
  normalizePageIdentity,
} from "../e2e-tests/support/accessibility-normalize";

describe("normalizePageIdentity", () => {
  it("uses the route instead of deployment-specific origins or query strings", () => {
    expect(
      normalizePageIdentity(
        "https://base.example.com/checkout?build=base#payment",
      ),
    ).toBe("/checkout");
    expect(
      normalizePageIdentity(
        "https://pr-42.example.com/checkout?build=pr#payment",
      ),
    ).toBe("/checkout");
  });
});

describe("createFindingIdentity", () => {
  it("prefers an explicit accessibility ID", () => {
    expect(
      createFindingIdentity({
        tagName: "BUTTON",
        a11yId: " Submit-Order ",
        accessibleName: "Place order",
      }),
    ).toEqual({
      kind: "explicit",
      value: "submit-order",
    });
  });

  it("creates the same semantic identity when unstable selector data changes", () => {
    const baseIdentity = createFindingIdentity({
      tagName: "A",
      role: "link",
      accessibleName: "View basket",
      attributes: { href: "https://base.example.com/basket?build=base" },
      className: "link_base_a81f",
      generatedSelector: ".link_base_a81f:nth-child(2)",
      domPosition: "main/section[1]/a[2]",
    });
    const prIdentity = createFindingIdentity({
      tagName: "a",
      role: "LINK",
      accessibleName: "  View   Basket ",
      attributes: { href: "https://pr-42.example.com/basket?build=pr" },
      className: "link_pr_f913",
      generatedSelector: ".link_pr_f913:nth-child(5)",
      domPosition: "main/section[3]/a[1]",
    });

    expect(baseIdentity).toEqual(prIdentity);
    expect(baseIdentity.kind).toBe("semantic");
  });

  it("marks elements without distinctive semantic evidence as uncertain", () => {
    expect(
      createFindingIdentity({
        tagName: "button",
        role: "button",
        className: "generated_123",
        generatedSelector: ".generated_123:nth-child(1)",
        domPosition: "main/div[2]/button[1]",
      }).kind,
    ).toBe("uncertain");
  });
});

describe("normalizeAccessibilityFinding", () => {
  it("creates a normalized finding ready for comparison", () => {
    expect(
      normalizeAccessibilityFinding({
        pageUrl: "https://pr.example.com/account?preview=42",
        ruleId: "label",
        impact: "critical",
        help: "Form elements must have labels",
        helpUrl: "https://example.com/rules/label",
        element: {
          tagName: "input",
          attributes: { name: " Email ", type: "EMAIL" },
        },
      }),
    ).toEqual({
      page: "/account",
      ruleId: "label",
      impact: "critical",
      help: "Form elements must have labels",
      helpUrl: "https://example.com/rules/label",
      identity: {
        kind: "semantic",
        value: JSON.stringify({
          tag: "input",
          accessibleName: undefined,
          landmark: undefined,
          name: "email",
          type: "email",
        }),
      },
    });
  });
});
