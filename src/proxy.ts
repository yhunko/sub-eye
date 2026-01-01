import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

const isPublicRoute = createRouteMatcher([
  "/auth(.*)",
  // QStash webhook endpoint - needs to be additionally protected
  "/api/notifications/send",
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
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["https://api.brandfetch.io"],
        "worker-src": ["'self'", "blob:"],
        "frame-src": ["https://vercel.live"],
        "img-src": [`https://${BrandfetchUtils.HOSTNAME}`],
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
