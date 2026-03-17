export const extractApiErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const body = await response.json().catch(() => null);
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
};
