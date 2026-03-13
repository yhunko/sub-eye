import Logo from "@/shared/assets/logo.svg";

export function SplashScreen() {
  return (
    <div className="bg-background flex h-svh items-center justify-center">
      <img alt="logo" src={Logo} className="size-32" />
    </div>
  );
}
