import { FC, PropsWithChildren } from "react";

export const AnalyticsWidget: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 gap-2 md:gap-4 lg:grid-cols-2">
      {children}
    </div>
  );
};
