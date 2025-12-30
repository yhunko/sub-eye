import { FC, PropsWithChildren, JSX } from "react";

type DashboardLayoutProps = {
  Navbar: JSX.Element;
};

export const DashboardLayout: FC<PropsWithChildren<DashboardLayoutProps>> = ({
  Navbar,
  children,
}) => {
  return (
    <div className="flex flex-col gap-2 md:gap-4">
      {Navbar}

      <main className="container">{children}</main>
    </div>
  );
};
