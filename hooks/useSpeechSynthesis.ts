'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceSettings } from '@/types';

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Hook wrapping Web Speech Synthesis API.
 * - Loads available voices asynchronously (voices load lazily in most browsers)
 * - Applies voice, rate, and pitch from settings
 * - SSR-safe
 */
export const useSpeechSynthesis = (
  settings: VoiceSettings,
  onEnd?: () => void,
): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices — they are loaded async in Chrome and loaded sync in Safari
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const englishVoices = available.filter((v) => v.lang.startsWith('en'));
      if (englishVoices.length > 0) setVoices(englishVoices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = Number.isFinite(settings.rate) ? settings.rate : 1.0;
      utterance.pitch = Number.isFinite(settings.pitch) ? settings.pitch : 1.0;

      if (settings.voiceURI) {
        const selectedVoice = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === settings.voiceURI);
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [settings, onEnd],
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSpeaking, voices, speak, stop };
};
