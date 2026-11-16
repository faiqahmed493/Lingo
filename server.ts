import "dotenv/config";
import http from "node:http";
import path from "node:path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from "@google/genai";

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface StartLiveConfig {
  languageName: string;
  level: string;
  correctionStyle: "gentle" | "explicit" | "immersion";
  voiceName: string;
  scenarioTitle: string;
  partnerRole: string;
  scenarioPrompt: string;
}

function buildTutorSystemInstruction(cfg: StartLiveConfig): string {
  const levelGuide =
    cfg.level === "A1-A2"
      ? "Speak clearly at a slightly slower, deliberate pace using high-frequency everyday vocabulary and short sentences (1–2 sentences per turn). Avoid rare idioms."
      : cfg.level === "B1-B2"
      ? "Speak at a natural conversational pace with everyday expressions, follow-up questions, and clear phrasing."
      : "Speak at full native cadence with rich nuance, idiomatic phrasing, and intellectually engaging follow-ups.";

  const correctionGuide =
    cfg.correctionStyle === "gentle"
      ? "If the learner makes a noticeable grammar or word-choice mistake, naturally recast the correct phrasing inside your reply without lecturing or breaking character."
      : cfg.correctionStyle === "explicit"
      ? "Stay warm and conversational, and when the learner makes an important grammar or phrasing mistake, briefly offer a kind 1-sentence correction before continuing the roleplay."
      : "Stay 100% immersed in the target language and in character. Never switch to English unless the learner explicitly asks for help.";

  return [
    `You are a native-level ${cfg.languageName} conversation partner playing the role of "${cfg.partnerRole}" in the scenario "${cfg.scenarioTitle}".`,
    `Scenario context: ${cfg.scenarioPrompt}`,
    `Learner level (${cfg.level}): ${levelGuide}`,
    `Coaching approach: ${correctionGuide}`,
    `Speak predominantly in ${cfg.languageName}. Keep turns concise and interactive—always invite the learner back into the conversation with a natural question or prompt. Do not use markdown formatting, asterisks, or stage directions in spoken output.`,
  ].join("\n\n");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/explain", async (req, res) => {
    try {
      const { phrase, languageName, level, context } = req.body ?? {};
      if (!phrase || typeof phrase !== "string") {
        res.status(400).json({ error: "A phrase is required for breakdown." });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Break down this ${languageName || "target language"} phrase for a ${
          level || "B1-B2"
        } learner.\n\nPhrase: "${phrase}"${
          context ? `\nConversation context: "${context}"` : ""
        }`,
        config: {
          systemInstruction:
            "You are a concise, precise language tutor. Provide accurate natural English translation, literal structural gloss, easy-to-read phonetic pronunciation guide for an English speaker, a brief grammar/usage note (max 2 sentences), and 2 to 4 key vocabulary items.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              phrase: { type: Type.STRING },
              translation: { type: Type.STRING },
              literalMeaning: { type: Type.STRING },
              phoneticGuide: { type: Type.STRING },
              grammarNote: { type: Type.STRING },
              keyVocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    reading: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                  required: ["term", "reading", "meaning"],
                },
              },
            },
            required: [
              "phrase",
              "translation",
              "literalMeaning",
              "phoneticGuide",
              "grammarNote",
              "keyVocabulary",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to explain phrase.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/hint", async (req, res) => {
    try {
      const { languageName, level, scenarioTitle, recentTurns } =
        req.body ?? {};
      const ai = getAiClient();

      const historyText = Array.isArray(recentTurns)
        ? recentTurns
            .slice(-6)
            .map(
              (t: { role: string; text: string }) =>
                `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`
            )
            .join("\n")
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Scenario: ${scenarioTitle || "Everyday conversation"}\nTarget Language: ${
          languageName || "Spanish"
        }\nLearner Level: ${
          level || "B1-B2"
        }\n\nRecent turns:\n${
          historyText || "(Conversation is just starting)"
        }\n\nProvide 3 natural, varied things the learner could say next.`,
        config: {
          systemInstruction:
            "Provide 3 practical, idiomatic spoken reply options appropriate for the learner's CEFR level, with a clear phonetic pronunciation guide and natural English meaning.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    targetText: { type: Type.STRING },
                    phoneticGuide: { type: Type.STRING },
                    englishMeaning: { type: Type.STRING },
                  },
                  required: ["targetText", "phoneticGuide", "englishMeaning"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"suggestions":[]}').trim());
      res.json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate hints.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/review", async (req, res) => {
    try {
      const { languageName, level, scenarioTitle, transcript } = req.body ?? {};
      if (!Array.isArray(transcript) || transcript.length === 0) {
        res
          .status(400)
          .json({ error: "Complete at least one exchange before reviewing." });
        return;
      }

      const ai = getAiClient();
      const formatted = transcript
        .map(
          (t: { role: string; text: string }) =>
            `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`
        )
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Language: ${languageName}\nLevel: ${level}\nScenario: ${scenarioTitle}\n\nTranscript:\n${formatted}\n\nGenerate an encouraging, concrete coaching review based strictly on the transcript above.`,
        config: {
          systemInstruction:
            "You are an expert language coach. Analyze the learner's turns in the transcript. Give a warm 2-sentence summary, 2-3 specific strengths observed, up to 3 concrete phrasing upgrades referencing what the learner actually said (or useful upgrades from the dialogue if the learner spoke briefly), and 3-4 high-value vocabulary phrases from the session worth saving.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              upgrades: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    improved: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["original", "improved", "explanation"],
                },
              },
              extractedPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    reading: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ["term", "reading", "meaning", "note"],
                },
              },
            },
            required: ["summary", "strengths", "upgrades", "extractedPhrases"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate review.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const {
        languageName,
        level,
        correctionStyle,
        scenarioTitle,
        partnerRole,
        scenarioPrompt,
        history,
        message,
      } = req.body ?? {};

      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const ai = getAiClient();
      const sys = buildTutorSystemInstruction({
        languageName: languageName || "Spanish",
        level: level || "B1-B2",
        correctionStyle: correctionStyle || "gentle",
        voiceName: "Zephyr",
        scenarioTitle: scenarioTitle || "Everyday Practice",
        partnerRole: partnerRole || "Conversation Partner",
        scenarioPrompt:
          scenarioPrompt || "Have a natural everyday conversation.",
      });

      const historyText = Array.isArray(history)
        ? history
            .slice(-10)
            .map(
              (t: { role: string; text: string }) =>
                `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`
            )
            .join("\n")
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `${
          historyText ? `Conversation so far:\n${historyText}\n\n` : ""
        }Learner just said: "${message}"\n\nRespond naturally in character, and optionally provide a concise English coaching tip if helpful.`,
        config: {
          systemInstruction: sys,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  "The partner's natural spoken reply in the target language.",
              },
              gentleTip: {
                type: Type.STRING,
                description:
                  "Optional short 1-sentence coaching tip in English if there was an error or helpful nuance, otherwise empty string.",
              },
            },
            required: ["reply", "gentleTip"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName, languageName } = req.body ?? {};
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Text is required for speech." });
        return;
      }

      const ai = getAiClient("v1beta");
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text,
                speechMetadata: {
                  style: `Clear, natural native ${
                    languageName || "language"
                  } pronunciation for a language learner`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Zephyr" },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: "No audio returned by speech model." });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to synthesize speech.";
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url && req.url.startsWith("/live")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs: WebSocket) => {
    let session: Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null =
      null;
    let isClosing = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    clientWs.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "start") {
          if (session) {
            try {
              session.close();
            } catch {
              // ignore cleanup errors
            }
            session = null;
          }

          const config: StartLiveConfig = {
            languageName: msg.languageName || "Spanish",
            level: msg.level || "B1-B2",
            correctionStyle: msg.correctionStyle || "gentle",
            voiceName: msg.voiceName || "Zephyr",
            scenarioTitle: msg.scenarioTitle || "Morning Espresso Bar",
            partnerRole: msg.partnerRole || "Barista",
            scenarioPrompt:
              msg.scenarioPrompt ||
              "Have a natural conversation in the target language.",
          };

          const ai = getAiClient("v1beta");
          let setupDone = false;
          const liveSession = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: config.voiceName },
                },
              },
              systemInstruction: buildTutorSystemInstruction(config),
            },
            callbacks: {
              onopen: () => {
                // Wait until connect() resolves (setupComplete) before signaling ready
              },
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (content?.inputTranscription?.text) {
                  safeSend({
                    type: "inputTranscript",
                    text: content.inputTranscription.text,
                  });
                }
                if (content?.outputTranscription?.text) {
                  safeSend({
                    type: "outputTranscript",
                    text: content.outputTranscription.text,
                  });
                }
                for (const part of content?.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    safeSend({
                      type: "audio",
                      data: part.inlineData.data,
                    });
                  }
                }
                if (content?.interrupted) {
                  safeSend({ type: "interrupted" });
                }
                if (content?.turnComplete) {
                  safeSend({ type: "turnComplete" });
                }
              },
              onerror: (err: unknown) => {
                if (!setupDone) return;
                const errObj = err as { message?: string; error?: { message?: string } };
                const errMsg =
                  err instanceof Error
                    ? err.message
                    : errObj?.message ||
                      errObj?.error?.message ||
                      "Live voice connection encountered an error.";
                safeSend({ type: "error", message: errMsg });
              },
              onclose: () => {
                if (!isClosing && setupDone) {
                  safeSend({ type: "closed" });
                }
              },
            },
          });

          setupDone = true;

          if (isClosing) {
            liveSession.close();
            return;
          }

          session = liveSession;
          safeSend({ type: "ready" });

          if (msg.autoGreet !== false) {
            session.sendRealtimeInput({
              text: `Begin the roleplay right now as ${config.partnerRole}. Greet the learner warmly in ${config.languageName} and invite them to respond.`,
            });
          }
          return;
        }

        if (!session) return;

        if (msg.type === "audio" && typeof msg.data === "string") {
          session.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (msg.type === "text" && typeof msg.text === "string") {
          session.sendRealtimeInput({ text: msg.text });
        } else if (msg.type === "stop") {
          isClosing = true;
          session.close();
          session = null;
          safeSend({ type: "closed" });
        }
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Failed to handle live message.";
        safeSend({ type: "error", message: errMsg });
      }
    });

    clientWs.on("close", () => {
      isClosing = true;
      if (session) {
        try {
          session.close();
        } catch {
          // ignore
        }
        session = null;
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Cadence server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
