---
name: add-i18n-key
description: Add a new Paraglide i18n message key to both uk and en locale files, then recompile
disable-model-invocation: true
---

# Add i18n Key

Usage: `/add-i18n-key <key> "<ukrainian text>" "<english text>"`

## Steps

1. Add the key to `client/messages/uk.json` (Ukrainian — base locale, alphabetical order)
2. Add the same key to `client/messages/en.json` (English)
3. Run `bun run --cwd client prepare` to recompile Paraglide output
4. Confirm the compiled key appears in `client/src/shared/lib/i18n/messages.js`

## Rules

- Keys use camelCase
- Ukrainian is the source locale — always provide it even when English is the target
- Never edit anything under `client/src/shared/lib/i18n/` — it is generated
- If the key already exists, report a conflict instead of overwriting
- Maintain alphabetical key order within each JSON file
