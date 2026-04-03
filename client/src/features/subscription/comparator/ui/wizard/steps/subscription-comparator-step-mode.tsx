import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import type { CompareMode } from "../subscription-comparator-wizard.types";

type SubscriptionComparatorStepModeProps = {
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
};

const SubscriptionComparatorStepMode: FC<
  SubscriptionComparatorStepModeProps
> = ({ mode, onModeChange }) => {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{m.comparator_mode_title()}</CardTitle>
        <CardDescription>{m.comparator_mode_description()}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          className={cn(
            "rounded-xl border p-4 text-left transition",
            mode === "existingVsManual"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
          onClick={() => onModeChange("existingVsManual")}
        >
          <p className="font-medium">{m.comparator_mode_existing_title()}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.comparator_mode_existing_description()}
          </p>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-xl border p-4 text-left transition",
            mode === "existingVsExisting"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
          onClick={() => onModeChange("existingVsExisting")}
        >
          <p className="font-medium">
            {m.comparator_mode_existing_existing_title()}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.comparator_mode_existing_existing_description()}
          </p>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-xl border p-4 text-left transition",
            mode === "manualVsManual"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
          onClick={() => onModeChange("manualVsManual")}
        >
          <p className="font-medium">{m.comparator_mode_manual_title()}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.comparator_mode_manual_description()}
          </p>
        </button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionComparatorStepMode;
