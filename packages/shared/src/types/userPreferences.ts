/**
 * The user's persisted preferences. Before v4 these lived in Clerk
 * `publicMetadata`; they now live in the `users` Postgres table.
 * `preferredTimezone` is an IANA zone name, `preferredCurrency` is a lowercase
 * ISO-4217 code, `dateFormat` is one of `dateFormats`.
 */
export type UserPreferences = {
  preferredCurrency: string;
  preferredTimezone: string;
  dateFormat: string;
  locale: string;
  theme: string;
};
