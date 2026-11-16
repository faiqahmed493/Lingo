import { useCallback, useEffect, useRef, useState } from "react";
import {
  CorrectionStyle,
  LiveConnectionState,
  LiveVoiceName,
  ProficiencyLevel,
  TranscriptTurn,
} from "../types/session";

export interface StartLiveParams {
  languageName: string;
  level: ProficiencyLevel;
  correctionStyle: CorrectionStyle;
  voiceName: LiveVoiceName;
  scenarioTitle: string;
  partnerRole: string;
  scenarioPrompt: string;
  autoGreet?: boolean;
}

function downsampleTo16k(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (inputSampleRate === 16000) return input;
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.floor(input.length / ratio);
  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[idx + 1] ?? s0;
    result[i] = s0 + (s1 - s0) * frac;
  }
  return result;
}

function float32ToBase64Pcm16(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(
      i * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const float32 = new Float32Array(bytes.byteLength / 2);
  for (let i = 0; i < float32.length; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function formatNow(): string {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function useLiveVoice(
  onTranscriptUpdate: React.Dispatch<React.SetStateAction<TranscriptTurn[]>>
) {
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const isMutedRef = useRef(false);

  const currentUserTurnIdRef = useRef<string | null>(null);
  const currentAssistantTurnIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const stopOutputPlayback = useCallback(() => {
    for (const node of activeSourcesRef.current) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // ignore already stopped
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsPartnerSpeaking(false);
    setSpeakerLevel(0);
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopOutputPlayback();

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }
    outputAnalyserRef.current = null;

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stop" }));
        }
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    currentUserTurnIdRef.current = null;
    currentAssistantTurnIdRef.current = null;
    setMicLevel(0);
    setSpeakerLevel(0);
    setIsPartnerSpeaking(false);
  }, [stopOutputPlayback]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const appendStreamingTranscript = useCallback(
    (role: "user" | "assistant", chunkText: string) => {
      if (!chunkText) return;

      const refToUse =
        role === "user" ? currentUserTurnIdRef : currentAssistantTurnIdRef;
      const otherRef =
        role === "user" ? currentAssistantTurnIdRef : currentUserTurnIdRef;

      // Seal the opposite turn if still open
      if (otherRef.current) {
        const sealedId = otherRef.current;
        otherRef.current = null;
        onTranscriptUpdate((prev) =>
          prev.map((t) =>
            t.id === sealedId ? { ...t, isStreaming: false } : t
          )
        );
      }

      if (!refToUse.current) {
        const newId = `${role}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        refToUse.current = newId;
        onTranscriptUpdate((prev) => [
          ...prev,
          {
            id: newId,
            role,
            text: chunkText,
            timestamp: formatNow(),
            isStreaming: true,
          },
        ]);
      } else {
        const activeId = refToUse.current;
        onTranscriptUpdate((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, text: t.text + chunkText } : t
          )
        );
      }
    },
    [onTranscriptUpdate]
  );

  const finalizeTurns = useCallback(() => {
    const userId = currentUserTurnIdRef.current;
    const assistantId = currentAssistantTurnIdRef.current;
    currentUserTurnIdRef.current = null;
    currentAssistantTurnIdRef.current = null;
    if (!userId && !assistantId) return;

    onTranscriptUpdate((prev) =>
      prev.map((t) =>
        t.id === userId || t.id === assistantId
          ? { ...t, isStreaming: false }
          : t
      )
    );
  }, [onTranscriptUpdate]);

  const playAudioChunk = useCallback((base64Data: string) => {
    const ctx = outputCtxRef.current;
    const analyser = outputAnalyserRef.current;
    if (!ctx || !analyser) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const float32 = base64Pcm16ToFloat32(base64Data);
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(float32), 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);

    const now = ctx.currentTime;
    const startTime = Math.max(now + 0.02, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    setIsPartnerSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsPartnerSpeaking(false);
      }
    };
  }, []);

  const startSession = useCallback(
    async (params: StartLiveParams) => {
      cleanup();
      setErrorMessage(null);
      setConnectionState("connecting");
      setElapsedSeconds(0);
      setIsMuted(false);
      isMutedRef.current = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputCtxRef.current = inputCtx;
        outputCtxRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        const outputAnalyser = outputCtx.createAnalyser();
        outputAnalyser.fftSize = 128;
        outputAnalyser.connect(outputCtx.destination);
        outputAnalyserRef.current = outputAnalyser;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
        wsRef.current = ws;

        const dataArray = new Uint8Array(outputAnalyser.frequencyBinCount);
        const pollOutput = () => {
          if (outputAnalyserRef.current && activeSourcesRef.current.size > 0) {
            outputAnalyserRef.current.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const v = (dataArray[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            setSpeakerLevel(Math.min(1, rms * 3.8));
          } else {
            setSpeakerLevel(0);
          }
          rafRef.current = requestAnimationFrame(pollOutput);
        };
        rafRef.current = requestAnimationFrame(pollOutput);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "start",
              ...params,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "ready") {
              setConnectionState("connected");
              timerRef.current = window.setInterval(() => {
                setElapsedSeconds((s) => s + 1);
              }, 1000);

              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              sourceRef.current = source;
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (
                  !wsRef.current ||
                  wsRef.current.readyState !== WebSocket.OPEN
                ) {
                  return;
                }
                const channel = e.inputBuffer.getChannelData(0);
                if (isMutedRef.current) {
                  setMicLevel(0);
                  return;
                }

                let sum = 0;
                for (let i = 0; i < channel.length; i++) {
                  sum += channel[i] * channel[i];
                }
                const rms = Math.sqrt(sum / channel.length);
                setMicLevel(Math.min(1, rms * 5.2));

                const resampled = downsampleTo16k(channel, inputCtx.sampleRate);
                const base64 = float32ToBase64Pcm16(resampled);
                wsRef.current.send(
                  JSON.stringify({ type: "audio", data: base64 })
                );
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            } else if (msg.type === "audio" && msg.data) {
              playAudioChunk(msg.data);
            } else if (msg.type === "inputTranscript" && msg.text) {
              appendStreamingTranscript("user", msg.text);
            } else if (msg.type === "outputTranscript" && msg.text) {
              appendStreamingTranscript("assistant", msg.text);
            } else if (msg.type === "interrupted") {
              stopOutputPlayback();
              finalizeTurns();
            } else if (msg.type === "turnComplete") {
              finalizeTurns();
            } else if (msg.type === "error") {
              setErrorMessage(
                msg.message || "Live voice session encountered an error."
              );
              setConnectionState("error");
              cleanup();
            } else if (msg.type === "closed") {
              finalizeTurns();
              setConnectionState("idle");
              cleanup();
            }
          } catch {
            // ignore malformed JSON frames
          }
        };

        ws.onerror = () => {
          setErrorMessage(
            "Unable to establish real-time audio connection. Please try again."
          );
          setConnectionState("error");
          cleanup();
        };

        ws.onclose = () => {
          finalizeTurns();
          setConnectionState((prev) => (prev === "error" ? prev : "idle"));
        };
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Microphone permission is required for voice conversations.";
        setErrorMessage(msg);
        setConnectionState("error");
        cleanup();
      }
    },
    [
      appendStreamingTranscript,
      cleanup,
      finalizeTurns,
      playAudioChunk,
      stopOutputPlayback,
    ]
  );

  const stopSession = useCallback(() => {
    finalizeTurns();
    cleanup();
    setConnectionState("idle");
  }, [cleanup, finalizeTurns]);

  const sendLiveText = useCallback(
    (text: string, addToTranscript = true) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return false;
      }
      if (addToTranscript) {
        finalizeTurns();
        onTranscriptUpdate((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: "user",
            text,
            timestamp: formatNow(),
          },
        ]);
      }
      wsRef.current.send(JSON.stringify({ type: "text", text }));
      return true;
    },
    [finalizeTurns, onTranscriptUpdate]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
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
    clearError: () => setErrorMessage(null),
  };
}
