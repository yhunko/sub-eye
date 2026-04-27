---
name: db-migration
description: Generate a Drizzle migration from schema changes and apply it with a mandatory review step
disable-model-invocation: true
---

# DB Migration Workflow

Usage: `/db-migration <migration-name>`

## Steps

1. Run `bun run --cwd server db:generate` to produce the migration SQL
2. Locate the new file in `server/src/db/migrations/` and display its full contents for review
3. **Stop and ask the user to confirm** before proceeding — do not auto-apply
4. On confirmation, run `bun run --cwd server db:migrate` to apply
5. Run `bun run --cwd server type-check` to verify Drizzle-inferred types still compile

## Rules

- Never use `db:push` — it bypasses migration history and is for local schema prototyping only
- Migration files are append-only — never edit existing migration SQL files
- If the generated SQL contains a destructive operation (DROP COLUMN, DROP TABLE, TRUNCATE), highlight it explicitly before asking for confirmation
- If type-check fails after migration, surface the error before declaring success
