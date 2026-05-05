'use client';

import { useRouter } from 'next/navigation';
import { Mic2, Code2, ChevronRight, Zap, Sun, Moon, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_TALK_TOPICS, TECH_TALK_SCENARIOS } from '@/types';
import type { ConversationMode, ConversationTopic, UserPersona } from '@/types';
import { useConversationStore } from '@/store/conversationStore';
import { VoiceSettingsPanel } from '@/components/VoiceSettingsPanel';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useState, useEffect } from 'react';

export const ModeSelector = () => {
  const router = useRouter();
  const { startSession, isDarkMode, toggleDarkMode, voiceSettings } = useConversationStore();
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { voices, speak } = useSpeechSynthesis(voiceSettings);

  const handleSelect = (mode: ConversationMode, topic: ConversationTopic) => {
    startSession(mode, topic);
    router.push('/talk');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] flex flex-col items-center justify-center p-6 gap-8 transition-colors duration-300 relative">
      
      {/* ── Top Right Controls ── */}
      {mounted && (
        <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full bg-white dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 shadow-sm transition-all"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-full bg-white dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 shadow-sm transition-all"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-2">
          <Zap size={14} className="animate-pulse" />
          Powered by Gemini 2.0 Flash
        </div>
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-600 via-cyan-600 to-violet-600 dark:from-violet-400 dark:via-cyan-400 dark:to-violet-400 bg-clip-text text-transparent pb-2">
          Alex Tutor
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
          Your AI English speaking partner. Choose a mode to begin your session.
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <ModeCard
          mode="free-talk"
          icon={<Mic2 size={24} />}
          title="Free Talk"
          description="Casual conversations on everyday topics"
          topics={FREE_TALK_TOPICS as unknown as ConversationTopic[]}
          gradient="from-cyan-500/20 to-emerald-500/20"
          borderColor="border-cyan-500/20 hover:border-cyan-500/40"
          iconColor="text-cyan-400"
          onSelect={handleSelect}
        />
        <ModeCard
          mode="tech-talk"
          icon={<Code2 size={24} />}
          title="Tech Talk"
          description="Professional IT scenarios & technical English"
          topics={TECH_TALK_SCENARIOS as unknown as ConversationTopic[]}
          gradient="from-violet-500/20 to-purple-500/20"
          borderColor="border-violet-500/20 hover:border-violet-500/40"
          iconColor="text-violet-400"
          onSelect={handleSelect}
        />
      </div>

      {/* ── Settings Panel ── */}
      {mounted && (
        <VoiceSettingsPanel
          open={showSettings}
          onOpenChange={setShowSettings}
          voices={voices}
          onTestVoice={() => speak("Hello, I'm Alex. Let's practice English together!")}
        />
      )}
    </div>
  );
};

// ─── ModeCard ─────────────────────────────────────────────────────────────────

interface ModeCardProps {
  mode: ConversationMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  topics: ConversationTopic[];
  gradient: string;
  borderColor: string;
  iconColor: string;
  onSelect: (mode: ConversationMode, topic: ConversationTopic) => void;
}

const ModeCard = ({
  mode, icon, title, description, topics, gradient, borderColor, iconColor, onSelect,
}: ModeCardProps) => (
  <div
    className={cn(
      'group rounded-2xl border bg-gradient-to-br p-6 space-y-5 transition-all duration-300',
      `bg-gradient-to-br ${gradient}`,
      borderColor,
    )}
  >
    <div className="flex items-start gap-4">
      <div className={cn('p-4 rounded-xl bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-white/10', iconColor)}>
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-base mt-1">{description}</p>
      </div>
    </div>

    <div className="space-y-2">
      {topics.map((topic) => (
        <button
          key={topic}
          onClick={() => onSelect(mode, topic)}
          id={`topic-${mode}-${topic.replace(/\s+/g, '-').toLowerCase()}`}
          className={cn(
            'w-full flex items-center justify-between px-5 py-4 rounded-xl',
            'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20',
            'text-base font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
            'transition-all duration-200 hover:translate-x-1',
            'group/btn shadow-sm dark:shadow-none',
          )}
        >
          {topic}
          <ChevronRight
            size={16}
            className="text-slate-400 dark:text-slate-600 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white transition-colors"
          />
        </button>
      ))}
    </div>
  </div>
);
