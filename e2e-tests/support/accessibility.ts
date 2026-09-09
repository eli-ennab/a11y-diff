import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { AccessibilityFinding } from "./accessibility-diff";
import {
  normalizeAccessibilityFinding,
  type ElementIdentityInput,
} from "./accessibility-normalize";

function tagNameFromHtml(html: string) {
  return /^\s*<([a-z0-9-]+)/i.exec(html)?.[1] ?? "unknown";
}

function directSelector(target: unknown) {
  if (
    Array.isArray(target) &&
    target.length === 1 &&
    typeof target[0] === "string"
  ) {
    return target[0];
  }

  return undefined;
}

async function readElementIdentity(
  page: Page,
  target: unknown,
  html: string,
): Promise<ElementIdentityInput> {
  const selector = directSelector(target);

  if (!selector) {
    return {
      tagName: tagNameFromHtml(html),
      generatedSelector: JSON.stringify(target),
    };
  }

  try {
    return await page.locator(selector).first().evaluate((element) => {
      const textFromIds = (ids: string | null) =>
        ids
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ");
      const labelledByText = textFromIds(
        element.getAttribute("aria-labelledby"),
      );
      const labelText =
        "labels" in element
          ? Array.from(
              (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)
                .labels ?? [],
            )
              .map((label) => label.textContent ?? "")
              .join(" ")
          : undefined;
      const accessibleName =
        labelledByText ||
        element.getAttribute("aria-label") ||
        labelText ||
        element.getAttribute("alt") ||
        element.textContent ||
        element.getAttribute("title");
      const landmark = element.closest(
        "main, nav, aside, header, footer, form, [role='main'], [role='navigation'], [role='complementary'], [role='banner'], [role='contentinfo'], [role='form'], [role='region']",
      );
      const landmarkLabel = landmark
        ? textFromIds(landmark.getAttribute("aria-labelledby")) ||
          landmark.getAttribute("aria-label")
        : undefined;
      const landmarkName = landmark
        ? `${landmark.getAttribute("role") || landmark.tagName}:${landmarkLabel || ""}`
        : undefined;

      return {
        tagName: element.tagName,
        a11yId: element.getAttribute("data-a11y-id"),
        role: element.getAttribute("role"),
        accessibleName,
        landmark: landmarkName,
        attributes: {
          name: element.getAttribute("name"),
          type: element.getAttribute("type"),
          href: element.getAttribute("href"),
        },
      };
    });
  } catch {
    return {
      tagName: tagNameFromHtml(html),
      generatedSelector: selector,
    };
  }
}

export async function findSeriousOrCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();

  return results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
}

export async function findSeriousOrCriticalAccessibilityFindings(
  page: Page,
  pageUrl = page.url(),
): Promise<AccessibilityFinding[]> {
  const violations = await findSeriousOrCriticalViolations(page);
  const pendingFindings = violations.flatMap((violation) => {
    const impact = violation.impact;

    if (impact !== "serious" && impact !== "critical") {
      return [];
    }

    return violation.nodes.map(async (node) =>
      normalizeAccessibilityFinding({
        pageUrl,
        ruleId: violation.id,
        impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        element: await readElementIdentity(page, node.target, node.html),
      }),
    );
  });

  return Promise.all(pendingFindings);
}
