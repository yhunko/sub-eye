import { getLegalDoc, type LegalDocKind } from "@subeye/legal";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { getLocale, m } from "@/shared/i18n";
import { formatDate } from "@/shared/lib/format";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";
import { LegalBody } from "./legal-body";

/**
 * The documents ship inside the binary, so this opens instantly and offline —
 * it is not a browser hand-off. That is the reason the copy lives in
 * `@subeye/legal` rather than only on the marketing site.
 */
export function LegalSheet({ kind }: { kind: LegalDocKind }) {
  const router = useRouter();
  const doc = getLegalDoc(kind, getLocale());

  return (
    <>
      {/* The chrome is respread here, as every headered screen in this app
          does: these options replace the route's rather than merge with them. */}
      <Stack.Screen options={{ ...nativeHeaderChrome, title: doc.title }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <LegalBody
          doc={doc}
          updatedLabel={`${m.legal_updated()} ${formatDate(doc.updated)}`}
          // `replace`, not `push`: the terms link to the policy and pushing
          // would stack a second sheet on the first. `setParams` looks like the
          // lighter option and is not one — it does not move a dynamic path
          // segment, so the sheet silently keeps showing the old document.
          // Replacing re-presents nothing: the sheet stays put and the new
          // screen mounts scrolled to the top.
          onOpenDoc={(next) => router.replace(`/legal/${next}`)}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
});
