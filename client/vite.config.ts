import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { serwist } from "@serwist/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import mkcert from "vite-plugin-mkcert";
import { createAppEnvAssetsPlugin } from "./vite/plugins/app-env-assets";

import { version } from "../package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const appAssetEnv =
    env.VITE_APP_ASSET_ENV || (mode === "development" ? "dev" : "prod");

  return {
    define: {
      "import.meta.env.APP_ASSET_ENV": JSON.stringify(appAssetEnv),
      "import.meta.env.APP_VERSION": JSON.stringify(version),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-motion": ["motion/react"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-router": ["@tanstack/react-router"],
            "vendor-clerk": ["@clerk/clerk-react"],
          },
        },
      },
    },
    plugins: [
      createAppEnvAssetsPlugin(appAssetEnv),
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
      tsconfigPaths(),
    ],
    resolve: {
      alias: {
        "@server/client": path.resolve(__dirname, "../server/src/client"),
      },
    },
  };
});
