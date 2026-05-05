import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildGeminiMessages, buildGreetingPrompt } from '@/lib/prompts';
import { streamGroq } from '@/lib/groq-client';
import { streamGemini } from '@/lib/gemini';
import type { ChatRequestBody, GeminiMessage } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Prefer Groq; fall back to Gemini if available
  const useGroq = Boolean(groqApiKey);
  const useGemini = Boolean(geminiApiKey);

  if (!useGroq && !useGemini) {
    return NextResponse.json(
      { error: 'No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env.local' },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { mode, topic, persona, englishLevel, messages } = body;
  if (!mode || !topic || !persona || !englishLevel) {
    return NextResponse.json({ error: 'mode, topic, persona, and englishLevel are required.' }, { status: 400 });
  }

  const systemPrompt = getSystemPrompt(mode, topic, persona, englishLevel);

  // Build message history, trim to max turns
  const history: GeminiMessage[] = buildGeminiMessages(messages);

  // Replace greeting trigger with actual greeting prompt
  const isGreeting = history.length === 1 && history[0].content === '__GREETING__';
  if (isGreeting) {
    history[0] = { role: 'user', content: buildGreetingPrompt(mode, topic, persona, englishLevel) };
  }

  try {
    if (useGroq) {
      // ── Groq path (SSE stream from our custom ReadableStream) ──────────────
      const stream = await streamGroq(
        groqApiKey!,
        systemPrompt,
        history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      );

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // ── Gemini fallback path (raw SSE passthrough) ─────────────────────────
    const geminiResponse = await streamGemini(geminiApiKey!, systemPrompt, history);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return NextResponse.json(
        { error: `Gemini API error: ${errText}` },
        { status: geminiResponse.status },
      );
    }

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    geminiResponse.body!.pipeTo(writable).catch(() => {});

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
