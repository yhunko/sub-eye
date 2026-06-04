import type { CategoryAiSuggestion } from "@subeye/shared";

export const normalizeCategoryName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const mapSuggestion = (
  suggestions: CategoryAiSuggestion[],
  draftId: string,
  updater: (suggestion: CategoryAiSuggestion) => CategoryAiSuggestion,
): CategoryAiSuggestion[] =>
  suggestions.map((suggestion) =>
    suggestion.draftId === draftId ? updater(suggestion) : suggestion,
  );

export const toggleSuggestionEnabled = (
  suggestions: CategoryAiSuggestion[],
  draftId: string,
  enabled: boolean,
): CategoryAiSuggestion[] =>
  mapSuggestion(suggestions, draftId, (suggestion) => ({
    ...suggestion,
    enabled,
  }));

export const updateSuggestionName = (
  suggestions: CategoryAiSuggestion[],
  draftId: string,
  name: string,
): CategoryAiSuggestion[] =>
  mapSuggestion(suggestions, draftId, (suggestion) => ({
    ...suggestion,
    name,
  }));

export const updateSuggestionEmoji = (
  suggestions: CategoryAiSuggestion[],
  draftId: string,
  emoji: string,
): CategoryAiSuggestion[] =>
  mapSuggestion(suggestions, draftId, (suggestion) => ({
    ...suggestion,
    emoji,
  }));

export const toggleSuggestionSubscriptionAssignment = (
  suggestions: CategoryAiSuggestion[],
  draftId: string,
  subscriptionId: string,
  assigned: boolean,
): CategoryAiSuggestion[] =>
  mapSuggestion(suggestions, draftId, (suggestion) => {
    const hasSubscription = suggestion.subscriptionIds.includes(subscriptionId);

    if (assigned && !hasSubscription) {
      return {
        ...suggestion,
        subscriptionIds: [...suggestion.subscriptionIds, subscriptionId],
      };
    }

    if (!assigned && hasSubscription) {
      return {
        ...suggestion,
        subscriptionIds: suggestion.subscriptionIds.filter(
          (id) => id !== subscriptionId,
        ),
      };
    }

    return suggestion;
  });

export const hasDuplicateEnabledSuggestions = (
  suggestions: CategoryAiSuggestion[],
  existingCategoryNames: Set<string>,
): boolean => {
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    if (!suggestion.enabled) {
      continue;
    }

    const normalized = normalizeCategoryName(suggestion.name);
    if (!normalized) {
      continue;
    }

    if (existingCategoryNames.has(normalized) || seen.has(normalized)) {
      return true;
    }

    seen.add(normalized);
  }

  return false;
};
