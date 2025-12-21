import Link from "next/link";

export const DashboardLogo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold">
        SE
      </span>
      <div className="flex flex-col gap-0 md:flex-row md:items-center md:gap-2">
        <span className="text-sm font-semibold tracking-tight md:text-base">
          SubEye
        </span>
        <span className="text-accent-foreground text-xs">
          (v{process.env.NEXT_PUBLIC_APP_VERSION})
        </span>
      </div>
    </Link>
  );
};
