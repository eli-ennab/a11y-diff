# Accessibility Regression Testing

Automated accessibility testing for pull requests using Playwright.

The goal is to make accessibility testing easier for developers and help prevent new accessibility issues from being introduced when changes are merged.

## Current functionality

The project currently:

- Runs accessibility tests using Playwright
- Generates accessibility reports
- Can run as part of pull request CI
- Detects common automated accessibility violations

Automated testing does not replace manual accessibility testing, but should reduce the amount of repetitive testing developers need to perform.

## Planned functionality

### Compare PR against its base

Instead of failing a PR because accessibility issues already exist in the application, compare the PR against its base revision.

Issues can then be classified as:

- 🔴 **New** – introduced by the PR
- 🟢 **Fixed** – resolved by the PR
- ⚪ **Existing** – already present before the PR

A PR should primarily be blocked when it introduces new accessibility issues.

### Pull request feedback

Present the results directly in the pull request, for example:

    Accessibility regression check

    ✅ 2 issues fixed
    ⚪ 7 existing issues
    ❌ 1 new issue

    New issue:
    button-name
    /checkout
    Button does not have an accessible name

### GitHub Action

Package the tooling as a reusable GitHub Action so projects can add accessibility regression testing with minimal configuration.

### Manual testing guidance

Some accessibility requirements cannot be reliably automated.

Future reports could highlight what still needs manual verification, such as:

- Keyboard interaction
- Focus behaviour
- Screen reader behaviour
- Touch and mobile behaviour

### Browser and device testing

In the future, broader browser/device accessibility checks could run separately from the fast PR checks.

This could allow:

- Fast accessibility checks on every PR
- More extensive browser/device testing on a schedule or before releases
- Less repetitive manual testing across many browser and OS versions

## Philosophy

The initial goal is simple:

> **Don't make accessibility worse.**

Existing accessibility problems should be visible without making them impossible to work around. New accessibility regressions introduced by a pull request should be easy to identify and fix.
