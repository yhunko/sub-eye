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

      {/* pb-20: Adds ~80px of padding to the bottom on mobile. This accounts for the navbar height (64px) + floating button offset + safe area. */}
      {/* md:pb-0: Resets this padding on desktop since the nav is sticky at the top. */}
      <main className="container my-2 pb-20 md:my-4 md:pb-0">{children}</main>
    </>
  );
};
