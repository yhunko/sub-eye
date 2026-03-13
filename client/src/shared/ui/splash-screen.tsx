import { AppAssetUrls } from "shared";

export function SplashScreen() {
  return (
    <div className="bg-background flex h-svh items-center justify-center">
      <img alt="logo" src={AppAssetUrls.logo} className="size-32" />
    </div>
  );
}
