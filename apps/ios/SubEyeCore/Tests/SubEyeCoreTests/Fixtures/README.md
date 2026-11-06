Current and older StoreDoc migration fixtures, and golden vectors frozen from the
retired TypeScript domain packages so the Swift rules cannot drift from what users
already had. They contain synthetic data only.

`subscriptions-*.json` keep the exact layout of Vision's output (`.accurate`,
language correction on) for four real screenshots of Settings → Apple Account →
Subscriptions — two Ukrainian on iOS 26, two English on older iOS — with every
service name, price and date replaced by made-up ones. Apple's own wording and the
OCR mistakes stay, because the parser has to survive them: "N1,500.00" for ₦,
"¡nkwell+" for a leading i, "Al" for AI, icon glyphs read as text left of a row,
a status verb wrapped onto the line above its date, a half-hidden row under the bar.
