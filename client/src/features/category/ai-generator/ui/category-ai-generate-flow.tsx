import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { CategoryAiSuggestion } from "shared";
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
  useApplyCategoriesAi,
  useSuggestCategoriesAi,
} from "@/entities/category";
import { AiQuotaBadge } from "@/shared/ui";
import { PlanFeatureLockCard } from "@/entities/billing";
import { WandSparkles } from "lucide-react";
import * as m from "@/i18n/messages";
import {
  hasDuplicateEnabledSuggestions,
  toggleSuggestionEnabled,
  toggleSuggestionSubscriptionAssignment,
  updateSuggestionEmoji,
  updateSuggestionName,
} from "../model/suggestions-state";
import { useCategoryAiWorkbench } from "../model/category-ai-workbench-context";
import { CategoryAiSuggestionItem } from "./category-ai-suggestion-item";

export const CategoryAiGenerateFlow = () => {
  const {
    uncategorizedCount,
    usage,
    existingCategoryNames,
    subscriptionById,
    isAiQuotaReached,
  } = useCategoryAiWorkbench();

  const [suggestions, setSuggestions] = useState<CategoryAiSuggestion[]>([]);
  const [assignmentOptionsByDraftId, setAssignmentOptionsByDraftId] = useState<
    Record<string, string[]>
  >({});
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [generatedQuota, setGeneratedQuota] = useState<{
    current: number;
    limit: number | null;
    remaining: number | null;
  } | null>(null);

  const suggestMutation = useSuggestCategoriesAi();
  const applyMutation = useApplyCategoriesAi();

  const aiQuota = usage?.aiInsights;
  const quotaForBadge = generatedQuota ?? aiQuota ?? null;

  const enabledSuggestions = suggestions.filter(
    (suggestion) => suggestion.enabled,
  );

  const hasDuplicateSuggestions = useMemo(
    () => hasDuplicateEnabledSuggestions(suggestions, existingCategoryNames),
    [suggestions, existingCategoryNames],
  );

  const handleGenerate = async () => {
    if (isAiQuotaReached) {
      return;
    }

    try {
      const response = await suggestMutation.mutateAsync();
      setSuggestions(response.suggestions);
      setAssignmentOptionsByDraftId(
        Object.fromEntries(
          response.suggestions.map((suggestion) => [
            suggestion.draftId,
            suggestion.subscriptionIds,
          ]),
        ),
      );
      setLastGeneratedAt(response.generatedAt);
      setGeneratedQuota({
        current: response.quota.current,
        limit: response.quota.limit,
        remaining: response.quota.remaining,
      });

      if (response.suggestions.length === 0) {
        toast.message(m.categories_ai_generate_empty());
        return;
      }

      toast.success(m.categories_ai_generate_success());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  const handleApply = async () => {
    try {
      const response = await applyMutation.mutateAsync({ suggestions });
      setSuggestions([]);
      setAssignmentOptionsByDraftId({});
      setGeneratedQuota({
        current: response.quota.current,
        limit: response.quota.limit,
        remaining: response.quota.remaining,
      });

      toast.success(
        m.categories_ai_apply_success({
          created: String(response.createdCount),
          assigned: String(response.assignedCount),
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-cyan-300/40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/12 via-emerald-400/10 to-transparent" />
        <CardHeader className="relative gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="bg-background/85 text-foreground rounded-full border-cyan-300/55 shadow-sm backdrop-blur-sm"
            >
              {m.categories_ai_source_count({
                count: String(uncategorizedCount),
              })}
            </Badge>
            {quotaForBadge && (
              <AiQuotaBadge
                usage={quotaForBadge}
                analyticsSource="category_ai_generator"
              />
            )}
          </div>
          <div>
            <CardTitle>{m.categories_ai_title()}</CardTitle>
            <CardDescription>{m.categories_ai_description()}</CardDescription>
          </div>
          {lastGeneratedAt && (
            <div className="text-muted-foreground text-xs">
              {m.categories_ai_last_generated({
                date: new Date(lastGeneratedAt).toLocaleString(),
              })}
            </div>
          )}
        </CardHeader>
        <CardContent className="relative space-y-3">
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={
              suggestMutation.isPending ||
              uncategorizedCount === 0 ||
              isAiQuotaReached
            }
            onClick={() => void handleGenerate()}
          >
            <WandSparkles className="size-4" />
            {suggestMutation.isPending
              ? m.categories_ai_generate_loading()
              : m.categories_ai_generate_action()}
          </Button>

          {isAiQuotaReached && (
            <PlanFeatureLockCard
              analyticsSource="category_ai"
              title={m.categories_ai_quota_title()}
              description={m.categories_ai_quota_description()}
            />
          )}

          {uncategorizedCount === 0 && (
            <Alert>
              <AlertTitle>{m.categories_ai_no_source_title()}</AlertTitle>
              <AlertDescription>
                {m.categories_ai_no_source_description()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <section className="space-y-4 rounded-2xl border p-4 sm:p-5">
          <div>
            <h3 className="text-base font-semibold">
              {m.categories_ai_preview_title()}
            </h3>
            <p className="text-muted-foreground text-sm">
              {m.categories_ai_preview_description()}
            </p>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const assignmentOptions =
                assignmentOptionsByDraftId[suggestion.draftId] ??
                suggestion.subscriptionIds;

              return (
                <CategoryAiSuggestionItem
                  key={suggestion.draftId}
                  index={index}
                  suggestion={suggestion}
                  assignmentOptions={assignmentOptions}
                  subscriptionById={subscriptionById}
                  onEnabledChange={(draftId, next) => {
                    setSuggestions((prev) =>
                      toggleSuggestionEnabled(prev, draftId, next),
                    );
                  }}
                  onEmojiChange={(draftId, emoji) => {
                    setSuggestions((prev) =>
                      updateSuggestionEmoji(prev, draftId, emoji),
                    );
                  }}
                  onNameChange={(draftId, name) => {
                    setSuggestions((prev) =>
                      updateSuggestionName(prev, draftId, name),
                    );
                  }}
                  onAssignmentChange={(draftId, subscriptionId, next) => {
                    setSuggestions((prev) =>
                      toggleSuggestionSubscriptionAssignment(
                        prev,
                        draftId,
                        subscriptionId,
                        next,
                      ),
                    );
                  }}
                />
              );
            })}
          </div>

          {hasDuplicateSuggestions && (
            <Alert variant="destructive">
              <AlertTitle>{m.categories_ai_duplicates_title()}</AlertTitle>
              <AlertDescription>
                {m.categories_ai_duplicates_description()}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={
              applyMutation.isPending ||
              enabledSuggestions.length === 0 ||
              hasDuplicateSuggestions
            }
            onClick={() => void handleApply()}
          >
            {applyMutation.isPending
              ? m.categories_ai_apply_loading()
              : m.categories_ai_apply_action()}
          </Button>
        </section>
      )}
    </div>
  );
};
