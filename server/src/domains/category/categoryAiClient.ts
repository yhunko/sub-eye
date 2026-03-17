import {
  array,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  parse,
  pipe,
  string,
} from "valibot";
import { COMPARATOR_AI_MODEL, CATEGORY_EMOJIS } from "shared";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const GEMINI_REQUEST_TIMEOUT_MS = 45_000;

const GeneratedCategorySchema = object({
  name: pipe(string(), minLength(1)),
  emoji: pipe(string(), minLength(1)),
  subscriptionIds: array(pipe(string(), minLength(1))),
});

const GeneratedCategoriesSchema = array(GeneratedCategorySchema);

const OptimizationReassignmentSchema = object({
  subscriptionId: pipe(string(), minLength(1)),
  toCategoryId: pipe(string(), minLength(1)),
  reason: pipe(string(), minLength(1)),
  targetFit: pipe(number(), minValue(0), maxValue(1)),
  sourceFit: nullable(pipe(number(), minValue(0), maxValue(1))),
});

const OptimizationMergeSchema = object({
  sourceCategoryId: pipe(string(), minLength(1)),
  targetCategoryId: pipe(string(), minLength(1)),
  reason: pipe(string(), minLength(1)),
});

const OptimizationSuggestionsSchema = object({
  reassignments: array(OptimizationReassignmentSchema),
  merges: array(OptimizationMergeSchema),
});

const normalizeModelJson = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

type CategoryAiInput = {
  locale: string;
  subscriptions: Array<{
    id: string;
    name: string;
    brandDomain: string | null;
  }>;
};

type CategoryAiOptimizationInput = {
  locale: string;
  categories: Array<{
    id: string;
    name: string;
    emoji: string;
  }>;
  subscriptions: Array<{
    id: string;
    name: string;
    brandDomain: string | null;
    categoryId: string | null;
  }>;
};

type GeneratedCategory = {
  name: string;
  emoji: string;
  subscriptionIds: string[];
};

type OptimizationSuggestion = {
  reassignments: Array<{
    subscriptionId: string;
    toCategoryId: string;
    reason: string;
    targetFit: number;
    sourceFit: number | null;
  }>;
  merges: Array<{
    sourceCategoryId: string;
    targetCategoryId: string;
    reason: string;
  }>;
};

const resolveLocaleRule = (locale: string): string => {
  const normalized = locale.trim().toLowerCase();

  if (normalized.startsWith("uk")) {
    return "Write every category name in Ukrainian using Cyrillic script only.";
  }

  if (normalized.startsWith("en")) {
    return "Write every category name in English.";
  }

  return `Write every category name in locale "${locale}".`;
};

export class CategoryAiClient {
  private static getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    return apiKey;
  }

  private static async generateModelJson(prompt: string): Promise<unknown> {
    const apiKey = this.getApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, GEMINI_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${COMPARATOR_AI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
            },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("aborted"))
      ) {
        throw new Error(
          "Category AI request timed out. Please retry in a few seconds.",
        );
      }

      throw new Error(
        `Category AI request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Category AI provider error (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const modelText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();

    if (!modelText) {
      throw new Error("Gemini response is empty");
    }

    try {
      return JSON.parse(normalizeModelJson(modelText)) as unknown;
    } catch {
      throw new Error(
        "Category AI returned an invalid response. Please try generating again.",
      );
    }
  }

  static async generateCategorySuggestions(
    input: CategoryAiInput,
  ): Promise<GeneratedCategory[]> {
    const allowedEmojis = CATEGORY_EMOJIS.join(" ");
    const prompt = [
      "You organize subscription names into category suggestions.",
      "Return strict JSON array only (no markdown, no prose).",
      "Use only provided subscription ids.",
      "Each subscription id must appear in at most one suggested category.",
      "Prefer 3-8 broad categories and avoid niche duplicates.",
      "Category names must be short (1-3 words).",
      "Category names are generic labels, not product names.",
      "Use exactly one emoji from the allowed list for each category.",
      resolveLocaleRule(input.locale),
      "Do not mix languages in category names.",
      `Allowed emojis: ${allowedEmojis}`,
      `Locale: ${input.locale}`,
      "",
      "Input subscriptions:",
      JSON.stringify(input.subscriptions, null, 2),
      "",
      "Output format:",
      '[{"name":"Entertainment","emoji":"🎬","subscriptionIds":["sub_1","sub_3"]}]',
    ].join("\n");

    const parsedJson = await this.generateModelJson(prompt);
    return parse(GeneratedCategoriesSchema, parsedJson);
  }

  static async generateCategoryOptimization(
    input: CategoryAiOptimizationInput,
  ): Promise<OptimizationSuggestion> {
    const prompt = [
      "You optimize existing subscription categories.",
      "Return strict JSON object only (no markdown, no prose).",
      "Rules:",
      "- Use only provided subscription ids and category ids.",
      "- Keep one best category per subscription.",
      "- Reassign only when target category is clearly better.",
      "- Never force a subscription into a weakly related category.",
      "- Respect semantic boundaries inferred from provided data.",
      "- For each reassignment, output targetFit and sourceFit in range 0..1.",
      "- targetFit = how well target category matches subscription/domain.",
      "- sourceFit = how well current category matches; use null if uncategorized.",
      "- For categorized subscriptions, include reassignment only when targetFit is meaningfully higher than sourceFit.",
      "- Propose merges only for duplicate/overlapping categories.",
      "- For merges, keep the stronger existing category as target.",
      "- Avoid noisy changes; prioritize high-confidence cleanups.",
      "- Keep reason short (max 12 words).",
      resolveLocaleRule(input.locale),
      "Do not mix languages in reason text.",
      `Locale: ${input.locale}`,
      "",
      "Input categories:",
      JSON.stringify(input.categories, null, 2),
      "",
      "Input subscriptions:",
      JSON.stringify(input.subscriptions, null, 2),
      "",
      "Output format:",
      '{"reassignments":[{"subscriptionId":"sub_1","toCategoryId":"cat_2","reason":"Better match for streaming media","targetFit":0.86,"sourceFit":0.41}],"merges":[{"sourceCategoryId":"cat_old","targetCategoryId":"cat_main","reason":"Both represent the same spending domain"}]}',
    ].join("\n");

    const parsedJson = await this.generateModelJson(prompt);
    return parse(OptimizationSuggestionsSchema, parsedJson);
  }
}
