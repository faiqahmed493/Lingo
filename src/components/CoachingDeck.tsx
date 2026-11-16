import { useState } from "react";
import {
  Bookmark,
  Check,
  Search,
  Send,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  CORRECTION_STYLES,
  LANGUAGES,
  LEVELS,
  VOICES,
} from "../data/curriculum";
import {
  CorrectionStyle,
  LiveVoiceName,
  ProficiencyLevel,
  SavedPhrase,
  ScenarioOption,
  SessionReview,
  SuggestedReply,
} from "../types/session";

export type DeckTab = "coach" | "phrasebook" | "review";

interface CoachingDeckProps {
  activeTab: DeckTab;
  onTabChange: (tab: DeckTab) => void;
  languageCode: string;
  onLanguageChange: (code: string) => void;
  level: ProficiencyLevel;
  onLevelChange: (level: ProficiencyLevel) => void;
  correctionStyle: CorrectionStyle;
  onCorrectionStyleChange: (style: CorrectionStyle) => void;
  voiceName: LiveVoiceName;
  onVoiceChange: (voice: LiveVoiceName) => void;
  scenario: ScenarioOption;
  isLiveConnected: boolean;
  suggestions: SuggestedReply[];
  onUseSuggestion: (text: string) => void;
  onSpeakText: (text: string, key: string) => void;
  speakingKey: string | null;
  savedPhrases: SavedPhrase[];
  onRemovePhrase: (id: string) => void;
  onSavePhrase: (
    phrase: string,
    translation: string,
    phoneticGuide: string,
    note: string
  ) => void;
  review: SessionReview | null;
  reviewLoading: boolean;
  reviewError: string | null;
  hasTranscript: boolean;
  onGenerateReview: () => void;
}

export function CoachingDeck({
  activeTab,
  onTabChange,
  languageCode,
  onLanguageChange,
  level,
  onLevelChange,
  correctionStyle,
  onCorrectionStyleChange,
  voiceName,
  onVoiceChange,
  scenario,
  isLiveConnected,
  suggestions,
  onUseSuggestion,
  onSpeakText,
  speakingKey,
  savedPhrases,
  onRemovePhrase,
  onSavePhrase,
  review,
  reviewLoading,
  reviewError,
  hasTranscript,
  onGenerateReview,
}: CoachingDeckProps) {
  const [phraseQuery, setPhraseQuery] = useState("");

  const filteredPhrases = savedPhrases.filter((p) => {
    const q = phraseQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.phrase.toLowerCase().includes(q) ||
      p.translation.toLowerCase().includes(q) ||
      p.languageName.toLowerCase().includes(q)
    );
  });

  return (
    <aside
      aria-label="Coaching and Phrasebook Deck"
      className="bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden"
    >
      {/* Segmented Control Tabs */}
      <div className="p-3 border-b border-zinc-100 bg-zinc-50/70">
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => onTabChange("coach")}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "coach"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Coach
          </button>
          <button
            type="button"
            onClick={() => onTabChange("phrasebook")}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "phrasebook"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Phrasebook ({savedPhrases.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange("review")}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "review"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Review
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[760px]">
        {activeTab === "coach" && (
          <>
            {/* Live Suggested Replies */}
            {suggestions.length > 0 && (
              <div className="space-y-3 pb-5 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Suggested Replies</span>
                  </h3>
                  <span className="text-xs text-zinc-400">Tap to speak or send</span>
                </div>

                <div className="space-y-2.5">
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-2"
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {item.targetText}
                      </p>
                      <p className="text-xs font-mono text-zinc-500">
                        {item.phoneticGuide}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {item.englishMeaning}
                      </p>
                      <div className="pt-1 flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            onSpeakText(item.targetText, `hint-${idx}`)
                          }
                          className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>
                            {speakingKey === `hint-${idx}` ? "Playing…" : "Hear"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUseSuggestion(item.targetText)}
                          className="inline-flex items-center gap-1 font-medium text-zinc-700 hover:text-zinc-900 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Setup */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Partner Settings
                </h3>
                {isLiveConnected && (
                  <span className="text-xs text-zinc-400">
                    Applies on next session
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="target-language"
                  className="block text-xs font-medium text-zinc-600 mb-1.5"
                >
                  Target Language
                </label>
                <select
                  id="target-language"
                  value={languageCode}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} — {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Proficiency Level
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onLevelChange(lvl.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        level === lvl.id
                          ? "bg-zinc-900 border-zinc-900 text-white"
                          : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {lvl.shortLabel}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {LEVELS.find((l) => l.id === level)?.description}
                </p>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Feedback Style
                </span>
                <div className="space-y-1.5">
                  {CORRECTION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onCorrectionStyleChange(style.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                        correctionStyle === style.id
                          ? "bg-blue-50/70 border-blue-200 text-zinc-900"
                          : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {style.label}
                        </span>
                        {correctionStyle === style.id && (
                          <Check className="w-3.5 h-3.5 text-blue-700" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {style.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="voice-select"
                  className="block text-xs font-medium text-zinc-600 mb-1.5"
                >
                  Partner Voice
                </label>
                <select
                  id="voice-select"
                  value={voiceName}
                  onChange={(e) =>
                    onVoiceChange(e.target.value as LiveVoiceName)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {v.character}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scenario Objectives */}
            <div className="pt-5 border-t border-zinc-100 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Scene Goals
              </h3>
              <ul className="space-y-2">
                {scenario.objectives.map((obj, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed"
                  >
                    <span className="font-mono text-zinc-400 tabular-nums mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {activeTab === "phrasebook" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phraseQuery}
                onChange={(e) => setPhraseQuery(e.target.value)}
                placeholder="Search saved phrases…"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            {filteredPhrases.length === 0 ? (
              <div className="py-12 text-center space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">
                  {savedPhrases.length === 0
                    ? "Your phrasebook is empty"
                    : "No matching phrases"}
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Save expressions directly from the live transcript or from your session review to build a personal audio deck.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPhrases.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-zinc-400">
                        <span>{item.languageName}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.savedAt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemovePhrase(item.id)}
                        aria-label="Remove saved phrase"
                        className="text-zinc-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-zinc-900">
                      {item.phrase}
                    </p>
                    {item.phoneticGuide && (
                      <p className="text-xs font-mono text-zinc-500">
                        {item.phoneticGuide}
                      </p>
                    )}
                    {item.translation && (
                      <p className="text-xs text-zinc-700">
                        {item.translation}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-zinc-500">{item.note}</p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onSpeakText(item.phrase, item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {speakingKey === item.id ? "Playing…" : "Listen"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "review" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Coaching Review
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Concrete phrasing upgrades from your conversation.
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateReview}
                disabled={!hasTranscript || reviewLoading}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reviewLoading
                  ? "Analyzing…"
                  : review
                  ? "Refresh Review"
                  : "Analyze Session"}
              </button>
            </div>

            {reviewError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {reviewError}
              </div>
            )}

            {!review && !reviewLoading && (
              <div className="py-12 text-center space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">
                  {hasTranscript
                    ? "Ready to review your dialogue"
                    : "Have a conversation first"}
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  {hasTranscript
                    ? "Click Analyze Session to receive personalized strengths, phrasing upgrades, and vocabulary."
                    : "Complete a couple of voice or text turns, then generate tailored feedback."}
                </p>
              </div>
            )}

            {review && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 leading-relaxed">
                  {review.summary}
                </div>

                {review.strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      What Worked Well
                    </h4>
                    <ul className="space-y-1.5">
                      {review.strengths.map((s, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-zinc-700 leading-relaxed"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.upgrades.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-100">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Phrasing Upgrades
                    </h4>
                    <div className="space-y-2.5">
                      {review.upgrades.map((u, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-zinc-200 space-y-1.5 text-xs"
                        >
                          <p className="text-zinc-500 line-through">
                            {u.original}
                          </p>
                          <p className="text-sm font-medium text-zinc-900">
                            {u.improved}
                          </p>
                          <p className="text-zinc-600 leading-relaxed">
                            {u.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {review.extractedPhrases.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-100">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Vocabulary to Keep
                    </h4>
                    <div className="space-y-2">
                      {review.extractedPhrases.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-zinc-200 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-zinc-900">
                              {p.term}
                            </p>
                            <p className="font-mono text-zinc-500">
                              {p.reading}
                            </p>
                            <p className="text-zinc-700">{p.meaning}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onSavePhrase(p.term, p.meaning, p.reading, p.note)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium shrink-0 cursor-pointer"
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
