import Image from "next/image";
import LogoWhite from "../../assets/logo-white.svg";

export const AppLoading = () => {
  return (
    <div className="flex h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={LogoWhite}
          className="animate-bounce"
          alt="Logo"
          width={128}
          height={128}
          loading="eager"
        />
      </div>
    </div>
  );
};
