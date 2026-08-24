/**
 * Architecture boundary enforcement. Run with `bun run check:boundaries`.
 *
 * Encodes five invariants:
 *  1. Packages never depend on apps.
 *  2. Mobile Feature-Sliced Design layering: app → widgets → entities → shared
 *     (a layer may only import from lower layers). There is no `features`
 *     layer — seven screens do not justify one.
 *  3. Server layering: repositories are leaves (never import services).
 *  4. Mobile reaches the server ONLY through the typed RPC client at
 *     `@subeye/server/client` — never a deep import into apps/server/src.
 *  5. Package layering: time/money/model are leaves, lifecycle/pricing/spend/
 *     reminders derive from them and never from each other's tier peers where
 *     forbidden, and store sits on top alone.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-package-to-app",
      comment:
        "packages/* are environment-agnostic contracts or infrastructure adapters. They must never import an application (apps/*) — including the server db, domains, or routes. Dependencies flow apps → packages, never the reverse.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    // --- package layering
    //
    // Like the mobile FSD rules below, these match the ALIAS STRING
    // (`@subeye/…`): the root tsconfig declares no `paths`, so the specifier
    // stays unresolved and dependency-cruiser keeps it raw in `resolved`.
    {
      name: "package-layering",
      comment:
        "Package layering: time/money/model are leaves; lifecycle/pricing/spend/reminders derive from them; store sits on top and is the only package allowed IO (through injected ports). An edge in the other direction means the concern is in the wrong package.",
      severity: "error",
      from: { path: "^packages/(time|money|model)/" },
      to: { path: "^@subeye/(lifecycle|pricing|spend|reminders|store)(/|$)" },
    },
    {
      name: "no-derived-to-store",
      comment:
        "Pure derivation packages must not depend on @subeye/store. store composes them, never the reverse.",
      severity: "error",
      from: { path: "^packages/(lifecycle|pricing|spend|reminders)/" },
      to: { path: "^@subeye/store(/|$)" },
    },
    {
      name: "no-pricing-to-spend",
      comment:
        "pricing must not import spend. The edge existed only because phaseScheduling reached for calculatePaymentDates; that is recurrence and lives in @subeye/time.",
      severity: "error",
      from: { path: "^packages/pricing/" },
      to: { path: "^@subeye/spend(/|$)" },
    },
    {
      name: "no-spend-to-pricing",
      comment:
        "spend must not import pricing. They are siblings: store composes both, neither composes the other.",
      severity: "error",
      from: { path: "^packages/spend/" },
      to: { path: "^@subeye/pricing(/|$)" },
    },
    {
      name: "mobile-server-only-via-client",
      comment:
        "apps/mobile reaches the server ONLY through the typed RPC client at '@subeye/server/client' (a types-only build under apps/server/dist). Deep imports into apps/server/src are forbidden — they drag server internals into the app and bypass the RPC contract.",
      severity: "error",
      from: { path: "^apps/mobile/" },
      to: { path: "^apps/server/src/" },
    },
    // --- apps/mobile FSD: app → widgets → entities → shared (NO features layer)
    //
    // These match the ALIAS STRING (`@/widgets/…`), not a resolved path: the
    // root tsconfig declares no `paths`, so `@/…` specifiers stay unresolved and
    // dependency-cruiser keeps the raw specifier in `resolved`. Mobile code
    // imports across layers exclusively through `@/…`, so this covers every
    // cross-layer edge.
    {
      name: "mobile-fsd-no-widgets-upward",
      comment:
        "apps/mobile FSD: widgets may import entities/shared only, never the app (routing) layer.",
      severity: "error",
      from: { path: "^apps/mobile/src/widgets" },
      to: { path: "^@/app/" },
    },
    {
      name: "mobile-fsd-no-entities-upward",
      comment:
        "apps/mobile FSD: entities may import shared only, never widgets or the app layer.",
      severity: "error",
      from: { path: "^apps/mobile/src/entities" },
      to: { path: "^@/(app|widgets)/" },
    },
    {
      name: "mobile-fsd-no-shared-upward",
      comment:
        "apps/mobile FSD: shared is the bottom layer and must not depend on any layer above it.",
      severity: "error",
      from: { path: "^apps/mobile/src/shared" },
      to: { path: "^@/(app|widgets|entities)/" },
    },
    {
      name: "mobile-no-features-layer",
      comment:
        "apps/mobile has NO features layer by design — seven screens make it ceremony. Page composition belongs in widgets/, domain data in entities/.",
      severity: "error",
      from: { path: "^apps/mobile/src/" },
      to: { path: "^(@/features/|apps/mobile/src/features/)" },
    },
    {
      name: "server-repository-is-leaf",
      comment:
        "Server layering: repositories own DB access and must not depend on services (Route → Service → Repository).",
      severity: "error",
      from: { path: "Repository\\.ts$" },
      to: { path: "Service\\.ts$" },
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
    // cross-package and cross-layer edges in this repo ARE type-only.
    tsPreCompilationDeps: true,
    exclude: {
      path: "(^node_modules)|(/dist/)|(/coverage/)",
    },
    doNotFollow: { path: "node_modules" },
  },
};
