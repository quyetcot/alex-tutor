import Groq from 'groq-sdk';
import type { GeminiStructuredResponse } from '@/types';

// ─── Groq config ──────────────────────────────────────────────────────────────
// Using llama-3.3-70b: strong reasoning, great at following JSON schema instructions
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Groq streaming ───────────────────────────────────────────────────────────

/**
 * Calls Groq with streaming and returns a ReadableStream of text chunks.
 * The stream emits raw text deltas (already decoded), not SSE JSON.
 * The API route wraps these into a simple newline-delimited stream.
 */
export const streamGroq = async (
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> => {
  const groq = new Groq({ apiKey });

  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.8,
    max_tokens: 1024,
  });

  // Convert Groq's async iterable into a Web ReadableStream of SSE-like chunks
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            // Emit as SSE data line so client-side parsing works the same way
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
};

// ─── Response parser (shared with Gemini flow) ────────────────────────────────

/**
 * Extracts a JSON block from AI response text.
 * Handles both ```json ... ``` wrapped and raw JSON responses.
 */
export const parseAIResponse = (raw: string): GeminiStructuredResponse => {
  // Try to find ```json ... ``` block first (Groq/Gemini both use this)
  const jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim();

  try {
    return JSON.parse(jsonStr) as GeminiStructuredResponse;
  } catch {
    // Fallback: plain text response without JSON structure
    return {
      reply: raw.trim(),
      analysis: { corrections: [], vocabulary_upgrades: [] },
    };
  }
};

// ─── Keep Gemini parseGeminiResponse as alias for backwards compatibility ─────
export const parseGeminiResponse = parseAIResponse;
