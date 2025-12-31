import { FC, PropsWithChildren, JSX } from "react";

type DashboardLayoutProps = {
  Navbar: JSX.Element;
};

export const DashboardLayout: FC<PropsWithChildren<DashboardLayoutProps>> = ({
  Navbar,
  children,
}) => {
  return (
    <>
      {Navbar}

      <main className="container my-2 md:my-4">{children}</main>
    </>
  );
};
