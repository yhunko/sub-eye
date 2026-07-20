import { ClerkProvider } from "@clerk/clerk-expo";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { tokenCache, useClerkTokenBridge } from "@/shared/auth";
import { env } from "@/shared/config/env";
import { useAppLocale } from "@/shared/i18n";
import "@/shared/lib/online"; // side-effect only: registers onlineManager↔NetInfo once
import { persistOptions, queryClient } from "@/shared/lib/query";
import { colors } from "@/shared/ui/theme";

// Renders nothing; feeds Clerk's session token into the shared transport.
function TokenBridge() {
  useClerkTokenBridge();
  return null;
}

// FSD app layer: global providers + the native stack.
//
// PROVIDER ORDER IS LOAD-BEARING:
//   ClerkProvider (tokenCache: expo-secure-store)
//     -> TokenBridge          wires getToken() into shared/api/client
//       -> PersistQueryClientProvider (MMKV persister)
//         -> Stack
// Clerk sits ABOVE Query so the token getter is set before any request fires.
// Re-keying the Stack on locale makes an Android per-app language change
// re-render every screen's strings.
export default function RootLayout() {
  const locale = useAppLocale();
  return (
    <ClerkProvider
      publishableKey={env.CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <TokenBridge />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <Stack
          key={locale}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
        </Stack>
      </PersistQueryClientProvider>
    </ClerkProvider>
  );
}
