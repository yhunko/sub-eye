import path from "node:path";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { serwist } from "@serwist/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import * as v from "valibot";
import { defineConfig, loadEnv, type Plugin } from "vite";
import mkcert from "vite-plugin-mkcert";

import { version } from "../package.json";

const ClientEnvSchema = v.object({
  VITE_CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  VITE_BRANDFETCH_CLIENT_ID: v.pipe(v.string(), v.minLength(1)),
  VITE_VAPID_PUBLIC_KEY: v.pipe(v.string(), v.minLength(1)),
  VITE_PADDLE_CLIENT_TOKEN: v.pipe(v.string(), v.minLength(1)),
  VITE_PADDLE_ENV: v.optional(v.picklist(["sandbox", "production"] as const)),
  VITE_API_URL: v.optional(v.string()),
  VITE_POSTHOG_KEY: v.optional(v.string()),
});

function clientEnvCheckPlugin(): Plugin {
  return {
    name: "client-env-check",
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      const result = v.safeParse(ClientEnvSchema, env);
      if (!result.success) {
        const flat = v.flatten(result.issues);
        const lines = Object.entries(flat.nested ?? {})
          .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
          .join("\n");
        throw new Error(
          `Missing or invalid client environment variables:\n\n${lines}\n`,
        );
      }
    },
  };
}

export default defineConfig({
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(version),
  },
  build: {
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          )
            return "vendor-react";
          if (id.includes("node_modules/motion/")) return "vendor-motion";
          if (
            id.includes("node_modules/@tanstack/react-query/") ||
            id.includes("node_modules/@tanstack/query-core/")
          )
            return "vendor-query";
          if (
            id.includes("node_modules/@tanstack/react-router/") ||
            id.includes("node_modules/@tanstack/router-core/") ||
            id.includes("node_modules/@tanstack/history/")
          )
            return "vendor-router";
          if (id.includes("node_modules/@clerk/")) return "vendor-clerk";
          if (id.includes("node_modules/@radix-ui/")) return "vendor-radix";
          if (id.includes("node_modules/date-fns/")) return "vendor-date-fns";
          if (id.includes("node_modules/recharts/")) return "vendor-recharts";
        },
      },
    },
  },
  plugins: [
    clientEnvCheckPlugin(),
    mkcert(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/shared/lib/i18n",
      emitTsDeclarations: true,
      emitGitIgnore: true,
      emitPrettierIgnore: true,
      includeEslintDisableComment: true,
    }),
    serwist({
      swSrc: "src/sw.ts",
      swDest: "sw.js",
      globDirectory: "dist",
      injectionPoint: "self.__SW_MANIFEST",
      rollupFormat: "iife",
    }),
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/pages",
      generatedRouteTree: "./src/app/routes/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "double",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@server/client": path.resolve(__dirname, "../server/src/client"),
      "@/i18n/messages": path.resolve(
        __dirname,
        "./src/shared/lib/i18n/messages/_index",
      ),
      "@/i18n/runtime": path.resolve(
        __dirname,
        "./src/shared/lib/i18n/runtime",
      ),
    },
  },
});
