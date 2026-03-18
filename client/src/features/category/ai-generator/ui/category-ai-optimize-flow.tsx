import { useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CategoryAiOptimizationMerge,
  CategoryAiOptimizationReassignment,
} from "shared";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import {
  useApplyCategoriesAiOptimization,
  useSuggestCategoriesAiOptimization,
} from "@/entities/category";
import { PlanFeatureLockCard } from "@/entities/billing";
import { AiQuotaBadge } from "@/shared/ui";
import { Sparkles, WandSparkles } from "lucide-react";
import * as m from "@/i18n/messages";
import { useCategoryAiWorkbench } from "../model/category-ai-workbench-context";
import {
  buildOptimizationApplyInput,
  summarizeOptimizationSelection,
  toggleOptimizationMergeEnabled,
  toggleOptimizationReassignmentEnabled,
} from "../model/optimization-state";
import { useLastGeneratedLabel } from "../model/use-last-generated-label";
import { CategoryAiOptimizationReassignmentItem } from "./category-ai-optimization-reassignment-item";
import { CategoryAiOptimizationMergeItem } from "./category-ai-optimization-merge-item";

export const CategoryAiOptimizeFlow = () => {
  const {
    usage,
    subscriptions,
    categories,
    subscriptionById,
    categoryById,
    isAiQuotaReached,
  } = useCategoryAiWorkbench();

  const [reassignments, setReassignments] = useState<
    CategoryAiOptimizationReassignment[]
  >([]);
  const [merges, setMerges] = useState<CategoryAiOptimizationMerge[]>([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [lastSourceCount, setLastSourceCount] = useState<number | null>(null);
  const [generatedQuota, setGeneratedQuota] = useState<{
    current: number;
    limit: number | null;
    remaining: number | null;
  } | null>(null);

  const suggestMutation = useSuggestCategoriesAiOptimization();
  const applyMutation = useApplyCategoriesAiOptimization();
  const lastGeneratedLabel = useLastGeneratedLabel(lastGeneratedAt);

  const aiQuota = usage?.aiInsights;
  const quotaForBadge = generatedQuota ?? aiQuota ?? null;

  const selectedSummary = useMemo(
    () => summarizeOptimizationSelection({ reassignments, merges }),
    [reassignments, merges],
  );

  const applyPayload = useMemo(
    () => buildOptimizationApplyInput({ reassignments, merges }),
    [reassignments, merges],
  );

  const hasSelectedActions =
    applyPayload.reassignments.length > 0 || applyPayload.merges.length > 0;

  const handleGenerate = async () => {
    if (isAiQuotaReached) {
      return;
    }

    try {
      const response = await suggestMutation.mutateAsync();
      setReassignments(response.reassignments);
      setMerges(response.merges);
      setLastGeneratedAt(response.generatedAt);
      setLastSourceCount(response.sourceCount);
      setGeneratedQuota({
        current: response.quota.current,
        limit: response.quota.limit,
        remaining: response.quota.remaining,
      });

      if (response.reassignments.length === 0 && response.merges.length === 0) {
        toast.message(m.categories_ai_optimize_generate_empty());
        return;
      }

      toast.success(m.categories_ai_optimize_generate_success());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  const handleApply = async () => {
    try {
      const response = await applyMutation.mutateAsync(applyPayload);
      setReassignments([]);
      setMerges([]);
      setGeneratedQuota({
        current: response.quota.current,
        limit: response.quota.limit,
        remaining: response.quota.remaining,
      });

      toast.success(
        m.categories_ai_optimize_apply_success({
          reassigned: String(response.reassignedCount),
          merged: String(response.mergedCount),
          deleted: String(response.deletedEmptyCategoriesCount),
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  const hasSourceData = subscriptions.length > 0;
  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-cyan-300/40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/12 via-emerald-400/10 to-transparent" />
        <CardHeader className="relative gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-cyan-400/40"
            >
              <Sparkles className="size-3.5" />
              {m.categories_ai_badge()}
            </Badge>
            {quotaForBadge && (
              <AiQuotaBadge
                usage={quotaForBadge}
                analyticsSource="category_ai_optimizer"
              />
            )}
          </div>
          <div>
            <CardTitle>{m.categories_ai_optimize_title()}</CardTitle>
            <CardDescription>
              {m.categories_ai_optimize_description()}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">
              {m.categories_ai_optimize_source_count({
                count: String(lastSourceCount ?? subscriptions.length),
              })}
            </Badge>
            {lastGeneratedLabel && (
              <span className="text-muted-foreground">
                {m.categories_ai_last_generated({
                  date: lastGeneratedLabel,
                })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative space-y-3">
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={
              suggestMutation.isPending ||
              !hasSourceData ||
              !hasCategories ||
              isAiQuotaReached
            }
            onClick={() => void handleGenerate()}
          >
            <WandSparkles className="size-4" />
            {suggestMutation.isPending
              ? m.categories_ai_optimize_generate_loading()
              : m.categories_ai_optimize_generate_action()}
          </Button>

          {isAiQuotaReached && (
            <PlanFeatureLockCard
              analyticsSource="category_ai"
              title={m.categories_ai_quota_title()}
              description={m.categories_ai_quota_description()}
            />
          )}

          {!hasSourceData && (
            <Alert>
              <AlertTitle>
                {m.categories_ai_optimize_no_source_title()}
              </AlertTitle>
              <AlertDescription>
                {m.categories_ai_optimize_no_source_description()}
              </AlertDescription>
            </Alert>
          )}

          {hasSourceData && !hasCategories && (
            <Alert>
              <AlertTitle>
                {m.categories_ai_optimize_no_categories_title()}
              </AlertTitle>
              <AlertDescription>
                {m.categories_ai_optimize_no_categories_description()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {(reassignments.length > 0 || merges.length > 0) && (
        <section className="space-y-4 rounded-2xl border p-4 sm:p-5">
          <div>
            <h3 className="text-base font-semibold">
              {m.categories_ai_optimize_preview_title()}
            </h3>
            <p className="text-muted-foreground text-sm">
              {m.categories_ai_optimize_preview_description()}
            </p>
          </div>

          <Alert>
            <AlertTitle>{m.categories_ai_optimize_summary_title()}</AlertTitle>
            <AlertDescription>
              {m.categories_ai_optimize_summary_description({
                reassignments: String(
                  selectedSummary.selectedReassignmentsCount,
                ),
                merges: String(selectedSummary.selectedMergesCount),
                affected: String(selectedSummary.selectedMergeAffectedCount),
              })}
            </AlertDescription>
          </Alert>

          {reassignments.length > 0 && (
            <section
              className="space-y-3"
              aria-label={m.categories_ai_optimize_reassignments_section()}
            >
              <h4 className="text-sm font-semibold">
                {m.categories_ai_optimize_reassignments_section()}
              </h4>
              <div className="space-y-2">
                {reassignments.map((reassignment, index) => (
                  <CategoryAiOptimizationReassignmentItem
                    key={reassignment.subscriptionId}
                    reassignment={reassignment}
                    index={index}
                    subscriptionById={subscriptionById}
                    categoryById={categoryById}
                    onEnabledChange={(subscriptionId, enabled) => {
                      setReassignments((prev) =>
                        toggleOptimizationReassignmentEnabled(
                          prev,
                          subscriptionId,
                          enabled,
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {merges.length > 0 && (
            <section
              className="space-y-3"
              aria-label={m.categories_ai_optimize_merges_section()}
            >
              <h4 className="text-sm font-semibold">
                {m.categories_ai_optimize_merges_section()}
              </h4>
              <div className="space-y-2">
                {merges.map((merge, index) => (
                  <CategoryAiOptimizationMergeItem
                    key={merge.sourceCategoryId}
                    merge={merge}
                    index={index}
                    categoryById={categoryById}
                    onEnabledChange={(sourceCategoryId, enabled) => {
                      setMerges((prev) =>
                        toggleOptimizationMergeEnabled(
                          prev,
                          sourceCategoryId,
                          enabled,
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={applyMutation.isPending || !hasSelectedActions}
            onClick={() => void handleApply()}
          >
            {applyMutation.isPending
              ? m.categories_ai_optimize_apply_loading()
              : m.categories_ai_optimize_apply_action()}
          </Button>
        </section>
      )}

      {lastGeneratedAt && reassignments.length === 0 && merges.length === 0 && (
        <Alert>
          <AlertTitle>{m.categories_ai_optimize_all_good_title()}</AlertTitle>
          <AlertDescription>
            {m.categories_ai_optimize_all_good_description()}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
