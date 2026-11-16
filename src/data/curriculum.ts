import {
  CorrectionStyle,
  LanguageOption,
  LiveVoiceName,
  ProficiencyLevel,
  ScenarioOption,
} from "../types/session";

export const LANGUAGES: LanguageOption[] = [
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    regionNote: "Conversational Iberian & Latin American",
    starterGreeting: "Buenos días",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    regionNote: "Everyday Parisian cadence",
    starterGreeting: "Bonjour",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    regionNote: "Polite & casual Tokyo register",
    starterGreeting: "こんにちは",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    regionNote: "Standard conversational German",
    starterGreeting: "Guten Tag",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    regionNote: "Warm everyday Italian",
    starterGreeting: "Buongiorno",
  },
  {
    code: "zh",
    name: "Mandarin",
    nativeName: "中文",
    regionNote: "Natural Beijing Mandarin",
    starterGreeting: "你好",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    regionNote: "Polite Seoul conversational style",
    starterGreeting: "안녕하세요",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    regionNote: "Natural conversational Portuguese",
    starterGreeting: "Olá",
  },
];

export const LEVELS: Array<{
  id: ProficiencyLevel;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "A1-A2",
    label: "Beginner (A1–A2)",
    shortLabel: "A1–A2",
    description: "Clear pace, core everyday vocabulary, supportive scaffolding.",
  },
  {
    id: "B1-B2",
    label: "Intermediate (B1–B2)",
    shortLabel: "B1–B2",
    description: "Natural rhythm, idiomatic follow-ups, subtle recasting.",
  },
  {
    id: "C1-C2",
    label: "Advanced (C1–C2)",
    shortLabel: "C1–C2",
    description: "Full native nuance, rich expressions, unscripted debate.",
  },
];

export const CORRECTION_STYLES: Array<{
  id: CorrectionStyle;
  label: string;
  description: string;
}> = [
  {
    id: "gentle",
    label: "Gentle Recast",
    description: "Naturally echoes the right phrasing without breaking flow.",
  },
  {
    id: "explicit",
    label: "Explicit Coaching",
    description: "Briefly pauses to explain grammar or word choice fixes.",
  },
  {
    id: "immersion",
    label: "Natural Immersion",
    description: "Zero English interruptions; stays strictly in character.",
  },
];

export const VOICES: Array<{
  id: LiveVoiceName;
  label: string;
  character: string;
}> = [
  { id: "Zephyr", label: "Zephyr", character: "Warm & articulate" },
  { id: "Kore", label: "Kore", character: "Calm & crisp" },
  { id: "Puck", label: "Puck", character: "Lively & conversational" },
  { id: "Charon", label: "Charon", character: "Deep & measured" },
  { id: "Fenrir", label: "Fenrir", character: "Rich & expressive" },
];

export const SCENARIOS: ScenarioOption[] = [
  {
    id: "cafe-morning",
    title: "Morning Espresso Bar",
    setting: "Neighborhood Café · 08:30",
    partnerRole: "Barista",
    description:
      "Order coffee and pastries, ask about single-origin beans, and exchange friendly morning small talk.",
    imageUrl: "/src/assets/images/scenario_cafe_morning_1794844779162.jpg",
    objectives: [
      "Order a drink with specific preferences",
      "Ask for a pastry recommendation",
      "Handle payment and casual farewells",
    ],
    promptContext:
      "You are a friendly, unhurried barista at an intimate neighborhood café during the morning rush. Greet the customer warmly, take their coffee and pastry order, ask follow-up questions about milk or seating, and engage in light small talk.",
  },
  {
    id: "street-market",
    title: "Evening Harvest Market",
    setting: "Open-Air Food Stall · 17:45",
    partnerRole: "Market Vendor",
    description:
      "Browse seasonal produce, ask how local ingredients are prepared, and negotiate a small bundle.",
    imageUrl: "/src/assets/images/scenario_street_market_1794844779557.jpg",
    objectives: [
      "Ask what is freshest in season today",
      "Request cooking or pairing advice",
      "Confirm weights, prices, and total",
    ],
    promptContext:
      "You are an enthusiastic local vendor running a fresh produce and herb stall at an evening neighborhood market. Describe what is ripe today, suggest simple dishes, and answer questions about prices and quantities.",
  },
  {
    id: "bookshop-exchange",
    title: "Independent Bookshop",
    setting: "Reading Room · 14:15",
    partnerRole: "Bookseller",
    description:
      "Describe genres you enjoy, compare favorite authors, and ask for a thoughtful literary recommendation.",
    imageUrl: "/src/assets/images/scenario_bookshop_exchange_1794844779587.jpg",
    objectives: [
      "Summarize a book or film you recently liked",
      "Ask for a curated local author suggestion",
      "Express agreement, nuance, or preference",
    ],
    promptContext:
      "You are a thoughtful independent bookseller who loves talking about contemporary fiction, essays, and local culture. Ask what the visitor enjoys reading, offer two contrasting recommendations, and discuss why each resonates.",
  },
  {
    id: "design-studio",
    title: "Studio Collaboration",
    setting: "Architecture & Design Desk · 11:00",
    partnerRole: "Studio Colleague",
    description:
      "Walk through a project timeline, clarify design feedback politely, and align on next steps.",
    imageUrl: "/src/assets/images/scenario_design_studio_1794844780274.jpg",
    objectives: [
      "Introduce your current project milestone",
      "Ask clarifying questions politely",
      "Propose a time for a follow-up review",
    ],
    promptContext:
      "You are a collaborative studio colleague reviewing an upcoming project together over coffee. Discuss deliverables, ask for their perspective on priorities, and naturally coordinate the next meeting.",
  },
];
