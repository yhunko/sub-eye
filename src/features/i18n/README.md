# Internationalization (i18n) Structure

This directory contains the internationalization setup for the application using `next-intl`.

## Structure

```
src/features/i18n/
├── lib/
│   └── request.ts          # Server-side locale detection and message loading
├── model/
│   └── messages/
│       ├── en-US/          # English (US) translations
│       │   ├── common.json
│       │   ├── navigation.json
│       │   ├── subscription.json
│       │   ├── settings.json
│       │   ├── analytics.json
│       │   ├── auth.json
│       │   └── errors.json
│       └── uk-UA/          # Ukrainian translations
│           └── (same structure)
├── ui/
│   └── locale-switcher.tsx # Language switcher component
└── index.ts                # Public exports
```

## Translation Namespaces

Translations are organized into logical namespaces for better maintainability:

- **common**: Shared translations (actions, labels, placeholders, periods, time, empty states, errors)
- **navigation**: Navigation menu items and links
- **subscription**: All subscription-related translations (forms, table, overview, messages)
- **settings**: Settings page translations (tabs, notifications, general settings)
- **analytics**: Analytics dashboard translations (stats, charts, upcoming renewals)
- **auth**: Authentication-related translations (sign in, sign up, sign out, user menu)
- **errors**: Error messages

## Usage

### In Components

```tsx
import { useTranslations } from "next-intl";

export const MyComponent = () => {
  // Access a specific namespace
  const t = useTranslations("subscription.form.basicInfo");

  // Use translations
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
};
```

### Multiple Namespaces

```tsx
import { useTranslations } from "next-intl";

export const MyComponent = () => {
  const tSub = useTranslations("subscription");
  const tCommon = useTranslations("common.actions");

  return (
    <button>
      {tCommon("save")} {tSub("title")}
    </button>
  );
};
```

## Adding New Translations

1. **Add to the appropriate namespace file** (e.g., `en-US/subscription.json`)
2. **Add the same key to all locale files** (e.g., `uk-UA/subscription.json`)
3. **Use in components** with `useTranslations("namespace.path")`

## Locale Detection Priority

1. **User's saved preference** (stored in Clerk user metadata)
2. **Browser locale** (from Accept-Language header)
3. **Default locale** (en-US)

## Supported Locales

- `en-US` - English (United States)
- `uk-UA` - Ukrainian

## Best Practices

1. **Use descriptive namespace paths**: `subscription.form.basicInfo.title` is better than `subscription.title`
2. **Keep translations organized**: Group related translations together
3. **Use common namespace for shared strings**: Don't duplicate common actions/labels
4. **Maintain consistency**: Use the same key structure across all locales
5. **Test both locales**: Ensure all translations are present and correct

## Type Safety

While `next-intl` doesn't provide full TypeScript type safety out of the box, you can:

1. Use consistent key paths (helps catch typos)
2. Create helper functions for common translation patterns
3. Use TypeScript's string literal types for namespace names

## Performance

- Translations are loaded server-side per request
- All namespaces are loaded in parallel for optimal performance
- Messages are merged into a single object for efficient access
- Only the required locale's messages are loaded
