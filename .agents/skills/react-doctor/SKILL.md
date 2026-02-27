---
name: react-doctor
description: Run React Doctor only when changed files include React source files in `client` (`.tsx`, `.ts`, `.jsx`, `.js`). Use when reviewing React changes, finishing a feature, fixing bugs, and before commit.
---

# React Doctor

Scan React code quality for changed `client` React files and treat warnings as failures.

## Usage

```bash
bun x react-doctor@latest . --project client --yes --no-ami --offline --fail-on warning --verbose
```

## Workflow

1. Detect changed files:

- Run `git diff --name-only --diff-filter=ACMR`.
- Run `git diff --cached --name-only --diff-filter=ACMR`.
- Merge both lists and deduplicate.

2. Filter to changed React files in `client`:

- Match `^client/.*\\.(tsx|ts|jsx|js)$`.

3. Gate execution:

- If no matching files exist, skip React Doctor.
- If at least one matching file exists, run:

```bash
bun x react-doctor@latest . --project client --yes --no-ami --offline --fail-on warning --verbose
```

4. Resolve findings:

- Treat warnings as failures.
- Fix all reported findings and re-run until clean.
