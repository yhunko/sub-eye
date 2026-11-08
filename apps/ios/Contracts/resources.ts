import { getLegalDoc } from "../../../packages/legal/src/index";

// The app bundles the same documents the site renders; rerun after editing @subeye/legal.
for (const locale of ["en", "uk"] as const) {
  await Bun.write(
    new URL(`../SubEye/Resources/legal-${locale}.json`, import.meta.url),
    `${JSON.stringify(
      [
        getLegalDoc("privacy-policy", locale),
        getLegalDoc("terms-of-service", locale),
      ],
      null,
      2,
    )}\n`,
  );
}
