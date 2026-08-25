import type { Block, Inline, LegalDoc, LegalDocKind } from "@subeye/legal";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/ui/theme";

/**
 * The native half of the renderer. `apps/landing/src/components/LegalBody.astro`
 * is the other one, over the same `LegalDoc` — the two agree on the copy because
 * neither owns any, and they render it in the idiom of their own platform.
 */

// `code` is tested before `b`: a code run may carry `b` too, so the other
// order would narrow a bolded domain to the wrong branch.
const runText = (run: Inline): string =>
  typeof run === "string"
    ? run
    : "code" in run
      ? run.code
      : "b" in run
        ? run.b
        : "mailto" in run
          ? run.mailto
          : run.text;

/**
 * Content is static and never reorders, so identity only has to be unique
 * within its own array — the rendered text is, and an array index would trip
 * Biome's `noArrayIndexKey`.
 */
const blockKey = (block: Block): string =>
  "p" in block
    ? block.p.map(runText).join("")
    : "ul" in block
      ? block.ul.map((item) => item.map(runText).join("")).join("")
      : block.dl.map((entry) => entry.term).join("");

function Runs({
  runs,
  onOpenDoc,
}: {
  runs: Inline[];
  onOpenDoc: (kind: LegalDocKind) => void;
}) {
  return runs.map((run) => {
    if (typeof run === "string") return run;
    if ("code" in run) {
      return (
        <Text key={run.code} style={run.b ? [s.code, s.bold] : s.code}>
          {run.code}
        </Text>
      );
    }
    if ("b" in run) {
      return (
        <Text key={run.b} style={s.bold}>
          {run.b}
        </Text>
      );
    }
    if ("mailto" in run) {
      return (
        <Text
          key={run.mailto}
          style={s.link}
          onPress={() => void Linking.openURL(`mailto:${run.mailto}`)}
        >
          {run.mailto}
        </Text>
      );
    }
    return (
      <Text key={run.text} style={s.link} onPress={() => onOpenDoc(run.doc)}>
        {run.text}
      </Text>
    );
  });
}

function Blocks({
  blocks,
  onOpenDoc,
}: {
  blocks: Block[];
  onOpenDoc: (kind: LegalDocKind) => void;
}) {
  return blocks.map((block) => {
    const key = blockKey(block);

    if ("p" in block) {
      return (
        <Text key={key} style={s.p}>
          <Runs runs={block.p} onOpenDoc={onOpenDoc} />
        </Text>
      );
    }

    if ("ul" in block) {
      return (
        <View key={key} style={s.list}>
          {block.ul.map((item) => (
            <View key={item.map(runText).join("")} style={s.item}>
              {/* The marketing site draws the same em dash with `li::before`. */}
              <Text style={s.marker}>—</Text>
              <Text style={s.itemText}>
                <Runs runs={item} onOpenDoc={onOpenDoc} />
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View key={key} style={s.list}>
        {block.dl.map((entry) => (
          <View key={entry.term} style={s.entry}>
            <Text style={s.term}>{entry.term}</Text>
            <Text style={s.p}>
              <Runs runs={entry.desc} onOpenDoc={onOpenDoc} />
            </Text>
          </View>
        ))}
      </View>
    );
  });
}

export function LegalBody({
  doc,
  updatedLabel,
  onOpenDoc,
}: {
  doc: LegalDoc;
  updatedLabel: string;
  onOpenDoc: (kind: LegalDocKind) => void;
}) {
  return (
    <View style={s.root}>
      <Text style={s.updated}>{updatedLabel}</Text>
      <View style={s.blocks}>
        <Blocks blocks={doc.lead} onOpenDoc={onOpenDoc} />
      </View>
      {doc.sections.map((section) => (
        <View key={section.id} style={s.section}>
          <Text accessibilityRole="header" style={s.heading}>
            {section.heading}
          </Text>
          <View style={s.blocks}>
            <Blocks blocks={section.blocks} onOpenDoc={onOpenDoc} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 24 },
  updated: { fontSize: 13, color: colors.muted },
  section: { gap: 10 },
  blocks: { gap: 12 },
  heading: { fontSize: 17, fontWeight: "700", color: colors.text },
  p: { fontSize: 15, lineHeight: 23, color: colors.muted },
  bold: { color: colors.text, fontWeight: "600" },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 13,
    color: colors.text,
  },
  link: { color: colors.accent, fontWeight: "600" },
  list: { gap: 10 },
  item: { flexDirection: "row", gap: 8 },
  marker: { fontSize: 15, lineHeight: 23, color: colors.accent },
  itemText: { flex: 1, fontSize: 15, lineHeight: 23, color: colors.muted },
  entry: { gap: 4 },
  term: { fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.text },
});
