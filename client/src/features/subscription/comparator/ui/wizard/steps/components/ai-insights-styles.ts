import {
  type LucideProps,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { FC } from "react";
import type { ComparatorAiRiskDto } from "shared";
import type {
  MaturityLevel,
  PriceSignificanceLevel,
  RecommendationDecision,
} from "./ai-insights-labels";

export const DECISION_STYLES: Record<
  RecommendationDecision,
  { banner: string; text: string; icon: FC<LucideProps> }
> = {
  switch: {
    banner:
      "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/10 dark:border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: TrendingDown,
  },
  keep: {
    banner:
      "bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: TrendingUp,
  },
  trial_first: {
    banner:
      "bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/10 dark:border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: Sparkles,
  },
  depends: {
    banner:
      "bg-slate-500/10 border-slate-400/30 dark:bg-slate-500/10 dark:border-slate-400/30",
    text: "text-slate-600 dark:text-slate-400",
    icon: Minus,
  },
};

export const PRICE_LEVEL_STYLES: Record<PriceSignificanceLevel, string> = {
  negligible: "bg-muted text-muted-foreground",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  material: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const RISK_SEVERITY_STYLES: Record<
  ComparatorAiRiskDto["severity"],
  { row: string; icon: string; badge: string }
> = {
  high: {
    row: "bg-red-500/8 border border-red-500/20",
    icon: "text-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  medium: {
    row: "bg-amber-500/8 border border-amber-500/20",
    icon: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  low: {
    row: "bg-muted/40 border border-border/50",
    icon: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

export const SEVERITY_ORDER: Record<ComparatorAiRiskDto["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const MATURITY_STYLES: Record<MaturityLevel, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
};

export const getMaturityTextColor = (level: MaturityLevel): string =>
  MATURITY_STYLES[level] ?? MATURITY_STYLES.unknown;
