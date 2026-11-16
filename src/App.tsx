import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AcousticStage } from "./components/AcousticStage";
import { CoachingDeck, DeckTab } from "./components/CoachingDeck";
import { ScenarioGrid } from "./components/ScenarioGrid";
import { TranscriptFeed } from "./components/TranscriptFeed";
import { LANGUAGES, SCENARIOS } from "./data/curriculum";
import { useLiveVoice } from "./hooks/useLiveVoice";
import {
  CorrectionStyle,
  LiveVoiceName,
  PhraseExplanation,
  ProficiencyLevel,
  SavedPhrase,
  ScenarioOption,
  SessionReview,
  SuggestedReply,
  TranscriptTurn,
} from "./types/session";

const PHRASEBOOK_STORAGE_KEY = "cadence_phrasebook_v1";

function loadSavedPhrases(): SavedPhrase[] {
  try {
    const raw = localStorage.getItem(PHRASEBOOK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTimeShort(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioOption[]>(SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioOption>(
    SCENARIOS[0]
  );
  const [languageCode, setLanguageCode] = useState<string>("fr");
  const [level, setLevel] = useState<ProficiencyLevel>("B1-B2");
  const [correctionStyle, setCorrectionStyle] =
    useState<CorrectionStyle>("gentle");
  const [voiceName, setVoiceName] = useState<LiveVoiceName>("Zephyr");

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [activeTab, setActiveTab] = useState<DeckTab>("coach");
  const [suggestions, setSuggestions] = useState<SuggestedReply[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);

  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>(() =>
    loadSavedPhrases()
  );
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const [review, setReview] = useState<SessionReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const activeLanguage = useMemo(
    () => LANGUAGES.find((l) => l.code === languageCode) ?? LANGUAGES[0],
    [languageCode]
  );

  const savedPhrasesSet = useMemo(
    () => new Set(savedPhrases.map((p) => p.phrase.trim())),
    [savedPhrases]
  );

  useEffect(() => {
    try {
      localStorage.setItem(PHRASEBOOK_STORAGE_KEY, JSON.stringify(savedPhrases));
    } catch {
      // ignore storage quota issues
    }
  }, [savedPhrases]);

  const {
    connectionState,
    errorMessage,
    isMuted,
    micLevel,
    speakerLevel,
    isPartnerSpeaking,
    elapsedSeconds,
    startSession,
    stopSession,
    sendLiveText,
    toggleMute,
    clearError,
  } = useLiveVoice(setTranscript);

  const isLiveConnected = connectionState === "connected";

  const handleStartVoice = useCallback(() => {
    setReview(null);
    setReviewError(null);
    setSuggestions([]);
    startSession({
      languageName: activeLanguage.name,
      level,
      correctionStyle,
      voiceName,
      scenarioTitle: selectedScenario.title,
      partnerRole: selectedScenario.partnerRole,
      scenarioPrompt: selectedScenario.promptContext,
      autoGreet: transcript.length === 0,
    });
  }, [
    activeLanguage.name,
    correctionStyle,
    level,
    selectedScenario,
    startSession,
    transcript.length,
    voiceName,
  ]);

  const handleResetSession = useCallback(() => {
    if (isLiveConnected || connectionState === "connecting") {
      stopSession();
    }
    clearError();
    setTranscript([]);
    setSuggestions([]);
    setReview(null);
    setReviewError(null);
  }, [clearError, connectionState, isLiveConnected, stopSession]);

  const handleSelectScenario = useCallback(
    (scenario: ScenarioOption) => {
      if (isLiveConnected || connectionState === "connecting") {
        stopSession();
      }
      clearError();
      setSelectedScenario(scenario);
      setTranscript([]);
      setSuggestions([]);
      setReview(null);
      setReviewError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [clearError, connectionState, isLiveConnected, stopSession]
  );

  const handleCreateCustomScenario = useCallback(
    (scenario: ScenarioOption) => {
      setScenarios((prev) => [scenario, ...prev]);
      handleSelectScenario(scenario);
    },
    [handleSelectScenario]
  );

  const handleRequestSlower = useCallback(() => {
    if (!isLiveConnected) return;
    sendLiveText(
      `Please repeat what you just said more slowly and with slightly simpler phrasing in ${activeLanguage.name}.`,
      false
    );
  }, [activeLanguage.name, isLiveConnected, sendLiveText]);

  const handleRequestHint = useCallback(async () => {
    setHintLoading(true);
    setActiveTab("coach");
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageName: activeLanguage.name,
          level,
          scenarioTitle: selectedScenario.title,
          recentTurns: transcript.map((t) => ({ role: t.role, text: t.text })),
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch {
      // keep existing hints if request fails
    } finally {
      setHintLoading(false);
    }
  }, [activeLanguage.name, level, selectedScenario.title, transcript]);

  const handleSendText = useCallback(
    async (text: string) => {
      if (isLiveConnected) {
        sendLiveText(text, true);
        return;
      }

      const userTurn: TranscriptTurn = {
        id: `user-${Date.now()}`,
        role: "user",
        text,
        timestamp: formatTimeShort(),
      };
      setTranscript((prev) => [...prev, userTurn]);
      setIsSendingText(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            languageName: activeLanguage.name,
            level,
            correctionStyle,
            scenarioTitle: selectedScenario.title,
            partnerRole: selectedScenario.partnerRole,
            scenarioPrompt: selectedScenario.promptContext,
            history: transcript.map((t) => ({ role: t.role, text: t.text })),
            message: text,
          }),
        });
        const data = await res.json();
        if (res.ok && data.reply) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              text: data.reply,
              timestamp: formatTimeShort(),
              tip: data.gentleTip || undefined,
            },
          ]);
        } else {
          setTranscript((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              text: data.error || "Unable to reach conversation partner right now.",
              timestamp: formatTimeShort(),
            },
          ]);
        }
      } catch {
        setTranscript((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: "Network error while sending your message. Please try again.",
            timestamp: formatTimeShort(),
          },
        ]);
      } finally {
        setIsSendingText(false);
      }
    },
    [
      activeLanguage.name,
      correctionStyle,
      isLiveConnected,
      level,
      selectedScenario.partnerRole,
      selectedScenario.promptContext,
      selectedScenario.title,
      sendLiveText,
      transcript,
    ]
  );

  const handleExplainPhrase = useCallback(
    async (turn: TranscriptTurn): Promise<PhraseExplanation | null> => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phrase: turn.text,
            languageName: activeLanguage.name,
            level,
            context: selectedScenario.title,
          }),
        });
        const data = await res.json();
        if (!res.ok) return null;
        return data as PhraseExplanation;
      } catch {
        return null;
      }
    },
    [activeLanguage.name, level, selectedScenario.title]
  );

  const handleSpeakText = useCallback(
    async (text: string, key: string) => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (speakingKey === key) {
        setSpeakingKey(null);
        return;
      }

      setSpeakingKey(key);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceName,
            languageName: activeLanguage.name,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.audioBase64) {
          setSpeakingKey(null);
          return;
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        ttsAudioRef.current = audio;
        audio.onended = () => setSpeakingKey(null);
        audio.onerror = () => setSpeakingKey(null);
        await audio.play();
      } catch {
        setSpeakingKey(null);
      }
    },
    [activeLanguage.name, speakingKey, voiceName]
  );

  const handleSavePhrase = useCallback(
    (
      phrase: string,
      translation: string,
      phoneticGuide: string,
      note: string
    ) => {
      const clean = phrase.trim();
      if (!clean) return;
      setSavedPhrases((prev) => {
        if (prev.some((p) => p.phrase.trim() === clean)) {
          return prev;
        }
        const entry: SavedPhrase = {
          id: `phrase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          languageName: activeLanguage.name,
          phrase: clean,
          translation,
          phoneticGuide,
          note,
          savedAt: new Date().toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
        };
        return [entry, ...prev];
      });
    },
    [activeLanguage.name]
  );

  const handleRemovePhrase = useCallback((id: string) => {
    setSavedPhrases((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleGenerateReview = useCallback(async () => {
    if (transcript.length === 0) return;
    setReviewLoading(true);
    setReviewError(null);
    setActiveTab("review");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageName: activeLanguage.name,
          level,
          scenarioTitle: selectedScenario.title,
          transcript: transcript.map((t) => ({ role: t.role, text: t.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Unable to analyze session.");
      } else {
        setReview(data as SessionReview);
      }
    } catch {
      setReviewError("Network error while analyzing your conversation.");
    } finally {
      setReviewLoading(false);
    }
  }, [activeLanguage.name, level, selectedScenario.title, transcript]);

  const jumpToDeckTab = (tab: DeckTab) => {
    setActiveTab(tab);
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F7] text-zinc-900">
      {/* Strict 3-Zone Single-Row Top Bar */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#studio"
            className="font-display text-xl font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            Cadence
          </a>

          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
          >
            <a
              href="#studio"
              onClick={() => setActiveTab("coach")}
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Practice
            </a>
            <a
              href="#scenarios"
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Scenarios
            </a>
            <button
              type="button"
              onClick={() => jumpToDeckTab("phrasebook")}
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Phrasebook
            </button>
            <button
              type="button"
              onClick={() => jumpToDeckTab("review")}
              className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Review
            </button>
          </nav>

          <div className="shrink-0">
            {isLiveConnected || connectionState === "connecting" ? (
              <button
                type="button"
                onClick={stopSession}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                End Session
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartVoice}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Voice
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <div
          id="studio"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className="lg:col-span-8 space-y-6">
            <AcousticStage
              languageName={activeLanguage.name}
              nativeName={activeLanguage.nativeName}
              level={level}
              scenarioTitle={selectedScenario.title}
              partnerRole={selectedScenario.partnerRole}
              connectionState={connectionState}
              isMuted={isMuted}
              micLevel={micLevel}
              speakerLevel={speakerLevel}
              isPartnerSpeaking={isPartnerSpeaking}
              elapsedSeconds={elapsedSeconds}
              errorMessage={errorMessage}
              onStartVoice={handleStartVoice}
              onStopVoice={stopSession}
              onToggleMute={toggleMute}
              onRequestSlower={handleRequestSlower}
              onRequestHint={handleRequestHint}
              hintLoading={hintLoading}
            />

            <TranscriptFeed
              turns={transcript}
              partnerRole={selectedScenario.partnerRole}
              languageName={activeLanguage.name}
              isLiveConnected={isLiveConnected}
              isSendingText={isSendingText}
              onSendText={handleSendText}
              onExplainPhrase={handleExplainPhrase}
              onSavePhrase={handleSavePhrase}
              onSpeakText={handleSpeakText}
              speakingKey={speakingKey}
              savedPhrasesSet={savedPhrasesSet}
            />
          </div>

          <div className="lg:col-span-4">
            <CoachingDeck
              activeTab={activeTab}
              onTabChange={setActiveTab}
              languageCode={languageCode}
              onLanguageChange={(code) => {
                if (isLiveConnected) stopSession();
                setLanguageCode(code);
                setSuggestions([]);
              }}
              level={level}
              onLevelChange={setLevel}
              correctionStyle={correctionStyle}
              onCorrectionStyleChange={setCorrectionStyle}
              voiceName={voiceName}
              onVoiceChange={setVoiceName}
              scenario={selectedScenario}
              isLiveConnected={isLiveConnected}
              suggestions={suggestions}
              onUseSuggestion={handleSendText}
              onSpeakText={handleSpeakText}
              speakingKey={speakingKey}
              savedPhrases={savedPhrases}
              onRemovePhrase={handleRemovePhrase}
              onSavePhrase={handleSavePhrase}
              review={review}
              reviewLoading={reviewLoading}
              reviewError={reviewError}
              hasTranscript={transcript.length > 0}
              onGenerateReview={handleGenerateReview}
            />
          </div>
        </div>

        <ScenarioGrid
          scenarios={scenarios}
          selectedId={selectedScenario.id}
          onSelectScenario={handleSelectScenario}
          onCreateCustomScenario={handleCreateCustomScenario}
        />
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>Cadence Language Studio</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleResetSession}
              className="hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Clear Current Transcript
            </button>
            <a
              href="#scenarios"
              className="hover:text-zinc-900 transition-colors"
            >
              Browse Scenarios
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
