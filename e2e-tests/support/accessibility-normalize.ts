import type {
  AccessibilityFinding,
  AccessibilityImpact,
  FindingIdentity,
} from "./accessibility-diff";

export interface ElementIdentityInput {
  tagName: string;
  a11yId?: string | null;
  role?: string | null;
  accessibleName?: string | null;
  landmark?: string | null;
  attributes?: Readonly<Record<string, string | null | undefined>>;
  className?: string | null;
  generatedSelector?: string | null;
  domPosition?: string | null;
}

export interface AccessibilityFindingInput {
  pageUrl: string;
  ruleId: string;
  impact: AccessibilityImpact;
  help: string;
  helpUrl: string;
  element: ElementIdentityInput;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized || undefined;
}

function normalizeHref(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("#")) {
    return normalized;
  }

  try {
    const url = new URL(normalized, "https://a11y.invalid");

    if (url.protocol === "http:" || url.protocol === "https:") {
      return `${url.pathname}${url.hash}`;
    }
  } catch {
    // Keep non-URL values as normalized semantic evidence.
  }

  return normalized;
}

export function normalizePageIdentity(pageUrl: string) {
  try {
    const url = new URL(pageUrl, "https://a11y.invalid");
    return url.pathname || "/";
  } catch {
    return pageUrl.trim() || "/";
  }
}

export function createFindingIdentity(
  element: ElementIdentityInput,
): FindingIdentity {
  const explicitId = normalizeText(element.a11yId);

  if (explicitId) {
    return {
      kind: "explicit",
      value: explicitId,
    };
  }

  const attributes = element.attributes ?? {};
  const accessibleName = normalizeText(element.accessibleName);
  const name = normalizeText(attributes.name);
  const href = normalizeHref(attributes.href);
  const semanticEvidence = {
    tag: normalizeText(element.tagName) ?? "unknown",
    role: normalizeText(element.role),
    accessibleName,
    landmark: normalizeText(element.landmark),
    name,
    type: normalizeText(attributes.type),
    href,
  };

  // A tag, role, type, landmark, or DOM location alone is not sufficiently
  // distinctive. Prefer review over claiming that two ambiguous nodes match.
  const hasDistinctiveEvidence = Boolean(accessibleName || name || href);

  return {
    kind: hasDistinctiveEvidence ? "semantic" : "uncertain",
    value: JSON.stringify(semanticEvidence),
  };
}

export function normalizeAccessibilityFinding(
  input: AccessibilityFindingInput,
): AccessibilityFinding {
  return {
    page: normalizePageIdentity(input.pageUrl),
    ruleId: input.ruleId,
    impact: input.impact,
    help: input.help,
    helpUrl: input.helpUrl,
    identity: createFindingIdentity(input.element),
  };
}
