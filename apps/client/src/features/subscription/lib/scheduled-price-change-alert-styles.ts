export const scheduledPriceChangeAlertStyles = {
  container:
    "rounded-xl border border-amber-300/70 bg-amber-50/85 p-3 text-amber-950 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/12 dark:text-amber-100",
  headerRow: "w-full flex items-start justify-between gap-3",
  headingWrap: "flex min-w-0 items-start gap-2.5",
  iconBadge:
    "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-amber-500/45 bg-amber-100/60 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/15 dark:text-amber-200",
  title: "text-sm leading-tight font-semibold md:text-base",
  subtitle:
    "mt-1 text-xs text-amber-800/90 dark:text-amber-200/85 md:text-[13px]",
  iconButton:
    "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-amber-900 transition-colors hover:bg-amber-900/15 dark:bg-amber-50/10 dark:text-amber-100 dark:hover:bg-amber-50/20",
  panel:
    "mt-2 rounded-lg border border-amber-300/55 bg-background/85 p-2.5 dark:border-amber-300/25 dark:bg-zinc-950/65",
  comparisonHead:
    "text-[11px] tracking-[0.08em] uppercase text-zinc-500 dark:text-zinc-400",
  comparisonHeadAccent:
    "text-[11px] tracking-[0.08em] uppercase text-amber-700 dark:text-amber-300",
  comparisonCurrent:
    "inline-flex items-center gap-1 text-base font-semibold text-zinc-800 dark:text-zinc-100 [&_span]:!text-zinc-800 dark:[&_span]:!text-zinc-100",
  comparisonScheduled:
    "inline-flex items-center justify-end gap-1 text-right text-base font-semibold text-amber-700 dark:text-amber-300 [&_span]:!text-amber-700 dark:[&_span]:!text-amber-300",
  comparisonUnit: "text-sm text-zinc-600 dark:text-zinc-300",
  comparisonArrow: "size-4 text-zinc-400 dark:text-zinc-500",
} as const;
