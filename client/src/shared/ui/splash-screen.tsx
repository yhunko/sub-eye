import LogoWhite from "@/shared/assets/logo-white.svg";

export function SplashScreen() {
  return (
    <div className="flex h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <img alt="logo" src={LogoWhite} className="size-32 animate-bounce" />
      </div>
    </div>
  );
}
