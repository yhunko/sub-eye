import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/components";
import { Construction } from "lucide-react";

export const DashboardLogo = () => {
  const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "production";

  return (
    <div className="group flex items-center gap-2">
      <Link
        href="/"
        className="flex flex-col gap-0 md:flex-row md:items-center md:gap-2"
      >
        <div className="overflow-hidden rounded-md">
          <Image
            src="/android-chrome-512x512.png"
            alt="app logo"
            width={24}
            height={24}
            priority
            className="transition-transform duration-300 ease-in-out will-change-transform group-hover:scale-125"
          />
        </div>

        <span className="text-sm font-semibold tracking-tight md:text-base">
          SubEye
        </span>
      </Link>
      <Badge asChild variant="secondary">
        <Link
          href={`https://github.com/yhunko/sub-eye/releases/tag/v${process.env.NEXT_PUBLIC_APP_VERSION}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {isDev && <Construction className="text-orange-500" />}
          (v{process.env.NEXT_PUBLIC_APP_VERSION})
        </Link>
      </Badge>
    </div>
  );
};
