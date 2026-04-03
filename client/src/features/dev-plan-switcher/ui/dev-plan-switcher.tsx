import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Minimize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { billingQueryKeys } from "@/entities/billing";
import { subscriptionsQueryKeys } from "@/entities/subscription";
import { Button, Card, CardContent } from "@/shared/components";
import {
  type LocalPlanOverride,
  type LocalPlanSwitcherUiState,
  readLocalPlanOverride,
  readLocalPlanSwitcherUiState,
  subscribeLocalPlanOverride,
  subscribeLocalPlanSwitcherUiState,
  writeLocalPlanOverride,
  writeLocalPlanSwitcherUiState,
} from "@/shared/lib/billing/local-plan-override";

const PLAN_OPTIONS: ReadonlyArray<{ label: string; value: LocalPlanOverride }> =
  [
    { label: "Use real", value: null },
    { label: "Force free", value: "free" },
    { label: "Force plus", value: "plus" },
  ];

const getActiveLabel = (override: LocalPlanOverride): string => {
  if (override === null) {
    return "real";
  }

  return override;
};

export const DevPlanSwitcher = () => {
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<LocalPlanOverride>(() =>
    readLocalPlanOverride(),
  );
  const [uiState, setUiState] = useState<LocalPlanSwitcherUiState>(() =>
    readLocalPlanSwitcherUiState(),
  );

  useEffect(() => {
    return subscribeLocalPlanOverride(() => {
      setOverride(readLocalPlanOverride());
    });
  }, []);

  useEffect(() => {
    return subscribeLocalPlanSwitcherUiState(() => {
      setUiState(readLocalPlanSwitcherUiState());
    });
  }, []);

  const handleSelect = (nextValue: LocalPlanOverride) => {
    writeLocalPlanOverride(nextValue);

    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      }),
      queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.history._def,
      }),
    ]);
  };

  const handleUiStateChange = (nextState: LocalPlanSwitcherUiState) => {
    writeLocalPlanSwitcherUiState(nextState);
  };

  if (uiState === "hidden") {
    return (
      <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-background/95 supports-[backdrop-filter]:bg-background/80 h-8 rounded-full px-3 text-xs shadow-md backdrop-blur"
          onClick={() => handleUiStateChange("open")}
        >
          Plan Switcher
        </Button>
      </div>
    );
  }

  if (uiState === "minimized") {
    return (
      <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 w-[min(16rem,calc(100vw-2rem))]">
        <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-amber-500/50 shadow-lg backdrop-blur">
          <CardContent className="flex items-center justify-between gap-2 p-2.5">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Plan: {getActiveLabel(override)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => handleUiStateChange("open")}
                aria-label="Expand plan switcher"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => handleUiStateChange("hidden")}
                aria-label="Hide plan switcher"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 w-[min(22rem,calc(100vw-2rem))]">
      <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-amber-500/50 shadow-lg backdrop-blur">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold tracking-wide uppercase">
                Local Plan Switcher
              </p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                {getActiveLabel(override)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => handleUiStateChange("minimized")}
                aria-label="Minimize plan switcher"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => handleUiStateChange("hidden")}
                aria-label="Hide plan switcher"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Local-only visual override. Server entitlement checks stay
            unchanged.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {PLAN_OPTIONS.map((option) => {
              const isActive = override === option.value;

              return (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => handleSelect(option.value)}
                  className="text-[11px]"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
