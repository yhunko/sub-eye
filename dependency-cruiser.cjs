/**
 * Architecture boundary enforcement. Run with `bun run check:boundaries`.
 *
 * Encodes two invariants:
 *  1. Packages never depend on apps.
 *  2. Package layering: legal/money/model are leaves and pricing derives from
 *     them, never the reverse.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-package-to-app",
      comment:
        "packages/* are environment-agnostic contracts or infrastructure adapters. They must never import an application (apps/*). Dependencies flow apps → packages, never the reverse.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    // --- package layering
    //
    // These match the ALIAS STRING (`@subeye/…`): the root tsconfig declares no
    // `paths`, so the specifier stays unresolved and dependency-cruiser keeps it
    // raw in `resolved`.
    {
      name: "legal-is-a-leaf",
      comment:
        "@subeye/legal is published prose — the two documents the app and the site render — and imports nothing at all. An edge out of it means product logic is being computed into text that a user has agreed to, which is how a policy starts describing a build rather than a promise.",
      severity: "error",
      from: { path: "^packages/legal/" },
      to: { path: "^@subeye/" },
    },
    {
      name: "package-layering",
      comment:
        "Package layering: money/model are leaves and pricing derives from them. An edge in the other direction means the concern is in the wrong package.",
      severity: "error",
      from: { path: "^packages/(money|model)/" },
      to: { path: "^@subeye/pricing(/|$)" },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies are forbidden.",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    // Without this, `import type` is erased before the graph is built and every
    // rule below silently ignores it — and with `verbatimModuleSyntax` on, most
    // cross-package edges in this repo ARE type-only.
    tsPreCompilationDeps: true,
    exclude: {
      path: "(^node_modules)|(/dist/)|(/coverage/)",
    },
    doNotFollow: { path: "node_modules" },
  },
};
