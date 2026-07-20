/**
 * Architecture boundary enforcement. Run with `bun run check:boundaries`.
 *
 * Encodes three invariants:
 *  1. Packages never depend on apps.
 *  2. Client Feature-Sliced Design layering: app → pages → widgets → features →
 *     entities → shared (a layer may only import from lower layers).
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
    {
      name: "fsd-no-pages-upward",
      comment: "FSD: pages may import widgets/features/entities/shared only.",
      severity: "error",
      from: { path: "^apps/client/src/pages" },
      to: { path: "^apps/client/src/app/" },
    },
    {
      name: "fsd-no-widgets-upward",
      comment: "FSD: widgets may import features/entities/shared only.",
      severity: "error",
      from: { path: "^apps/client/src/widgets" },
      to: { path: "^apps/client/src/(app/|pages/)" },
    },
    {
      name: "fsd-no-features-upward",
      comment: "FSD: features may import entities/shared only.",
      severity: "error",
      from: { path: "^apps/client/src/features" },
      to: { path: "^apps/client/src/(app/|pages/|widgets/)" },
    },
    {
      name: "fsd-no-entities-upward",
      comment: "FSD: entities may import shared only.",
      severity: "error",
      from: { path: "^apps/client/src/entities" },
      to: { path: "^apps/client/src/(app/|pages/|widgets/|features/)" },
    },
    {
      name: "fsd-no-shared-upward",
      comment: "FSD: shared must not depend on any higher layer.",
      severity: "error",
      from: { path: "^apps/client/src/shared" },
      to: {
        path: "^apps/client/src/(app/|pages/|widgets/|features/|entities/)",
      },
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
      name: "mobile-no-web-client-import",
      comment:
        "apps/mobile must never import the retired web client (apps/client is deleted in Plan 8).",
      severity: "error",
      from: { path: "^apps/mobile/" },
      to: { path: "^apps/client/" },
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
      path: "(^node_modules)|(/dist/)|(/coverage/)|(routeTree\\.gen\\.ts)|(/shared/lib/i18n/)",
    },
    doNotFollow: { path: "node_modules" },
  },
};
