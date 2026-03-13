import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const DEFAULT_ASSET_ENV = "prod";
const MANIFEST_PATH = "/manifest.json";

const ASSET_FILE_MAP = {
  "/apple-touch-icon.png": "apple-touch-icon.png",
  "/assets/logo.svg": "logo.svg",
  "/assets/pwa/web-app-manifest-192x192.png":
    "pwa/web-app-manifest-192x192.png",
  "/assets/pwa/web-app-manifest-512x512.png":
    "pwa/web-app-manifest-512x512.png",
  "/favicon-96x96.png": "favicon-96x96.png",
  "/favicon.ico": "favicon.ico",
  "/favicon.svg": "favicon.svg",
} as const;

const MANIFEST = {
  name: "SubEye",
  short_name: "SubEye",
  description: "Minimalist subscriptions tracker app",
  theme_color: "#ffffff",
  background_color: "#ffffff",
  display: "standalone",
  start_url: "/",
  orientation: "portrait",
  icons: [
    {
      src: "/assets/pwa/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/assets/pwa/web-app-manifest-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
} as const;

const MIME_TYPES: Record<string, string> = {
  ".ico": "image/x-icon",
  ".json": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const getMimeType = (publicPath: string) =>
  MIME_TYPES[path.extname(publicPath)] ?? "application/octet-stream";

const normalizeAssetEnv = (assetEnv?: string) => {
  const normalized = assetEnv?.trim().toLowerCase();

  return normalized || DEFAULT_ASSET_ENV;
};

export const createAppEnvAssetsPlugin = (assetEnv?: string): Plugin => {
  const normalizedAssetEnv = normalizeAssetEnv(assetEnv);
  const assetRootDirectory = fileURLToPath(
    new URL("../../app-assets/", import.meta.url),
  );
  const servedAssets = new Map<string, Buffer>();

  const assertAssetEnvExists = () => {
    const requestedAssetEnvDirectory = path.join(
      assetRootDirectory,
      normalizedAssetEnv,
    );
    if (fs.existsSync(requestedAssetEnvDirectory)) {
      return;
    }

    const availableAssetEnvironments = fs
      .readdirSync(assetRootDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .join(", ");

    throw new Error(
      `Unknown app asset env "${normalizedAssetEnv}". Available envs: ${availableAssetEnvironments}.`,
    );
  };

  const resolveSourceAssetPath = (assetRelativePath: string) => {
    const requestedPath = path.join(
      assetRootDirectory,
      normalizedAssetEnv,
      assetRelativePath,
    );
    if (fs.existsSync(requestedPath)) {
      return requestedPath;
    }

    const fallbackPath = path.join(
      assetRootDirectory,
      DEFAULT_ASSET_ENV,
      assetRelativePath,
    );
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }

    throw new Error(
      `Missing app asset "${assetRelativePath}" for env "${normalizedAssetEnv}" and fallback env "${DEFAULT_ASSET_ENV}".`,
    );
  };

  const syncServedAssets = () => {
    servedAssets.clear();

    for (const [publicPath, assetRelativePath] of Object.entries(
      ASSET_FILE_MAP,
    )) {
      servedAssets.set(
        publicPath,
        fs.readFileSync(resolveSourceAssetPath(assetRelativePath)),
      );
    }

    servedAssets.set(
      MANIFEST_PATH,
      Buffer.from(`${JSON.stringify(MANIFEST, null, 2)}\n`),
    );
  };

  return {
    name: "app-env-assets",
    buildStart() {
      assertAssetEnvExists();
      syncServedAssets();
    },
    configureServer(server) {
      assertAssetEnvExists();
      syncServedAssets();

      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url;
        if (!requestUrl) {
          return next();
        }

        const pathname = new URL(requestUrl, "http://localhost").pathname;
        const source = servedAssets.get(pathname);
        if (!source) {
          return next();
        }

        response.setHeader("Content-Type", getMimeType(pathname));
        response.end(source);
      });
    },
    handleHotUpdate(context) {
      if (!context.file.startsWith(assetRootDirectory)) {
        return;
      }

      syncServedAssets();
    },
    generateBundle() {
      syncServedAssets();

      for (const [publicPath, source] of servedAssets.entries()) {
        this.emitFile({
          type: "asset",
          fileName: publicPath.slice(1),
          source,
        });
      }
    },
  };
};
