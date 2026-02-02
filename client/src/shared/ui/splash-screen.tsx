import LogoWhite from "@/shared/assets/logo-white.svg";

export function SplashScreen() {
  return (
    <div className="flex h-svh items-center justify-center bg-white!">
      <img alt="logo" src={LogoWhite} className="size-32" />
    </div>
  );
}
