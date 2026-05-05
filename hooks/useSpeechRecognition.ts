'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API type declarations (not included in default TS lib)
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrEvent) => void) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrEvent extends Event {
  error: string;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Custom hook wrapping Web Speech API SpeechRecognition.
 * - Exposes interim results for real-time display
 * - Auto-sends on `onend` (silence detection) via the `onFinalTranscript` callback
 * - SSR-safe: SpeechRecognition is only accessed on the client
 */
export const useSpeechRecognition = (
  onFinalTranscript: (text: string) => void,
  language: 'en-US' | 'en-GB' = 'en-US',
): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const buildRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!isSupported) return null;

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let interim = '';
      let final = finalTextRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      finalTextRef.current = final;
      setTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      const finalText = finalTextRef.current.trim();
      if (finalText) {
        onFinalTranscript(finalText);
        finalTextRef.current = '';
        setTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('[SpeechRecognition] error:', event.error);
      }
      setIsListening(false);
    };

    return recognition;
  }, [isSupported, language, onFinalTranscript]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;
    const recognition = buildRecognition();
    if (!recognition) return;

    finalTextRef.current = '';
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [buildRecognition, isSupported, isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTextRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
};
