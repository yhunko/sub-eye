/**
 * Architecture boundary enforcement. Run with `bun run check:boundaries`.
 *
 * Encodes three invariants:
 *  1. Packages never depend on apps.
 *  2. Mobile Feature-Sliced Design layering: app → widgets → entities → shared
 *     (a layer may only import from lower layers). There is no `features`
 *     layer — seven screens do not justify one.
 *  3. Server layering: repositories are leaves (never import services).
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
    exclude: {
      path: "(^node_modules)|(/dist/)|(/coverage/)",
    },
    doNotFollow: { path: "node_modules" },
  },
};
