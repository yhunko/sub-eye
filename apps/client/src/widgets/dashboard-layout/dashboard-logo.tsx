import { Link } from "@tanstack/react-router";
import Logo from "@/shared/assets/logo.svg";

export const DashboardLogo = () => {
  // const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "production";

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Link
        to="/"
        className="group flex flex-col gap-0 md:flex-row md:items-center md:gap-2"
      >
        <img
          alt="logo"
          src={Logo}
          className="h-8 w-auto object-contain transition-transform duration-300 ease-in-out will-change-transform not-motion-reduce:group-hover:scale-110"
        />

        <span className="hidden text-sm font-semibold tracking-tight md:inline-block md:text-base">
          SubEye
        </span>
      </Link>
      {/*<Badge asChild variant="secondary">*/}
      {/*  <Link*/}
      {/*    href={`https://github.com/yhunko/sub-eye/releases/tag/v${process.env.NEXT_PUBLIC_APP_VERSION}`}*/}
      {/*    target="_blank"*/}
      {/*    rel="noopener noreferrer"*/}
      {/*    className="hover:underline"*/}
      {/*  >*/}
      {/*    {isDev && (*/}
      {/*      <Construction className="hidden text-orange-500 md:inline-block" />*/}
      {/*    )}*/}
      {/*    <span className="text-xs">*/}
      {/*      (v{process.env.NEXT_PUBLIC_APP_VERSION})*/}
      {/*    </span>*/}
      {/*  </Link>*/}
      {/*</Badge>*/}
    </div>
  );
};
