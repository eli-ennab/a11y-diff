# a11y-diff

An accessibility regression guard for pull requests, requests, using Playwright and and Axe.

The goal is simple:

> **Don’t make accessibility worse.**

Instead of failing because an application already has accessibility issues, the a11y-diff compares compares the pull request with its base version and focuses on what changed.

## What a11y-diff reports

Findings are classified as:

- 🔴 **Introduced** — found in the PR but not in the base
- 🟢 **Fixed** — found in the base but not in the PR
- ⚪ **Existing** — found in both versions
- 🟡 **Requires review** — could not be matched confidently

Existing issues remain visible, but do not fail the check.

The check fails only when the PR introduces serious or critical Axe findings.

## Use in a GitHub Actions workflow

Create this file in the repository that you want to test:

```text
.github/workflows/a11y-diff.yml
```

Add:

```yaml
name: a11y-diff

on:
  pull_request:

jobs:
  a11y-diff:
    runs-on: ubuntu-latest

    steps:
      - name: a11y-diff
        id: a11y_diff
        uses: eli-ennab/a11y-diff@main
        with:
          base-url: ${{ vars.BASE_URL }}
          test-url: ${{ vars.TEST_URL }}
```

### What the workflow does

- `on: pull_request` runs the check when a PR is opened or updated.
- `runs-on: ubuntu-latest` creates a temporary GitHub runner.
- `uses: eli-ennab/a11y-diff@main` downloads and runs a11y-diff.
- `base-url` is the page from main or the PR base.
- `test-url` is the equivalent page from the PR branch.
- `id: a11y_diff` allows later steps to access the report.

## Configure the URLs

For a simple test, create two repository variables:

1. Open **Settings → Secrets and variables → Actions** in Github.
2. Select **Variables**.
3. Add `BASE_URL`.
4. Add `TEST_URL`.

Example:

```text
BASE_URL=https://main.example.com/checkout
TEST_URL=https://preview.example.com/checkout
```

Repository variables are global. They do not automatically point to different branches.

In a real project:

- `BASE_URL` will usually be a stable main or staging deployment.
- `TEST_URL` should usually come from the PR preview deployment.

For example:

```yaml
with:
  base-url: ${{ vars.BASE_URL }}
  test-url: ${{ needs.deploy-preview.outputs.url }}
```

The exact PR preview output depends on the project’s hosting provider.

Both pages should represent the same route and use equivalent test data and application state.

## Pull request feedback

The report is added to the GitHub Actions job summary.

Example:

```text
a11y-diff

❌ 1 introduced
✅ 2 fixed
⚪ 7 existing
🟡 1 requires review
```

The generated Markdown report is also available through the `report-path` output:

```yaml
- name: Upload a11y-diff report
  if: ${{ always() }}
  uses: actions/upload-artifact@v5
  with:
    name: a11y-diff-report
    path: ${{ steps.a11y_diff.outputs.report-path }}
```

`if: ${{ always() }}` uploads the report even when accessibility regressions make the check fail.

## Does it block merging?

a11y-diff fails its status check when serious or critical findings are introduced.

A failed check does not block merging automatically. To make it required:

1. Open **Settings → Rules → Rulesets**.
2. Create or edit a ruleset for `main`.
3. Enable **Require status checks to pass**.
4. Select the a11y-diff status check.

After that:

- Introduced serious or critical findings block merging.
- Fixed and existing findings do not block merging.
- Findings requiring review do not automatically block merging.

## How findings are matched

a11y-diff does not use CSS classes, generated selectors, or DOM positions to compare elements.

It prefers:

1. An explicit `data-a11y-id`
2. Stable semantic information, such as role, accessible name, and relevant attributes.
3. A cautious “requires review” result when an element cannot be matched confidently.

## Current limitations

- One page is compared per Action run.
- Only serious and critical Axe findings affect the result.
- The Action currently only runs in Chromium.
- Both URLs must be reachable from the GitHub Actions runner.
- Pages requiring authentication or private-network access are not supported.
- Different data or dynamic content can create misleading differences.
- Automated checks do not replace manual accessibility testing.

## Test locally without a workflow

You can test a11y-diff locally without creating a GitHub Actions workflow.

Install the existing dependencies and Chromium:

```bash
npm ci
npx playwright install chromium
```

Using Git Bash, macOS, or Linux:

```bash
BASE_URL='https://main.example.com/checkout' \
TEST_URL='https://preview.example.com/checkout' \
npx playwright test --project=chromium
```

The report is written to:

```text
test-results/accessibility-report.md
```

## Manual testing

Automated tests cannot prove that a page is fully accessible.

The report includes reminders to manually check:

- Keyboard interaction
- Focus order and visibility
- Screen-reader behavior
- Zoom and reflow
- Touch and mobile interaction
