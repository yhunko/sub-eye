import { object, optional, string } from "valibot";

export const settingsSearchSchema = object({
  from: optional(string()),
});

export type SettingsSearch = {
  from?: string;
};
