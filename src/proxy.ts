import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

const isPublicRoute = createRouteMatcher([
  "/auth(.*)",
  // QStash webhook endpoint - needs to be additionally protected
  "/api/notifications/send",
  // Public route for webhooks
  "/api/webhooks/clerk/user/deleted",
  // Public service worker
  "/serwist/sw.js",
  "/~offline",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    signInUrl: "/auth/sign-in",
    signUpUrl: "/auth/sign-up",
    afterSignInUrl: "/",
    afterSignUpUrl: "/",
    contentSecurityPolicy: {
      directives: {
        "connect-src": [
          `https://${BrandfetchUtils.API_HOSTNAME}`,
          "https://*.posthog.com",
        ],
        "frame-src": ["https://vercel.live"],
        "img-src": [`https://${BrandfetchUtils.CDN_HOSTNAME}`],
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
