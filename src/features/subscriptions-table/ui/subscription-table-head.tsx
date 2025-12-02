import * as react from "react";
import { FC, PropsWithChildren } from "react";
import { LucideProps } from "lucide-react";

type SubscriptionTableHeadProps = {
  header: string;
  Icon?: react.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & react.RefAttributes<SVGSVGElement>
  >;
};

export const SubscriptionTableHead: FC<
  PropsWithChildren<SubscriptionTableHeadProps>
> = ({ header, Icon }) => {
  return (
    <div className="flex flex-row items-center gap-1">
      {Icon && <Icon className="text-muted-foreground" size={16} />}
      <span>{header}</span>
    </div>
  );
};
