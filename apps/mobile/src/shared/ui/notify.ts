import { Alert } from "react-native";
import { m } from "@/shared/i18n";

/**
 * The one place a failed write tells the user.
 *
 * Optimistic mutations roll the cache back on failure, which is silent by
 * design — the number on screen simply returns to what it was. Without this the
 * user is left to notice that reversion themselves and guess whether it saved.
 *
 * It is a native Alert rather than a toast because the app has no toast host and
 * a failed write deserves an acknowledgement, not a banner that can be missed.
 */
export function notifyWriteFailed(): void {
  Alert.alert(m.error_writeFailed());
}
