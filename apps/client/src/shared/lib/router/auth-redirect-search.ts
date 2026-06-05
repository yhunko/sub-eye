import { object, optional, string } from "valibot";

export const authRedirectSearchSchema = object({
  redirect: optional(string()),
  redirect_url: optional(string()),
});
