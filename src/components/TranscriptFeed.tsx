import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  Check,
  Send,
  Volume2,
  X,
} from "lucide-react";
import {
  PhraseExplanation,
  TranscriptTurn,
} from "../types/session";

interface TranscriptFeedProps {
  turns: TranscriptTurn[];
  partnerRole: string;
  languageName: string;
  isLiveConnected: boolean;
  isSendingText: boolean;
  onSendText: (text: string) => void;
  onExplainPhrase: (turn: TranscriptTurn) => Promise<PhraseExplanation | null>;
  onSavePhrase: (
    phrase: string,
    translation: string,
    phoneticGuide: string,
    note: string
  ) => void;
  onSpeakText: (text: string, key: string) => void;
  speakingKey: string | null;
  savedPhrasesSet: Set<string>;
}

export function TranscriptFeed({
  turns,
  partnerRole,
  languageName,
  isLiveConnected,
  isSendingText,
  onSendText,
  onExplainPhrase,
  onSavePhrase,
  onSpeakText,
  speakingKey,
  savedPhrasesSet,
}: TranscriptFeedProps) {
  const [draft, setDraft] = useState("");
  const [explanations, setExplanations] = useState<
    Record<string, PhraseExplanation>
  >({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);
  const [openExplainId, setOpenExplainId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, turns[turns.length - 1]?.text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSendingText) return;
    onSendText(trimmed);
    setDraft("");
  };

  const handleExplainClick = async (turn: TranscriptTurn) => {
    if (openExplainId === turn.id) {
      setOpenExplainId(null);
      return;
    }
    if (explanations[turn.id]) {
      setOpenExplainId(turn.id);
      return;
    }
    setLoadingExplainId(turn.id);
    const result = await onExplainPhrase(turn);
    setLoadingExplainId(null);
    if (result) {
      setExplanations((prev) => ({ ...prev, [turn.id]: result }));
      setOpenExplainId(turn.id);
    }
  };

  return (
    <section
      aria-label="Conversation Transcript"
      className="bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-medium text-zinc-900">
            Live Transcript
          </h2>
          <p className="text-xs text-zinc-500">
            Tap any {partnerRole} line to translate, hear pronunciation, or save phrases.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-zinc-400">
          {turns.length} {turns.length === 1 ? "turn" : "turns"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="p-6 space-y-5 min-h-[320px] max-h-[460px] overflow-y-auto bg-[#FCFCFB]"
      >
        {turns.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <p className="font-display text-lg text-zinc-800">
              Your conversation appears here in real time
            </p>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              Press <span className="font-medium text-zinc-800">Start Voice Session</span> above to speak naturally in {languageName}, or type a message below to practice by text.
            </p>
          </div>
        ) : (
          turns.map((turn) => {
            const isUser = turn.role === "user";
            const explanation = explanations[turn.id];
            const isExplainOpen = openExplainId === turn.id && explanation;
            const isSaved = savedPhrasesSet.has(turn.text.trim());

            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 px-1">
                  <span className="font-medium text-zinc-600">
                    {isUser ? "You" : partnerRole}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{turn.timestamp}</span>
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    isUser
                      ? "bg-zinc-900 text-white"
                      : "bg-white border border-zinc-200 text-zinc-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {turn.text}
                    {turn.isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-blue-600 animate-pulse" />
                    )}
                  </p>

                  {turn.tip && (
                    <p className="mt-2.5 pt-2.5 border-t border-zinc-100 text-xs text-amber-800">
                      Coach note: {turn.tip}
                    </p>
                  )}

                  {!isUser && !turn.isStreaming && turn.text.trim().length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => handleExplainClick(turn)}
                        disabled={loadingExplainId === turn.id}
                        className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>
                          {loadingExplainId === turn.id
                            ? "Analyzing…"
                            : isExplainOpen
                            ? "Hide Breakdown"
                            : "Break Down"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSpeakText(turn.text, turn.id)}
                        className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {speakingKey === turn.id ? "Playing…" : "Replay"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSavePhrase(
                            turn.text.trim(),
                            explanation?.translation ?? "",
                            explanation?.phoneticGuide ?? "",
                            explanation?.grammarNote ?? `From ${partnerRole}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-700">Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isExplainOpen && (
                  <div className="mt-2 max-w-[88%] w-full rounded-xl bg-white border border-zinc-200 p-4 text-xs text-zinc-700 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                          Meaning
                        </p>
                        <p className="text-sm font-medium text-zinc-900 mt-0.5">
                          {explanation.translation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenExplainId(null)}
                        aria-label="Close breakdown"
                        className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                      <div>
                        <p className="text-zinc-400 font-medium">Phonetics</p>
                        <p className="font-mono text-zinc-800 mt-0.5">
                          {explanation.phoneticGuide}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-medium">Literal</p>
                        <p className="text-zinc-700 mt-0.5">
                          {explanation.literalMeaning}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100">
                      <p className="text-zinc-400 font-medium">Usage Note</p>
                      <p className="text-zinc-700 mt-0.5 leading-relaxed">
                        {explanation.grammarNote}
                      </p>
                    </div>

                    {explanation.keyVocabulary.length > 0 && (
                      <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                        <p className="text-zinc-400 font-medium">
                          Key Vocabulary
                        </p>
                        <div className="divide-y divide-zinc-100">
                          {explanation.keyVocabulary.map((item, idx) => (
                            <div
                              key={idx}
                              className="py-1.5 flex items-baseline justify-between gap-3"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-zinc-900">
                                  {item.term}
                                </span>
                                <span className="font-mono text-zinc-500">
                                  {item.reading}
                                </span>
                              </div>
                              <span className="text-zinc-600 text-right">
                                {item.meaning}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Text Fallback / Live Nudge Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-zinc-100 flex items-center gap-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isLiveConnected
              ? `Send a text reply in ${languageName} during the call…`
              : `Type a practice message in ${languageName}…`
          }
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSendingText}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSendingText ? "Sending…" : "Send"}</span>
        </button>
      </form>
    </section>
  );
}
