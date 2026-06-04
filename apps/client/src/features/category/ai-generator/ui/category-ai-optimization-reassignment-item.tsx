import type { CategoryAiOptimizationReassignment } from "@subeye/shared";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { BrandfetchImage } from "@/entities/brandfetch";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components";
import { SuggestionToggleButton } from "./suggestion-toggle-button";

type CategoryAiOptimizationReassignmentItemProps = {
  reassignment: CategoryAiOptimizationReassignment;
  index: number;
  subscriptionById: Map<
    string,
    {
      name: string;
      brandDomain: string | null;
      categoryId: string | null;
    }
  >;
  categoryById: Map<
    string,
    {
      name: string;
      emoji: string;
    }
  >;
  onEnabledChange: (subscriptionId: string, enabled: boolean) => void;
};

export const CategoryAiOptimizationReassignmentItem = ({
  reassignment,
  index,
  subscriptionById,
  categoryById,
  onEnabledChange,
}: CategoryAiOptimizationReassignmentItemProps) => {
  const subscription = subscriptionById.get(reassignment.subscriptionId);
  const fromCategory = reassignment.fromCategoryId
    ? categoryById.get(reassignment.fromCategoryId)
    : null;
  const toCategory = categoryById.get(reassignment.toCategoryId);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: reassignment.enabled ? 1 : 0.5, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        y: { type: "spring", stiffness: 400, damping: 28, delay: index * 0.04 },
      }}
      className="border-border relative rounded-xl border p-3"
    >
      <SuggestionToggleButton
        enabled={Boolean(reassignment.enabled)}
        onToggle={() =>
          onEnabledChange(reassignment.subscriptionId, !reassignment.enabled)
        }
        toggleLabel={m.categories_ai_optimize_include_reassignment_toggle()}
        tooltipText={m.categories_ai_optimize_include_reassignment_tooltip()}
      />

      <div className="pr-9">
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <BrandfetchImage
            domain={subscription?.brandDomain}
            className="size-5 rounded-sm"
            decorative
          />
          <p className="min-w-0 text-sm font-medium">
            {subscription?.name ?? reassignment.subscriptionId}
          </p>
          <Badge
            variant="secondary"
            className="h-auto max-w-full rounded-xl px-2 py-1 text-left text-xs leading-tight break-words whitespace-normal"
          >
            {reassignment.reason}
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span className="max-w-full rounded-full border px-2 py-0.5 text-xs break-words whitespace-normal">
            {fromCategory
              ? `${fromCategory.emoji} ${fromCategory.name}`
              : m.analytics_charts_categories_uncategorized()}
          </span>
          <ArrowRight className="size-3.5" />
          <span className="max-w-full rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-xs break-words whitespace-normal">
            {toCategory
              ? `${toCategory.emoji} ${toCategory.name}`
              : reassignment.toCategoryId}
          </span>
        </div>
      </div>
    </motion.article>
  );
};
