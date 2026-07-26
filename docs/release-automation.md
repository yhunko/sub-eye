# Release Automation

## Overview

This repository uses `semantic-release` on both long-lived branches:

- `dev`: creates beta releases, keeps a release PR to `main` updated, and deploys the dev Worker.
- `main`: creates stable releases and deploys production.

## Production Flow (`main`)

Workflow: `.github/workflows/release-production.yml`

Order of operations:

1. Install dependencies.
2. Apply production DB migrations (`bun run --cwd apps/server db:migrate`).
3. Run `semantic-release` for stable version/tag/notes updates.
4. Build and deploy to Cloudflare.
5. Back-merge `main` into `dev`.

This ensures schema changes are applied before the production app rollout.

## Dev Flow (`dev`)

Workflow: `.github/workflows/deploy-dev.yml`

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
3. Build the project (`bun run build`).
4. Validate every Cloudflare binding is present (`bun run --cwd apps/server check-env`)
   — this fails the deploy if any secret or variable below is unset.
5. Push the Worker secrets (`wrangler secret bulk`, `apps/server/dev.wrangler.jsonc`).
6. Deploy the dev Worker (`wrangler deploy --minify`).

Steps 3-6 run on every push to `dev`, whether or not a new beta was published.

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

Both tiers are required — `check-env` fails the deploy if any of the four
Worker bindings below is missing. `apps/server/src/env.ts` is the source of
truth for which bindings the Worker validates.

Encrypted secrets (`secrets.*`):

- `GH_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `TURBO_TOKEN`

Plaintext variables (`vars.*`):

- `BASE_URL`
- `CLIENT_ORIGIN`
- `CLERK_PUBLISHABLE_KEY`
- `POSTHOG_KEY`
- `TURBO_TEAM`
