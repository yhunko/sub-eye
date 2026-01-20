import Image from "next/image";
import Logo from "../icon0.svg";

export default function ProtectedLoading() {
  return (
    <div className="flex h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={Logo}
          className="animate-bounce"
          alt="Logo"
          width={128}
          height={128}
          loading="eager"
        />
      </div>
    </div>
  );
}
