import * as React from "react";

import { cn } from "@/shared/lib/classes-utils";

function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    />
  );
}

export { ButtonGroup };
