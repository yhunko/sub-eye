# Client Workspace

React 19 + Vite PWA for SubEye.

## Key Areas

- Routes live in `src/pages/` and TanStack Router generates `src/app/routes/routeTree.gen.ts`.
- User-facing copy must come from Paraglide messages in `messages/`.
- Shared client utilities live under `src/shared/`.

## Commands

Use workspace-scoped scripts when you only need to work on the client:

```sh
bun run --cwd client dev
bun run --cwd client build
bun run --cwd client prepare
bun run --cwd client lint
bun run --cwd client type-check
bun run --cwd client test
```

## Notes

- Run `bun run --cwd client prepare` after changing message keys so Paraglide regenerates `src/shared/lib/i18n/`.
- Do not edit `src/app/routes/routeTree.gen.ts` or files in `src/shared/lib/i18n/`; both are generated.
