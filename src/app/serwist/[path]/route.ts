import { createSerwistRoute } from "@serwist/turbopack";

// Using `git rev-parse HEAD` might not the most efficient
// way of determining a revision. You may prefer to use
// the hashes of every extra file you precache.
const revision =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/shared/lib/serwist/sw.ts",
    // Copy relevant Next.js configuration (assetPrefix,
    // basePath, distDir) over if you've changed them.
    nextConfig: {},
  });
