import { parse } from "valibot";
import {
  COMPARATOR_AI_MODEL,
  ComparatorAiInsightsDtoSchema,
  type ComparatorAiInsightsDto,
} from "shared";

export type ComparatorAiGenerateOptions = {
  model?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
  }>;
};

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

const normalizeCitations = (
  citations: Array<{ title: string; url: string }>,
): Array<{ title: string; url: string }> => {
  const uniqueByUrl = new Map<string, { title: string; url: string }>();

  for (const citation of citations) {
    const url = citation.url.trim();
    if (!url) {
      continue;
    }

    if (!/^https?:\/\//i.test(url)) {
      continue;
    }

    uniqueByUrl.set(url, {
      title: citation.title.trim() || "Source",
      url,
    });
  }

  return Array.from(uniqueByUrl.values()).slice(0, 8);
};

const extractGroundingCitations = (
  response: GeminiGenerateContentResponse,
): Array<{ title: string; url: string }> => {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return normalizeCitations(
    chunks.map((chunk) => ({
      title: chunk.web?.title ?? "Source",
      url: chunk.web?.uri ?? "",
    })),
  );
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
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const model = options.model ?? COMPARATOR_AI_MODEL;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini API request failed (${response.status}): ${body.slice(0, 300)}`,
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

    const parsedJson = JSON.parse(normalizeModelJson(modelText)) as unknown;
    const parsedInsights = parse(
      ComparatorAiInsightsDtoSchema,
      normalizeAiInsightsPayload(parsedJson),
    );
    const groundedCitations = extractGroundingCitations(payload);
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
