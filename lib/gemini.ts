import type { GeminiStructuredResponse } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  system_instruction: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

/**
 * Calls Gemini generateContent (non-streaming) for server-side use.
 * Streaming is handled directly in the API route via streamGenerateContent.
 */
export const callGemini = async (
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<GeminiStructuredResponse> => {
  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: GeminiRequestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  };

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return parseGeminiResponse(text);
};

/**
 * Returns a ReadableStream of Gemini server-sent events.
 * The API route pipes this directly to the client response.
 */
export const streamGemini = (
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<Response> => {
  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: GeminiRequestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  };

  return fetch(
    `${GEMINI_API_BASE}/models/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
};

/**
 * Extracts a JSON block from Gemini's markdown-wrapped response.
 * Gemini often wraps JSON in ```json ... ``` — we strip that reliably.
 */
export const parseGeminiResponse = (raw: string): GeminiStructuredResponse => {
  // Try to find ```json ... ``` block first
  const jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim();

  try {
    return JSON.parse(jsonStr) as GeminiStructuredResponse;
  } catch {
    // Fallback: if the model returned plain text without JSON
    return {
      reply: raw.trim(),
      analysis: { corrections: [], vocabulary_upgrades: [] },
    };
  }
};
