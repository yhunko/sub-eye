/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
  readonly VITE_API_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_BRANDFETCH_CLIENT_ID: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_PADDLE_CLIENT_TOKEN: string;
  readonly VITE_PADDLE_ENV?: "sandbox" | "production";
  readonly VITE_LOCAL_PLAN_SWITCHER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
