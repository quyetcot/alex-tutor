'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Square, RotateCcw, Home, Settings, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useConversationStore } from '@/store/conversationStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';
import { StatusBadge } from '@/components/StatusBadge';
import { ChatBubble } from '@/components/ChatBubble';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { SessionSummaryModal } from '@/components/SessionSummaryModal';
import { VoiceSettingsPanel } from '@/components/VoiceSettingsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Message, GeminiStructuredResponse } from '@/types';
import { parseGeminiResponse } from '@/lib/groq-client';

export const TalkScreen = () => {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initRef = useRef(false);

  const {
    mode, topic, messages, status, persona, englishLevel,
    isAnalysisEnabled, isDarkMode, voiceSettings,
    showSessionSummary, sessionSummary,
    addMessage, updateLastMessage, finalizeLastMessage,
    setStatus, toggleAnalysis, toggleDarkMode, resetSession, dismissSummary,
  } = useConversationStore();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── Redirect if no mode selected ──────────────────────────────────────────
  useEffect(() => {
    if (!mode || !topic) router.replace('/');
  }, [mode, topic, router]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Audio Visualizer ──────────────────────────────────────────────────────
  const { canvasRef, startVisualizer, stopVisualizer, isActive: isVisualizerActive } = useAudioVisualizer();

  // ── TTS ───────────────────────────────────────────────────────────────────
  const onTtsEnd = useCallback(() => {
    setStatus('idle');
  }, [setStatus]);

  const { isSpeaking, voices, speak, stop: stopTts } = useSpeechSynthesis(voiceSettings, onTtsEnd);

  // ── Send message to Gemini (streaming) ───────────────────────────────────
  const sendToGemini = useCallback(
    async (userText: string) => {
      if (!mode || !topic) return;

      const isGreeting = userText === '__GREETING__';

      // Only add non-greeting messages as visible user bubbles
      if (!isGreeting) {
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: userText,
          timestamp: new Date(),
        };
        addMessage(userMsg);
      }

      // Add placeholder streaming assistant bubble
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      });
      setStatus('processing');

      try {
        // Build history (exclude the streaming placeholder we just added)
        const history = messages
          .filter((m) => !m.isStreaming)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // Append the current user turn (or greeting trigger)
        history.push({ role: 'user', content: userText });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, topic, persona, englishLevel, messages: history }),
        });

        if (!res.ok || !res.body) {
          const errBody = await res.text().catch(() => '');
          const is429 = res.status === 429 || errBody.includes('429') || errBody.includes('RESOURCE_EXHAUSTED');
          throw new Error(is429 ? '429 Too Many Requests' : `API error: ${res.status} — ${errBody}`);
        }

        // Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              // Groq format: { text: "delta" }
              // Gemini format: { candidates: [{content: {parts: [{text}]}}] }
              const text: string =
                parsed?.text ??
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
                '';
              if (text) {
                accumulated += text;
                updateLastMessage(accumulated);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        // Parse structured response
        const structured: GeminiStructuredResponse = parseGeminiResponse(accumulated);
        const finalReply = structured.reply || accumulated;

        finalizeLastMessage(finalReply);

        // Attach analysis to the last assistant message
        useConversationStore.setState((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = {
              ...last,
              content: finalReply,
              analysis: structured.analysis,
              isStreaming: false,
            };
          }
          return { messages: msgs };
        });

        setStatus('speaking');
        speak(finalReply);
      } catch (error) {
        setStatus('error');
        let message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('429') || message.includes('Too Many Requests')) {
          message = 'Rate limit reached. Gemini free tier allows 15 requests/min. Please wait ~1 minute and try again.';
        }
        toast.error(message, { duration: 8000 });
        useConversationStore.setState((state) => ({
          messages: state.messages.filter((m) => !m.isStreaming),
        }));
      }
    },
    [mode, topic, messages, addMessage, updateLastMessage, finalizeLastMessage, setStatus, speak],
  );

  // ── Greeting on session start (guard with ref to prevent StrictMode double-fire) ──
  useEffect(() => {
    setMounted(true);
    if (initRef.current || !mode || !topic || messages.length > 0) return;
    initRef.current = true;
    // Small delay to ensure component is fully mounted before API call
    const timer = setTimeout(() => sendToGemini('__GREETING__'), 300);
    return () => clearTimeout(timer);
  }, [mode, topic, messages.length, sendToGemini]);

  // ── STT: called when user finishes speaking ────────────────────────────────
  const onFinalTranscript = useCallback(
    (text: string) => {
      stopVisualizer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (status !== 'processing' && status !== 'speaking') {
        sendToGemini(text);
      }
    },
    [sendToGemini, status, stopVisualizer],
  );

  const { transcript, interimTranscript, isListening, startListening, stopListening } =
    useSpeechRecognition(onFinalTranscript);

  // ── Mic button handler ─────────────────────────────────────────────────────
  const handleMicToggle = useCallback(async () => {
    if (isSpeaking) {
      stopTts();
      setStatus('idle');
      return;
    }

    if (isListening) {
      stopListening();
      stopVisualizer();
      setStatus('idle');
      return;
    }

    if (status === 'processing') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVisualizer(stream);
      startListening();
      setStatus('listening');
    } catch {
      toast.error('Microphone access denied. Please allow microphone access in your browser.');
      setStatus('error');
    }
  }, [isSpeaking, isListening, status, stopTts, stopListening, startListening, startVisualizer, stopVisualizer, setStatus]);

  // ── Sync status with listening/speaking state ─────────────────────────────
  useEffect(() => {
    if (isListening) {
      setStatus('listening');
    } else if (status === 'listening') {
      setStatus('idle');
    }
  }, [isListening, status, setStatus]);

  // ── Reset handler ─────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopTts();
    stopListening();
    stopVisualizer();
    resetSession();
    initRef.current = false; // Allow re-initialization after reset
    setShowResetDialog(false);
  }, [stopTts, stopListening, stopVisualizer, resetSession]);

  if (!mode || !topic || !mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-[#0a0a0f] dark:text-white transition-colors duration-300 overflow-hidden">
      {/* ── Navbar ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/30 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
            aria-label="Go home"
            id="btn-go-home"
          >
            <Home size={18} />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white leading-none">Alex Tutor</h1>
            <p className="text-sm text-slate-500 mt-0.5">{topic}</p>
          </div>
        </div>

        <StatusBadge status={status} />

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
            aria-label="Toggle dark mode"
            id="btn-toggle-dark-mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
            aria-label="Open settings"
            id="btn-open-settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setShowResetDialog(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all"
            aria-label="Reset session"
            id="btn-reset-session"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {/* ── Chat Area ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatBubble message={msg} />
            {isAnalysisEnabled && msg.role === 'assistant' && msg.analysis && !msg.isStreaming && (
              <AnalysisPanel analysis={msg.analysis} className="mt-2 ml-11" />
            )}
          </div>
        ))}

        {/* Interim transcript display */}
        {(transcript || interimTranscript) && (
          <div className="ml-auto max-w-[85%] flex flex-row-reverse gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center text-base font-bold flex-shrink-0">
              U
            </div>
            <div className="px-5 py-3.5 rounded-2xl rounded-tr-sm bg-violet-600/40 text-white text-base md:text-lg border border-violet-500/30 backdrop-blur-sm shadow-sm">
              {transcript}
              <span className="text-violet-300/60">{interimTranscript}</span>
              <span className="animate-pulse ml-0.5">▋</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* ── Bottom Controls ── */}
      <footer className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm space-y-4">
        <AudioVisualizer canvasRef={canvasRef} isActive={isVisualizerActive} />

        <div className="flex items-center justify-between gap-4">
          {/* Analysis toggle */}
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Switch
              id="analysis-toggle"
              checked={isAnalysisEnabled}
              onCheckedChange={toggleAnalysis}
              aria-label="Toggle language analysis"
            />
            <label htmlFor="analysis-toggle" className="cursor-pointer select-none">
              Analysis
            </label>
          </div>

          {/* Central mic button */}
          <button
            onClick={handleMicToggle}
            disabled={status === 'processing'}
            id="btn-mic-toggle"
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
            className={cn(
              'relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-black',
              isListening
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40'
                : isSpeaking
                ? 'bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/40'
                : status === 'processing'
                ? 'bg-amber-500/50 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/40 hover:scale-105',
              isListening && 'animate-pulse',
            )}
          >
            {isListening ? (
              <Square size={22} fill="white" className="text-white" />
            ) : (
              <Mic size={22} className="text-white" />
            )}
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            )}
          </button>

          {/* Stop TTS button */}
          <button
            onClick={stopTts}
            disabled={!isSpeaking}
            id="btn-stop-tts"
            aria-label="Stop AI speech"
            className={cn(
              'p-3 rounded-xl transition-all',
              isSpeaking
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-transparent text-slate-700 cursor-not-allowed',
            )}
          >
            <MicOff size={18} />
          </button>
        </div>

        <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          {isListening
            ? 'Tap to stop · Sends automatically when you pause'
            : isSpeaking
            ? 'Alex is speaking · Tap mic to interrupt'
            : 'Tap the mic to start speaking'}
        </p>
      </footer>

      {/* ── Reset Confirmation Dialog ── */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#13131a] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reset Session?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will clear all conversation history and start a new session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              className="border-white/10 text-slate-300 hover:bg-white/5"
              id="btn-cancel-reset"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700 text-white"
              id="btn-confirm-reset"
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Session Summary Modal ── */}
      {showSessionSummary && sessionSummary && (
        <SessionSummaryModal summary={sessionSummary} onClose={dismissSummary} />
      )}

      {/* ── Voice Settings Panel ── */}
      <VoiceSettingsPanel
        open={showSettings}
        onOpenChange={setShowSettings}
        voices={voices}
        onTestVoice={() => speak("Hello, I'm Alex. Let's practice English together!")}
      />
    </div>
  );
};
