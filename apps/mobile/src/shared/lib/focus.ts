import { focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";

// Feed app foreground/background into TanStack's focusManager ONCE, at module
// load. Without this, `refetchOnWindowFocus` is dead weight in React Native:
// its default listener waits on the DOM's `visibilitychange`, an event that
// never fires here — so nothing but a mount or a reconnect ever refetched.
//
// With it wired, coming back to the app revalidates every stale query in the
// background, behind whatever is already on screen. That is what replaces
// pull-to-refresh; there is no spinner and no gesture to learn.
//
// Imported for its side effect only (`import "@/shared/lib/focus"`) — it has no
// binding in the importer, so do not let an auto-import cleanup delete it.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});
