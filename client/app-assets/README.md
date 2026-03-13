# App Asset Environments

Each environment gets its own source folder here.

- `prod/` is the default asset set and should stay complete.
- `dev/` is the development/deploy-preview asset set.
- Missing files in a non-prod env automatically fall back to `prod/` so partial envs still build.

Expected files per env:

- `logo.svg`
- `favicon.svg`
- `favicon-96x96.png`
- `favicon.ico`
- `apple-touch-icon.png`
- `pwa/web-app-manifest-192x192.png`
- `pwa/web-app-manifest-512x512.png`

Selection:

- Local `vite` development defaults to `dev`.
- Production builds default to `prod`.
- Any build can override the selection with `VITE_APP_ASSET_ENV=<env>`.
