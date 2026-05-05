'use client';

import { useConversationStore } from '@/store/conversationStore';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserPersona, EnglishLevel } from '@/types';

interface VoiceSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voices: SpeechSynthesisVoice[];
  onTestVoice?: () => void;
}

export const VoiceSettingsPanel = ({ open, onOpenChange, voices, onTestVoice }: VoiceSettingsPanelProps) => {
  const { voiceSettings, updateVoiceSettings, persona, setPersona, englishLevel, setEnglishLevel } = useConversationStore();
  const safeRate = voiceSettings?.rate ?? 1.0;
  const safePitch = voiceSettings?.pitch ?? 1.0;
  const safeVoiceURI = voiceSettings?.voiceURI ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#13131a] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Persona Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              AI Persona / Your Age
            </label>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              {(['student', 'adult', 'senior'] as UserPersona[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPersona(p)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                    persona === p
                      ? 'bg-white dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200 dark:border-violet-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* English Level Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Your English Level
            </label>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              {(['beginner', 'intermediate', 'advanced'] as EnglishLevel[]).map((l) => {
                const label = l === 'beginner' ? 'A1-A2' : l === 'intermediate' ? 'B1-B2' : 'C1-C2';
                return (
                  <button
                    key={l}
                    onClick={() => setEnglishLevel(l)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                      englishLevel === l
                        ? 'bg-white dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200 dark:border-violet-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-white/10" />

          {/* Voice selection */}
          <div className="space-y-2">
            <label htmlFor="voice-select" className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Voice
            </label>
            <select
              id="voice-select"
              value={safeVoiceURI}
              onChange={(e) => updateVoiceSettings({ voiceURI: e.target.value })}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-base text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="">Default Voice</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Speed</label>
              <span className="text-sm text-violet-600 dark:text-violet-400 font-mono">{safeRate.toFixed(1)}×</span>
            </div>
            <Slider
              id="voice-rate"
              min={0.5}
              max={2}
              step={0.1}
              value={[safeRate]}
              onValueChange={(vals) => updateVoiceSettings({ rate: (vals as number[])[0] })}
              aria-label="Speech rate"
              className="w-full"
            />
          </div>

          {/* Pitch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pitch</label>
              <span className="text-sm text-violet-600 dark:text-violet-400 font-mono">{safePitch.toFixed(1)}</span>
            </div>
            <Slider
              id="voice-pitch"
              min={0.5}
              max={2}
              step={0.1}
              value={[safePitch]}
              onValueChange={(vals) => updateVoiceSettings({ pitch: (vals as number[])[0] })}
              aria-label="Speech pitch"
              className="w-full"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={onTestVoice}
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white text-base py-5"
            >
              <Volume2 size={18} />
              Test Voice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
