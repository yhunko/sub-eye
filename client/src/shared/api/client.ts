import { honoClient } from "@server/client";

const SERVER_URL = import.meta.env.DEV ? "http://localhost:3000" : "";

export const apiClient = honoClient(SERVER_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});
