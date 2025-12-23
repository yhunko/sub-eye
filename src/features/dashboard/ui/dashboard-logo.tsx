import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/components";
import { Construction } from "lucide-react";

export const DashboardLogo = () => {
  const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "production";

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Link
        href="/"
        className="group flex flex-col gap-0 md:flex-row md:items-center md:gap-2"
      >
        <div className="relative size-6 md:size-8">
          <Image
            src="/logo.svg"
            alt="app logo"
            priority
            fill
            className="transition-transform duration-300 ease-in-out will-change-transform not-motion-reduce:group-hover:scale-110"
          />
        </div>

        <span className="hidden text-sm font-semibold tracking-tight md:inline-block md:text-base">
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
          {isDev && (
            <Construction className="hidden text-orange-500 md:inline-block" />
          )}
          <span className="text-xs">
            (v{process.env.NEXT_PUBLIC_APP_VERSION})
          </span>
        </Link>
      </Badge>
    </div>
  );
};
