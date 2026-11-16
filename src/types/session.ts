export type ProficiencyLevel = "A1-A2" | "B1-B2" | "C1-C2";

export type CorrectionStyle = "gentle" | "explicit" | "immersion";

export type LiveVoiceName = "Zephyr" | "Kore" | "Puck" | "Charon" | "Fenrir";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  regionNote: string;
  starterGreeting: string;
}

export interface ScenarioOption {
  id: string;
  title: string;
  setting: string;
  partnerRole: string;
  description: string;
  imageUrl: string;
  objectives: string[];
  promptContext: string;
}

export interface TranscriptTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  tip?: string;
}

export interface PhraseExplanation {
  phrase: string;
  translation: string;
  literalMeaning: string;
  phoneticGuide: string;
  grammarNote: string;
  keyVocabulary: Array<{
    term: string;
    reading: string;
    meaning: string;
  }>;
}

export interface SuggestedReply {
  targetText: string;
  phoneticGuide: string;
  englishMeaning: string;
}

export interface SavedPhrase {
  id: string;
  languageName: string;
  phrase: string;
  translation: string;
  phoneticGuide: string;
  note: string;
  savedAt: string;
}

export interface SessionReview {
  summary: string;
  strengths: string[];
  upgrades: Array<{
    original: string;
    improved: string;
    explanation: string;
  }>;
  extractedPhrases: Array<{
    term: string;
    reading: string;
    meaning: string;
    note: string;
  }>;
}

export type LiveConnectionState = "idle" | "connecting" | "connected" | "error";
