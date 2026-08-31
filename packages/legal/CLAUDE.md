# @subeye/legal — the two documents, once

The privacy policy and the terms of service, in English and Ukrainian, as data.
`apps/landing` renders them as pages and `apps/mobile` renders them in a sheet;
neither owns a word of the copy, so the site and the shipped binary cannot
disagree about what a user agreed to. Before this package they were two
independent copies of the same prose in four `.astro` files.

## Invariants

- **This package is a leaf.** It imports nothing — not even `@subeye/model` —
  and `dependency-cruiser`'s `legal-is-a-leaf` rule fails the build on any edge
  out of it. A document that computes something is a document that can describe
  a build rather than a promise.
- **`Inline` is the syntax tree, not a markup dialect.** There is no parser and
  no escaping: `{ b }`, `{ code }`, `{ mailto }` and `{ doc }` are the only
  constructs, and plain runs are bare strings. Adding a fifth means editing both
  renderers, which is the cost that keeps the list this short. It also means
  opening a document on a phone costs one array walk.
- **Section ids are a public URL surface.** They are the marketing site's
  fragment anchors, so renaming one breaks a saved link. `test/content.test.ts`
  pins the full ordered list per document, and pins it for BOTH locales — a
  translation that loses a section fails there and nowhere else.
- **Prose is single-spaced and pre-joined.** The source markup used to hard-wrap
  and let HTML collapse it; a React Native `<Text>` collapses nothing, so a
  string carrying a newline reads correctly on the site and ragged in the app.
  Tested.
- **`updated` is an ISO calendar day and is per document.** Both renderers must
  format it with `timeZone: "UTC"` — the string parses to UTC midnight, so a
  build machine west of UTC otherwise prints the day before.

## Changing the copy

The two documents state what SubEye does with a user's data and what they are
paying for. A change to either is a change to a promise, so:

- Edit **both locales together**. `content.test.ts` catches a lost section, not
  a stale translation.
- Move `updated` on that document. The app shows it under the title and the site
  puts it in `<time datetime>`.
- The terms quote the Pro price as formatted literals (`$11.99`, `199 ₴` with a
  **non-breaking space**, as `apps/landing/src/lib/format.ts` emits). The price
  itself lives in `apps/landing/src/lib/site.ts`, which a package may not import;
  `apps/landing/test/pricing.test.ts` pins the two against each other instead, so
  a price change that misses this file fails there.
