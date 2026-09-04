import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  type LogoVariant,
  readStoredVariants,
  storeVariant,
} from "@/shared/lib/logos";

type Variants = Record<string, LogoVariant>;

const LogoVariantContext = createContext<{
  variants: Variants;
  choose: (domain: string, variant: LogoVariant | null) => void;
  clear: () => void;
}>({ variants: {}, choose: () => {}, clear: () => {} });

/**
 * Which mark each brand is drawn with, as REACT STATE rather than a module
 * store.
 *
 * Every avatar in the app is mounted when the picker changes a brand, and they
 * all resolve the variant during render — so the change has to reach them
 * without a remount. That was first built as a module-level map plus a
 * `useSyncExternalStore` subscription, and on device it did not hold: a write
 * reported success and the very next read, in the same tick, returned the
 * previous value, so every avatar re-rendered and drew what it already had. The
 * choice still persisted, which made it look like a broken subscription for a
 * long time. Context has no such question — the value that re-renders the tree
 * IS the value the tree reads.
 *
 * MMKV is the durable copy only. It is read once here, at mount, and written
 * through on every choice; nothing reads it back during a session.
 */
export function LogoVariantProvider({ children }: { children: ReactNode }) {
  const [variants, setVariants] = useState<Variants>(readStoredVariants);

  const value = useMemo(
    () => ({
      variants,
      choose: (domain: string, variant: LogoVariant | null) => {
        storeVariant(domain, variant);
        setVariants((current) => {
          if (variant) return { ...current, [domain]: variant };
          const { [domain]: _dropped, ...rest } = current;
          return rest;
        });
      },
      clear: () => setVariants({}),
    }),
    [variants],
  );

  return (
    <LogoVariantContext.Provider value={value}>
      {children}
    </LogoVariantContext.Provider>
  );
}

/** The variant chosen for one brand, or `null` for "whatever the ladder picks". */
export function useLogoVariant(domain: string | null): LogoVariant | null {
  const { variants } = useContext(LogoVariantContext);
  return domain ? (variants[domain] ?? null) : null;
}

/** Choose how a brand is drawn everywhere, or `null` to go back to automatic. */
export function useChooseLogoVariant() {
  return useContext(LogoVariantContext).choose;
}

/** Part of "Erase all data" — the durable copy is dropped by `clearLogos`. */
export function useClearLogoVariants() {
  return useContext(LogoVariantContext).clear;
}
