# Release Automation

## Overview

This repository uses `semantic-release` on both long-lived branches:

- `dev`: creates beta releases and keeps a release PR to `main` updated.
- `main`: creates stable releases and deploys production.

## Production Flow (`main`)

Workflow: `.github/workflows/release-production.yml`

Order of operations:

1. Install dependencies.
2. Apply production DB migrations (`bun --cwd server run db:migrate`).
3. Run `semantic-release` for stable version/tag/notes updates.
4. Build and deploy to Cloudflare.
5. Back-merge `main` into `dev`.

This ensures schema changes are applied before the production app rollout.

## Release PR Flow (`dev -> main`)

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

No `CHANGELOG.md` file is generated or committed by release automation.

## Required GitHub Secrets

- `GH_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- Existing project-specific deploy/build secrets already used in workflows
