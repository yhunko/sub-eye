/**
 * Google Gemini transport.
 *
 * Pure HTTP + response parsing — no database or domain dependencies. Prompts,
 * Valibot schemas, and result parsing stay in the consuming server domain so
 * each caller keeps full control over its model behavior.
 */

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

export type GeminiCitation = { title: string; url: string };

export type GeminiGenerateOptions = {
  model: string;
  temperature?: number;
  /** Passed through verbatim as the request `tools` field (e.g. googleSearch). */
  tools?: unknown[];
  signal?: AbortSignal;
};

export type GeminiGenerateResult = {
  text: string;
  citations: GeminiCitation[];
};

/** Strip ```json fences from a model response so it can be JSON-parsed. */
export const normalizeModelJson = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

/** Dedupe by URL, keep only https links, cap at 8. */
export const normalizeCitations = (
  citations: GeminiCitation[],
): GeminiCitation[] => {
  const uniqueByUrl = new Map<string, GeminiCitation>();

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
): GeminiCitation[] => {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return normalizeCitations(
    chunks.map((chunk) => ({
      title: chunk.web?.title ?? "Source",
      url: chunk.web?.uri ?? "",
    })),
  );
};

/**
 * Call Gemini `generateContent` and return the concatenated model text plus any
 * grounding citations. Reads `GEMINI_API_KEY` at call time (request scope).
 *
 * Throws on missing key, non-2xx response, or empty output. Abort signals
 * propagate unchanged so callers can implement their own timeout messaging.
 */
export async function generateContent(
  prompt: string,
  options: GeminiGenerateOptions,
): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
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
        ...(options.tools ? { tools: options.tools } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.2,
        },
      }),
      ...(options.signal ? { signal: options.signal } : {}),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Gemini API request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini response is empty");
  }

  return { text, citations: extractGroundingCitations(payload) };
}
