// ─── Conversation Modes ───────────────────────────────────────────────────────

export type ConversationMode = 'free-talk' | 'tech-talk';

export type UserPersona = 'student' | 'adult' | 'senior';
export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';

export const FREE_TALK_TOPICS = [
  'Grocery Shopping & Errands',
  'Coffee Shop Chatter',
  'Weekend Plans & Hobbies',
  'Navigating Public Transit',
  'Doctor Appointment',
  'Home Maintenance & Chores',
  'Watching Sports & Games',
  'Discussing Movies & TV',
  'Gym & Fitness',
  'Food & Cooking'
] as const;

export const TECH_TALK_SCENARIOS = [
  'Daily Stand-up',
  'Technical Interview',
  'Bug Report',
  'Code Review',
  'Project Estimation',
] as const;

export type FreeTalkTopic = (typeof FREE_TALK_TOPICS)[number];
export type TechTalkScenario = (typeof TECH_TALK_SCENARIOS)[number];
export type ConversationTopic = FreeTalkTopic | TechTalkScenario;

// ─── System Status ────────────────────────────────────────────────────────────

export type SystemStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

// ─── Message ──────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface VocabularyUpgrade {
  used: string;
  upgrade: string;
  example: string;
}

export interface LanguageAnalysis {
  corrections: GrammarCorrection[];
  vocabulary_upgrades: VocabularyUpgrade[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  analysis?: LanguageAnalysis;
  /** true while Gemini is still streaming this message */
  isStreaming?: boolean;
}

// ─── Gemini API ───────────────────────────────────────────────────────────────

export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  mode: ConversationMode;
  topic: ConversationTopic;
  persona: UserPersona;
  englishLevel: EnglishLevel;
  messages: GeminiMessage[];
}

/** Shape of structured JSON response from Gemini */
export interface GeminiStructuredResponse {
  reply: string;
  analysis: LanguageAnalysis;
}

// ─── Session Summary ──────────────────────────────────────────────────────────

export interface SessionSummary {
  totalTurns: number;
  totalCorrections: number;
  frequentErrors: GrammarCorrection[];
  newVocabulary: VocabularyUpgrade[];
  /** Fluency score 1-10 estimated by summing corrections per turn */
  fluencyScore: number;
}

// ─── Saved Vocabulary (localStorage) ─────────────────────────────────────────

export interface SavedVocabularyItem extends VocabularyUpgrade {
  savedAt: string; // ISO string
}

// ─── TTS Voice Settings ───────────────────────────────────────────────────────

export interface VoiceSettings {
  voiceURI: string;
  rate: number;   // 0.5 – 2.0
  pitch: number;  // 0.5 – 2.0
}
