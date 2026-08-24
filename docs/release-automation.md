# Release Automation

## Overview

This repository uses `semantic-release` on both long-lived branches:

- `dev`: creates beta releases and keeps a release PR to `main` updated.
- `main`: creates stable releases.

Neither workflow deploys anything. It used to deploy the API Worker; the API was
removed in v5. `apps/landing` ships with `bun run --cwd apps/landing deploy` and
the app ships through EAS, both by hand.

## Production Flow (`main`)

Workflow: `.github/workflows/release-production.yml`

Order of operations:

1. Install dependencies.
2. Run the repo-wide quality gate (lint, type-check, test, boundaries).
3. Run `semantic-release` for stable version/tag/notes updates.
4. Back-merge `main` into `dev`.

The gate runs ahead of `semantic-release` so a failure cannot leave a published
tag and a GitHub release behind for a commit that never ships.

## Dev Flow (`dev`)

Workflow: `.github/workflows/release-dev.yml`

On each push to `dev`:

1. Run beta `semantic-release` via GitHub Action outputs.
2. If a new beta is published, sync an open release PR from `dev` to `main`:
   - PR title: `release/vX.Y.Z`
   - PR body: grouped changelist generated from full `main...dev` delta.
   - Emoji section labels are used only in PR body sections:
     - `Features (✨)`
     - `Fixes (🐛)`
     - `Performance (⚡)`
     - `Refactors (♻️)`
     - `Documentation (📝)`
     - `Tests (✅)`
     - `Chores (🧰)`
     - `Other Changes (📦)`
The repo-wide quality gate runs first, ahead of `semantic-release`, for the same
reason as on `main`.

No `CHANGELOG.md` file is generated or committed by release automation.
Shared PR sync logic lives in `.github/actions/sync-release-pr/action.yml` and is reused by both automated and manual flows.

## Manual Release PR Sync

Workflow: `.github/workflows/sync-release-pr-manual.yml`

Use this when you want to manually create/update the `release/vX.Y.Z` PR without waiting for a new beta release event.

From GitHub UI:

1. Open **Actions** -> **Sync Release PR (Manual)**.
2. Click **Run workflow**.
3. Set inputs:
   - `source_branch` (default: `dev`)
   - `target_branch` (default: `main`)
   - `release_version` (optional override; if empty, read from `package.json` on source branch)
   - `include_latest_beta_notes` (default: `true`)
4. Run.

The workflow creates/updates one open `source_branch -> target_branch` PR with the same grouped emoji changelist format.

## Required GitHub Secrets and Variables

Encrypted secrets (`secrets.*`):

- `GH_TOKEN`
- `TURBO_TOKEN`

Plaintext variables (`vars.*`):

- `TURBO_TEAM`

Removing the API deploy left these unreferenced by any workflow, and they should
be deleted in the GitHub UI once the services behind them are torn down:
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`,
`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` (secrets) and `CLIENT_ORIGIN`,
`CLERK_PUBLISHABLE_KEY`, `POSTHOG_KEY` (variables).
