import { type PropsWithChildren, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

/**
 * Invalidates space-scoped queries when the active space changes.
 * Personal space (null) and org spaces have separate data scopes.
 */
export function SpaceProvider({ children }: PropsWithChildren) {
  const { space, isLoaded } = useActiveSpace();
  const queryClient = useQueryClient();
  const prevSpaceRef = useRef<string | null>(null);

  useEffect(() => {
    // Only invalidate after Clerk has loaded and we have a stable space value.
    // This prevents invalidation loops during transient states when Clerk
    // briefly returns undefined for organization during refetches.
    if (!isLoaded) {
      return;
    }

    if (prevSpaceRef.current !== null && prevSpaceRef.current !== space) {
      // Invalidate only space-scoped query keys
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Check if this is a space-scoped query by examining the query key structure
          return (
            queryKey[0] === "analytics" ||
            queryKey[0] === "billing" ||
            queryKey[0] === "categories" ||
            queryKey[0] === "subscriptions"
          );
        },
      });
    }
    prevSpaceRef.current = space;
  }, [space, queryClient, isLoaded]);

  return <>{children}</>;
}
