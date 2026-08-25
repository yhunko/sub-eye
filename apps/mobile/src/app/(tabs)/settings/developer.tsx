import type { ReactNode } from "react";

// Dev-only route. The widget is pulled in with require() inside a `__DEV__`
// ternary, NOT a static import: Metro inlines `__DEV__` and folds the dead
// branch BEFORE it collects dependencies, so in a production bundle the module
// is never reached and never bundled. A static import is hoisted and would ship
// it — as would a lazy() or a dynamic import(), both of which Metro resolves.
//
// The FILE still ships (anything in `app/` is a route), which is why it holds
// nothing but this stub. Verify with:
//   bun run --cwd apps/mobile i18n:generate
//   bunx expo export --platform ios --output-dir /tmp/x   # from apps/mobile
//   grep -rlF 'Offering loading' /tmp/x
// If the export is Hermes bytecode, `grep` matches nothing at all and every
// check looks like it passed — use `strings -a … | grep -cF` there instead, and
// always grep a string you know IS in production first to prove the method.
const DeveloperPage: () => ReactNode = __DEV__
  ? require("@/widgets/developer-page").DeveloperPage
  : () => null;

export default function DeveloperRoute() {
  return <DeveloperPage />;
}
