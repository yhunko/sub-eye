import {
  array,
  check,
  type InferOutput,
  minLength,
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

const CATEGORY_EMOJI_GROUPS: readonly CategoryEmojiGroup[] = [
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

const CATEGORY_EMOJIS: readonly string[] = CATEGORY_EMOJI_GROUPS.flatMap(
  (group) => group.emojis,
);

const CATEGORY_EMOJI_SET = new Set(CATEGORY_EMOJIS);

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

export type CategoryDto = InferOutput<typeof CategoryDtoSchema>;
export type CreateCategoryInput = InferOutput<typeof CreateCategorySchema>;
export type UpdateCategoryInput = InferOutput<typeof UpdateCategorySchema>;
export type DeleteCategoriesResponse = InferOutput<
  typeof DeleteCategoriesResponseSchema
>;
