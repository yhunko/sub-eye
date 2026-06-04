import {
  generateContent,
  normalizeCitations,
  normalizeModelJson,
} from "@subeye/ai";
import {
  COMPARATOR_AI_MODEL,
  type ComparatorAiInsightsDto,
  ComparatorAiInsightsDtoSchema,
} from "@subeye/shared";
import { parse } from "valibot";

export type ComparatorAiGenerateOptions = {
  model?: string;
};

export const normalizeAiInsightsPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const { nextActions: _nextActions, ...rest } = payload as Record<
    string,
    unknown
  >;

  return rest;
};

export class ComparatorAiClient {
  static async generateInsights(
    prompt: string,
    options: ComparatorAiGenerateOptions = {},
  ): Promise<ComparatorAiInsightsDto> {
    const model = options.model ?? COMPARATOR_AI_MODEL;

    const { text, citations: groundedCitations } = await generateContent(
      prompt,
      {
        model,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      },
    );

    const parsedJson = JSON.parse(normalizeModelJson(text)) as unknown;
    const parsedInsights = parse(
      ComparatorAiInsightsDtoSchema,
      normalizeAiInsightsPayload(parsedJson),
    );
    const citations =
      parsedInsights.citations.length > 0
        ? normalizeCitations(parsedInsights.citations)
        : groundedCitations;

    return {
      ...parsedInsights,
      citations,
    };
  }
}
