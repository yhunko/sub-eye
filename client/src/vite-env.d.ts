/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
  readonly VITE_API_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_BRANDFETCH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
