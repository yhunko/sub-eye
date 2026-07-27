import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

// Feed device connectivity into TanStack's onlineManager ONCE, at module load,
// so query network-mode and any offline UI read one source. This module is
// imported for its side effect only (`import "@/shared/lib/online"`) — it has no
// binding in the importer, so do not let an auto-import cleanup delete it.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);
