import { honoClient } from "@server/client";

export const apiClient = honoClient(import.meta.env.VITE_API_URL ?? "", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});
