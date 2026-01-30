import { hc } from "hono/client";
import type { app } from "./index";

export type ServerRpcType = typeof app;
export type HonoClient = ReturnType<typeof hc<typeof app>>;

export const honoClient = (...args: Parameters<typeof hc>): HonoClient =>
  hc<ServerRpcType>(...args);
