import * as React from "react";
import type * as RechartsPrimitive from "recharts";

import { cn } from "@/shared/lib/classes-utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

/**
 * Styled wrapper around a Recharts chart. Recharts is loaded lazily by the
 * caller (see `use-recharts-module`) and passed in via `recharts`, so this
 * shared component pulls in **no** static `recharts` import — the ~520 KB
 * vendor chunk only loads once a chart actually mounts. While the module is
 * still loading, children render without the responsive wrapper (callers gate
 * their chart subtree on the same module and render a placeholder meanwhile).
 */
function ChartContainer({
  id,
  className,
  children,
  config,
  recharts,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  recharts?: typeof RechartsPrimitive | null;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const ResponsiveContainer = recharts?.ResponsiveContainer;

  return (
    <div
      data-slot="chart"
      data-chart={chartId}
      className={cn(
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
        className,
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      {ResponsiveContainer ? (
        <ResponsiveContainer>{children}</ResponsiveContainer>
      ) : (
        children
      )}
    </div>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

export { ChartContainer, ChartStyle };
