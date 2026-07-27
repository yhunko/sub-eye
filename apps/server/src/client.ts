import type { app } from "./index";

// The only export the mobile app consumes, through the types-only
// `@subeye/server/client` build. It builds its own `hc` instance from `hono`
// directly — see apps/mobile/CLAUDE.md for why.
export type ServerRpcType = typeof app;
