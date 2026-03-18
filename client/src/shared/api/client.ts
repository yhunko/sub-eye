import { honoClient } from "@server/client";
import { ApiError } from "./api-error";

export const apiClient = honoClient(import.meta.env.VITE_API_URL ?? "", {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // Attempt to get the token from Clerk if available
    const token = await window.Clerk?.session?.getToken();

    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      const message =
        body && typeof body === "object" && typeof body.error === "string"
          ? body.error
          : "An unexpected error occurred";
      throw new ApiError(message, response.status);
    }

    return response;
  },
});
