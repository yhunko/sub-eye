import type { Href } from "expo-router";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/** The "or" rule between the credential form and the SSO buttons. */
export function OrDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.dividerLabel}>{m.auth_or()}</Text>
      <View style={styles.rule} />
    </View>
  );
}

/** Screen 07's failure banner — the only red surface in the auth flow. */
export function ErrorBanner({ title, body }: { title: string; body?: string }) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <SymbolView
        name={{ ios: "exclamationmark.circle", android: "error" }}
        size={18}
        tintColor={colors.danger}
      />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {body ? <Text style={styles.bannerBody}>{body}</Text> : null}
      </View>
    </View>
  );
}

/** A neutral explanatory card — screen 04's "no email on your account?". */
export function NoteCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteTitle}>{title}</Text>
      <Text style={styles.noteBody}>{body}</Text>
    </View>
  );
}

/** The muted line with one green link that closes every auth screen. */
export function FooterLink({
  prompt,
  action,
  href,
}: {
  prompt?: string;
  action: string;
  href: Href;
}) {
  return (
    <Text style={styles.footer}>
      {prompt ? `${prompt} ` : ""}
      <Link href={href} replace style={styles.footerAction}>
        {action}
      </Link>
    </Text>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 26,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { fontSize: 12.5, color: colors.muted },
  banner: {
    flexDirection: "row",
    gap: 11,
    padding: 14,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
  },
  bannerText: { flex: 1, gap: 3 },
  bannerTitle: { fontSize: 13.5, fontWeight: "700", color: colors.danger },
  bannerBody: { fontSize: 13, lineHeight: 18, color: colors.muted },
  note: {
    gap: 6,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  },
  noteTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  noteBody: { fontSize: 13, lineHeight: 18, color: colors.muted },
  footer: { textAlign: "center", fontSize: 14, color: colors.muted },
  footerAction: { fontWeight: "600", color: colors.accent },
});
