import {
  array,
  boolean,
  check,
  type InferOutput,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  strictObject,
  string,
  transform,
} from "valibot";

export const CategoryDtoSchema = object({
  id: string(),
  userId: string(),
  name: string(),
  emoji: string(),
  createdAt: string(),
  updatedAt: string(),
});

type CategoryEmojiGroup = {
  label: string;
  emojis: readonly string[];
};

export const CATEGORY_EMOJI_GROUPS: readonly CategoryEmojiGroup[] = [
  {
    label: "⭐",
    emojis: [
      "🎮",
      "📦",
      "🔒",
      "📚",
      "🔔",
      "💬",
      "🌐",
      "⚡",
      "🗓️",
      "🤖",
      "🎁",
      "🛍️",
    ],
  },
  {
    label: "🎭",
    emojis: [
      "🎬",
      "📺",
      "🎵",
      "🎶",
      "🎸",
      "🎹",
      "🎤",
      "🎧",
      "🕹️",
      "📻",
      "🎭",
      "🎨",
    ],
  },
  {
    label: "💻",
    emojis: ["💻", "📱", "🖥️", "⌨️", "🖱️", "📡", "☁️", "🔌", "📷", "🔋", "💾", "🖨️"],
  },
  {
    label: "💰",
    emojis: [
      "💳",
      "💰",
      "💵",
      "🏦",
      "📈",
      "📊",
      "💹",
      "🪙",
      "💸",
      "🏧",
      "📉",
      "💱",
    ],
  },
  {
    label: "💪",
    emojis: [
      "🏋️",
      "🧘",
      "🚴",
      "🏊",
      "❤️",
      "💊",
      "🏥",
      "🦷",
      "🧴",
      "🥗",
      "🏃",
      "🤸",
    ],
  },
  {
    label: "🍕",
    emojis: [
      "☕",
      "🍵",
      "🧃",
      "🍕",
      "🍔",
      "🥡",
      "🍱",
      "🧁",
      "🍷",
      "🥤",
      "🧋",
      "🍣",
    ],
  },
  {
    label: "✈️",
    emojis: [
      "✈️",
      "🚗",
      "🚕",
      "🚌",
      "🚂",
      "🚢",
      "🏨",
      "🗺️",
      "🌍",
      "🏕️",
      "🛳️",
      "🚁",
    ],
  },
  {
    label: "🏠",
    emojis: [
      "🏠",
      "🛋️",
      "🛏️",
      "🪴",
      "🔑",
      "💡",
      "🧹",
      "🔧",
      "🛒",
      "🧺",
      "🪣",
      "🔨",
    ],
  },
  {
    label: "📚",
    emojis: [
      "💼",
      "📋",
      "📝",
      "✏️",
      "🗃️",
      "🗂️",
      "📌",
      "📧",
      "📰",
      "🖊️",
      "🎓",
      "🔬",
    ],
  },
  {
    label: "😀",
    emojis: [
      "😀",
      "😎",
      "🤩",
      "🥳",
      "🤓",
      "😍",
      "🤗",
      "🙂",
      "😊",
      "🎯",
      "⭐",
      "🔥",
    ],
  },
];

export const CATEGORY_EMOJIS: readonly string[] = CATEGORY_EMOJI_GROUPS.flatMap(
  (group) => group.emojis,
);

const CATEGORY_EMOJI_SET = new Set(CATEGORY_EMOJIS);
export const DEFAULT_CATEGORY_EMOJI = "📦";

const categoryEmojiSchema = pipe(
  string(),
  minLength(1),
  check(
    (value) => CATEGORY_EMOJI_SET.has(value),
    "Emoji must be from allowed category set",
  ),
);

export const CreateCategorySchema = object({
  name: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  emoji: categoryEmojiSchema,
});

export const UpdateCategorySchema = object({
  name: optional(
    pipe(
      string(),
      transform((v) => v.trim()),
      minLength(1),
    ),
  ),
  emoji: optional(categoryEmojiSchema),
});

export const DeleteCategoriesInputSchema = strictObject({
  ids: pipe(
    array(
      pipe(
        string(),
        transform((v) => v.trim()),
        minLength(1),
      ),
    ),
    minLength(1),
  ),
});

export const DeleteCategoriesResponseSchema = strictObject({
  deletedCount: pipe(
    number(),
    check((value) => Number.isFinite(value) && value >= 0),
  ),
});

export const CategoryAiSuggestionSchema = strictObject({
  draftId: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  name: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
    maxLength(64),
  ),
  emoji: categoryEmojiSchema,
  subscriptionIds: array(
    pipe(
      string(),
      transform((v) => v.trim()),
      minLength(1),
    ),
  ),
  enabled: optional(boolean(), true),
});

export const AiUsageQuotaSchema = strictObject({
  current: number(),
  limit: nullable(number()),
  remaining: nullable(number()),
  periodKey: string(),
  resetsAt: string(),
  isLimited: boolean(),
});

export const CategoryAiSuggestResponseSchema = strictObject({
  model: string(),
  sourceCount: number(),
  generatedAt: string(),
  quota: AiUsageQuotaSchema,
  suggestions: array(CategoryAiSuggestionSchema),
});

export const CategoryAiApplyInputSchema = strictObject({
  suggestions: array(CategoryAiSuggestionSchema),
});

export const CategoryAiApplyResponseSchema = strictObject({
  createdCount: number(),
  assignedCount: number(),
  skippedExistingCount: number(),
  quota: AiUsageQuotaSchema,
});

export const CategoryAiOptimizationReassignmentSchema = strictObject({
  subscriptionId: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  fromCategoryId: nullable(
    pipe(
      string(),
      transform((v) => v.trim()),
      minLength(1),
    ),
  ),
  toCategoryId: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  reason: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
    maxLength(140),
  ),
  enabled: optional(boolean(), true),
});

export const CategoryAiOptimizationMergeSchema = strictObject({
  sourceCategoryId: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  targetCategoryId: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  affectedCount: pipe(
    number(),
    check((value) => Number.isFinite(value) && value >= 0),
  ),
  reason: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
    maxLength(140),
  ),
  enabled: optional(boolean(), true),
});

export const CategoryAiOptimizeSuggestResponseSchema = strictObject({
  model: string(),
  sourceCount: number(),
  generatedAt: string(),
  quota: AiUsageQuotaSchema,
  reassignments: array(CategoryAiOptimizationReassignmentSchema),
  merges: array(CategoryAiOptimizationMergeSchema),
});

export const CategoryAiOptimizeApplyInputSchema = strictObject({
  reassignments: array(CategoryAiOptimizationReassignmentSchema),
  merges: array(CategoryAiOptimizationMergeSchema),
});

export const CategoryAiOptimizeApplyResponseSchema = strictObject({
  reassignedCount: number(),
  mergedCount: number(),
  deletedEmptyCategoriesCount: number(),
  quota: AiUsageQuotaSchema,
});

export type CategoryDto = InferOutput<typeof CategoryDtoSchema>;
export type CreateCategoryInput = InferOutput<typeof CreateCategorySchema>;
export type UpdateCategoryInput = InferOutput<typeof UpdateCategorySchema>;
export type DeleteCategoriesInput = InferOutput<
  typeof DeleteCategoriesInputSchema
>;
export type DeleteCategoriesResponse = InferOutput<
  typeof DeleteCategoriesResponseSchema
>;
export type CategoryAiSuggestion = InferOutput<
  typeof CategoryAiSuggestionSchema
>;
export type AiUsageQuota = InferOutput<typeof AiUsageQuotaSchema>;
export type CategoryAiSuggestResponse = InferOutput<
  typeof CategoryAiSuggestResponseSchema
>;
export type CategoryAiApplyInput = InferOutput<
  typeof CategoryAiApplyInputSchema
>;
export type CategoryAiApplyResponse = InferOutput<
  typeof CategoryAiApplyResponseSchema
>;
export type CategoryAiOptimizationReassignment = InferOutput<
  typeof CategoryAiOptimizationReassignmentSchema
>;
export type CategoryAiOptimizationMerge = InferOutput<
  typeof CategoryAiOptimizationMergeSchema
>;
export type CategoryAiOptimizeSuggestResponse = InferOutput<
  typeof CategoryAiOptimizeSuggestResponseSchema
>;
export type CategoryAiOptimizeApplyInput = InferOutput<
  typeof CategoryAiOptimizeApplyInputSchema
>;
export type CategoryAiOptimizeApplyResponse = InferOutput<
  typeof CategoryAiOptimizeApplyResponseSchema
>;

export const categoryIdSchema = optional(
  nullable(pipe(string(), minLength(1))),
);
