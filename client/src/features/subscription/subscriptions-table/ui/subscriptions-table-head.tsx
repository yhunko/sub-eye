import * as react from "react";
import { FC, PropsWithChildren, MouseEventHandler } from "react";
import {
  LucideProps,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionTableHeadProps = {
  header: string;
  Icon?: react.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & react.RefAttributes<SVGSVGElement>
  >;
  sorted?: false | "asc" | "desc";
  onSort?: MouseEventHandler<HTMLButtonElement>;
};

export const SubscriptionTableHead: FC<
  PropsWithChildren<SubscriptionTableHeadProps>
> = ({ header, Icon, sorted, onSort }) => {
  const isSortable = typeof onSort === "function";

  const SortIcon =
    sorted === "asc"
      ? ChevronUp
      : sorted === "desc"
        ? ChevronDown
        : ChevronsUpDown;

  const sortLabel =
    sorted === "asc"
      ? `${header} (sorted ascending)`
      : sorted === "desc"
        ? `${header} (sorted descending)`
        : `${header} (click to sort)`;

  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        "flex flex-row items-center gap-1",
        "transition-colors duration-300 ease-in-out",
        "rounded-md px-2 py-1",
        isSortable
          ? "cursor-pointer select-none hover:bg-black/10"
          : "cursor-default bg-transparent",
      )}
      aria-label={isSortable ? sortLabel : header}
    >
      {Icon && <Icon className="text-muted-foreground" size={16} />}
      <span>{header}</span>
      {isSortable && (
        <SortIcon className="text-muted-foreground ml-1" size={14} />
      )}
    </button>
  );
};
