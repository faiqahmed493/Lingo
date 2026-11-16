import { Mic, MicOff, PhoneOff, Sparkles, Volume2, RotateCcw } from "lucide-react";
import { LiveConnectionState } from "../types/session";

interface AcousticStageProps {
  languageName: string;
  nativeName: string;
  level: string;
  scenarioTitle: string;
  partnerRole: string;
  connectionState: LiveConnectionState;
  isMuted: boolean;
  micLevel: number;
  speakerLevel: number;
  isPartnerSpeaking: boolean;
  elapsedSeconds: number;
  errorMessage: string | null;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onToggleMute: () => void;
  onRequestSlower: () => void;
  onRequestHint: () => void;
  hintLoading: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AcousticStage({
  languageName,
  nativeName,
  level,
  scenarioTitle,
  partnerRole,
  connectionState,
  isMuted,
  micLevel,
  speakerLevel,
  isPartnerSpeaking,
  elapsedSeconds,
  errorMessage,
  onStartVoice,
  onStopVoice,
  onToggleMute,
  onRequestSlower,
  onRequestHint,
  hintLoading,
}: AcousticStageProps) {
  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

  // 20 harmonic bars driven cleanly by live mic or partner speaker amplitude
  const bars = Array.from({ length: 20 }, (_, i) => {
    const centerDist = Math.abs(i - 9.5) / 9.5;
    const envelope = Math.cos(centerDist * (Math.PI / 2));
    const energy = isPartnerSpeaking ? speakerLevel : isMuted ? 0 : micLevel;
    const baseHeight = isConnected ? 18 : 10;
    const dynamicHeight = energy * envelope * 68;
    const jitter = isConnected && energy > 0.04 ? ((i * 17) % 11) * energy : 0;
    return Math.min(92, Math.max(10, Math.round(baseHeight + dynamicHeight + jitter)));
  });

  return (
    <section
      aria-label="Live Voice Studio"
      className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-zinc-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <span>{languageName} ({nativeName})</span>
            <span aria-hidden="true">·</span>
            <span>{level}</span>
            <span aria-hidden="true">·</span>
            <span>Partner: {partnerRole}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">
            {scenarioTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-700">
              <span
                className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"
                aria-hidden="true"
              />
              <span>Live Audio</span>
              <span className="font-mono tabular-nums text-zinc-500">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
          ) : isConnecting ? (
            <span className="text-xs font-medium text-blue-700">
              Connecting microphone…
            </span>
          ) : (
            <span className="text-xs text-zinc-500">
              Ready for voice or text practice
            </span>
          )}
        </div>
      </div>

      {/* Live Acoustic Presence Bar */}
      <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 w-full sm:w-auto">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors shrink-0 ${
              isConnected
                ? isPartnerSpeaking
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-zinc-900 border-zinc-900 text-white"
                : "bg-zinc-50 border-zinc-200 text-zinc-500"
            }`}
          >
            {isPartnerSpeaking ? (
              <Volume2 className="w-6 h-6" />
            ) : isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">
              {isConnected
                ? isPartnerSpeaking
                  ? `${partnerRole} is speaking`
                  : isMuted
                  ? "Microphone muted"
                  : "Listening — speak naturally"
                : isConnecting
                ? "Opening real-time voice channel"
                : "Start a live voice session"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {isConnected
                ? "Interrupt anytime by speaking, or tap Slower if you need a gentler pace."
                : "Low-latency bidirectional voice with instant bilingual transcription."}
            </p>
          </div>
        </div>

        {/* Harmonic Waveform Bars */}
        <div
          className="flex items-center justify-center gap-1 h-12 px-4 py-2 bg-zinc-50 border border-zinc-200/80 rounded-xl w-full sm:w-56 shrink-0"
          aria-hidden="true"
        >
          {bars.map((height, idx) => (
            <span
              key={idx}
              style={{ height: `${height}%` }}
              className={`w-1 rounded-full transition-[height] duration-75 ${
                isConnected
                  ? isPartnerSpeaking
                    ? "bg-blue-600"
                    : isMuted
                    ? "bg-zinc-300"
                    : "bg-zinc-800"
                  : "bg-zinc-300"
              }`}
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3"
        >
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tactile Call Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100">
        <div className="flex flex-wrap items-center gap-2.5">
          {!isConnected && !isConnecting ? (
            <button
              type="button"
              onClick={onStartVoice}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Mic className="w-4 h-4" />
              <span>Start Voice Session</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onStopVoice}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Session</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                disabled={!isConnected}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                  isMuted
                    ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRequestSlower}
            disabled={!isConnected}
            title="Ask your partner to repeat more slowly"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeat Slower</span>
          </button>

          <button
            type="button"
            onClick={onRequestHint}
            disabled={hintLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span>{hintLoading ? "Thinking…" : "Suggest Reply"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
