import { useMediaQuery } from "@mantine/hooks";

/**
 * Tailwind 4 default breakpoints
 */
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Custom hook to detect Tailwind breakpoints.
 * Follows 'mobile-first' philosophy: returns true if screen is >= breakpoint.
 *
 * Usage: const isDesktop = useBreakpoint('md');
 */
export function useBreakpoint(breakpoint: BreakpointKey) {
  const width = BREAKPOINTS[breakpoint];

  // We use min-width to match how Tailwind classes (like md:h-2) work
  return useMediaQuery(`(min-width: ${width})`, true, {
    getInitialValueInEffect: false,
  });
}
