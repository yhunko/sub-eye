import type { CalendarEventKind } from "@subeye/model";

/**
 * The glyph for each dated event, shared by Home's rail, the calendar's agenda
 * and its day sheet.
 *
 * In `shared/ui` rather than beside the first widget that needed it: three
 * widgets draw these now, and a widget reaching into another widget's `ui/` is
 * the cross-import `check:boundaries` fails the build on — the same reason
 * `list-row` lives here.
 *
 * The GLYPH says what kind of event it is. Where a surface also tints it, the
 * colour says something else — on the rail, when it lands. Keep those apart.
 *
 * `as const satisfies` rather than an annotation: `SymbolView`'s `name` is a
 * union of every symbol name there is, so a `string` here widens out of it and
 * stops type-checking the names at all.
 */
export const eventIcon = {
  trialEnds: { ios: "hourglass", android: "hourglass_empty" },
  introEnds: { ios: "tag", android: "sell" },
  priceChange: { ios: "arrow.up.right", android: "trending_up" },
  payment: { ios: "arrow.triangle.2.circlepath", android: "autorenew" },
  resumes: { ios: "play.circle", android: "play_circle" },
  ends: { ios: "xmark.circle", android: "cancel" },
} as const satisfies Record<CalendarEventKind, unknown>;
