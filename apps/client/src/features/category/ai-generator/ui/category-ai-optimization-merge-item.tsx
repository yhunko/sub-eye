import type { CategoryAiOptimizationMerge } from "@subeye/shared";
import { ArrowRight, Layers } from "lucide-react";
import { motion } from "motion/react";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components";
import { SuggestionToggleButton } from "./suggestion-toggle-button";

type CategoryAiOptimizationMergeItemProps = {
  merge: CategoryAiOptimizationMerge;
  index: number;
  categoryById: Map<
    string,
    {
      name: string;
      emoji: string;
    }
  >;
  onEnabledChange: (sourceCategoryId: string, enabled: boolean) => void;
};

export const CategoryAiOptimizationMergeItem = ({
  merge,
  index,
  categoryById,
  onEnabledChange,
}: CategoryAiOptimizationMergeItemProps) => {
  const sourceCategory = categoryById.get(merge.sourceCategoryId);
  const targetCategory = categoryById.get(merge.targetCategoryId);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: merge.enabled ? 1 : 0.5, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        y: { type: "spring", stiffness: 400, damping: 28, delay: index * 0.04 },
      }}
      className="border-border relative rounded-xl border p-3"
    >
      <SuggestionToggleButton
        enabled={Boolean(merge.enabled)}
        onToggle={() => onEnabledChange(merge.sourceCategoryId, !merge.enabled)}
        toggleLabel={m.categories_ai_optimize_include_merge_toggle()}
        tooltipText={m.categories_ai_optimize_include_merge_tooltip()}
      />

      <div className="pr-9">
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <Layers className="text-muted-foreground size-4" />
          <p className="min-w-0 text-sm font-medium">
            {m.categories_ai_optimize_merge_count({
              count: String(merge.affectedCount),
            })}
          </p>
          <Badge
            variant="secondary"
            className="h-auto max-w-full rounded-xl px-2 py-1 text-left text-xs leading-tight break-words whitespace-normal"
          >
            {merge.reason}
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span className="max-w-full rounded-full border px-2 py-0.5 text-xs break-words whitespace-normal">
            {sourceCategory
              ? `${sourceCategory.emoji} ${sourceCategory.name}`
              : merge.sourceCategoryId}
          </span>
          <ArrowRight className="size-3.5" />
          <span className="max-w-full rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-xs break-words whitespace-normal">
            {targetCategory
              ? `${targetCategory.emoji} ${targetCategory.name}`
              : merge.targetCategoryId}
          </span>
        </div>
      </div>
    </motion.article>
  );
};
