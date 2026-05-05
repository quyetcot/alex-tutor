import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Message,
  ConversationMode,
  ConversationTopic,
  SystemStatus,
  VoiceSettings,
  SavedVocabularyItem,
  SessionSummary,
  VocabularyUpgrade,
  GrammarCorrection,
  UserPersona,
  EnglishLevel,
} from '@/types';

// ─── State Shape ──────────────────────────────────────────────────────────────

interface ConversationState {
  // Session config
  mode: ConversationMode | null;
  topic: ConversationTopic | null;
  persona: UserPersona;
  englishLevel: EnglishLevel;

  // Messages
  messages: Message[];
  status: SystemStatus;

  // Analysis toggle
  isAnalysisEnabled: boolean;

  // Voice settings
  voiceSettings: VoiceSettings;

  // Dark mode
  isDarkMode: boolean;

  // Saved vocabulary (persisted to localStorage)
  savedVocabulary: SavedVocabularyItem[];

  // Session summary (shown every 10 turns)
  sessionSummary: SessionSummary | null;
  showSessionSummary: boolean;
}

// ─── Actions Shape ────────────────────────────────────────────────────────────

interface ConversationActions {
  startSession: (mode: ConversationMode, topic: ConversationTopic) => void;
  resetSession: () => void;
  setPersona: (persona: UserPersona) => void;
  setEnglishLevel: (level: EnglishLevel) => void;

  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  finalizeLastMessage: (content: string) => void;

  setStatus: (status: SystemStatus) => void;
  toggleAnalysis: () => void;
  toggleDarkMode: () => void;

  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  saveVocabularyItem: (item: VocabularyUpgrade) => void;
  removeVocabularyItem: (used: string) => void;

  computeAndShowSummary: () => void;
  dismissSummary: () => void;
}

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
};

// ─── Fluency score helper ─────────────────────────────────────────────────────

/** Simple heuristic: 10 minus 0.5 per correction (min 1) */
const computeFluencyScore = (corrections: GrammarCorrection[], turns: number): number => {
  if (turns === 0) return 10;
  const correctionRate = corrections.length / turns;
  return Math.max(1, Math.round((10 - correctionRate * 2) * 10) / 10);
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useConversationStore = create<ConversationState & ConversationActions>()(
  persist(
    (set, get) => ({
      // ── State ──
      mode: null,
      topic: null,
      persona: 'adult',
      englishLevel: 'intermediate',
      messages: [],
      status: 'idle',
      isAnalysisEnabled: true,
      voiceSettings: DEFAULT_VOICE_SETTINGS,
      isDarkMode: false,
      savedVocabulary: [],
      sessionSummary: null,
      showSessionSummary: false,

      // ── Actions ──
      startSession: (mode, topic) => {
        set({ mode, topic, status: 'idle' });
        // Generate AI greeting component handles the API call on mount
      },
      resetSession: () => {
        set({
          mode: null,
          topic: null,
          messages: [],
          status: 'idle',
          showSessionSummary: false,
          sessionSummary: null,
        });
      },
      setPersona: (persona) => set({ persona }),
      setEnglishLevel: (englishLevel) => set({ englishLevel }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      /** Called repeatedly while streaming to update the last assistant message */
      updateLastMessage: (content) =>
        set((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content, isStreaming: true };
          }
          return { messages: msgs };
        }),

      /** Called when streaming finishes — marks message as complete and triggers summary check */
      finalizeLastMessage: (content) => {
        set((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content, isStreaming: false };
          }
          return { messages: msgs };
        });

        // Check if we need to show a session summary (every 10 user turns)
        const userTurns = get().messages.filter((m) => m.role === 'user').length;
        if (userTurns > 0 && userTurns % 10 === 0) {
          get().computeAndShowSummary();
        }
      },

      setStatus: (status) => set({ status }),
      toggleAnalysis: () => set((s) => ({ isAnalysisEnabled: !s.isAnalysisEnabled })),
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),

      updateVoiceSettings: (settings) =>
        set((s) => ({ voiceSettings: { ...s.voiceSettings, ...settings } })),

      saveVocabularyItem: (item) =>
        set((s) => {
          const already = s.savedVocabulary.some((v) => v.used === item.used);
          if (already) return {};
          const saved: SavedVocabularyItem = { ...item, savedAt: new Date().toISOString() };
          return { savedVocabulary: [...s.savedVocabulary, saved] };
        }),

      removeVocabularyItem: (used) =>
        set((s) => ({
          savedVocabulary: s.savedVocabulary.filter((v) => v.used !== used),
        })),

      computeAndShowSummary: () => {
        const { messages } = get();
        const userTurns = messages.filter((m) => m.role === 'user').length;

        const allCorrections = messages
          .filter((m) => m.analysis?.corrections?.length)
          .flatMap((m) => m.analysis!.corrections);

        const allVocab = messages
          .filter((m) => m.analysis?.vocabulary_upgrades?.length)
          .flatMap((m) => m.analysis!.vocabulary_upgrades);

        // Most frequent error origins (top 3)
        const sorted = [...allCorrections].sort((a, b) =>
          a.original.localeCompare(b.original),
        );

        const summary: SessionSummary = {
          totalTurns: userTurns,
          totalCorrections: allCorrections.length,
          frequentErrors: sorted.slice(0, 3),
          newVocabulary: allVocab.slice(-5),
          fluencyScore: computeFluencyScore(allCorrections, userTurns),
        };

        set({ sessionSummary: summary, showSessionSummary: true });
      },

      dismissSummary: () => set({ showSessionSummary: false }),
    }),
    {
      name: 'alex-tutor-storage',
      // Only persist these keys to localStorage
      partialize: (state) => ({
        voiceSettings: state.voiceSettings,
        isDarkMode: state.isDarkMode,
        savedVocabulary: state.savedVocabulary,
        persona: state.persona,
        englishLevel: state.englishLevel,
        isAnalysisEnabled: state.isAnalysisEnabled,
      }),
    },
  ),
);
