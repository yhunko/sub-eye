import { honoClient } from "@server/client";

export const apiClient = honoClient(import.meta.env.VITE_API_URL ?? "", {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // Attempt to get the token from Clerk if available
    const token = await window.Clerk?.session?.getToken();

    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });
  },
});
