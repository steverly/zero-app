import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

import {
  DEFAULT_ZERO_STATE,
  cleanText,
  deriveNextState,
  normalizeCompactModelOutput,
  normalizeRelationship,
  normalizeState,
} from "./server/zeroNormalize.js";

import {
  SERVER_LIMITS,
  buildCompactHistory,
  chooseReplyBudget,
  clampReply,
} from "./server/zeroBudget.js";

import { buildZeroPrompt } from "./server/zeroPrompt.js";
import { tryLocalMicroReply } from "./server/zeroLocal.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "24kb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = process.env.PORT || 3001;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function recoverReplyFromTruncatedJson(raw) {
  const text = String(raw || "");

  // The compact schema always puts `r` first.
  // Capture a valid JSON string value, including escaped quotes.
  const match = text.match(
    /"r"\s*:\s*"((?:\\.|[^"\\])*)"/s
  );

  if (!match) {
    return "";
  }

  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\\\/g, "\\")
      .trim();
  }
}

// -----------------------------------------------------
// Garde-fou anti-abus simple.
// Ce n'est PAS un système de facturation.
// Pour la prod finale, couple ça à un user/device id côté Supabase.
// -----------------------------------------------------

const buckets = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = Number(
  process.env.ZERO_MAX_REQUESTS_PER_HOUR || 80
);

function rateLimit(req, res, next) {
  const key =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();

  const current = buckets.get(key);

  if (!current || now - current.startedAt > WINDOW_MS) {
    buckets.set(key, {
      startedAt: now,
      count: 1,
    });

    next();
    return;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      message: "T'as envoyé beaucoup trop d'un coup. Reviens dans un peu.",
    });
    return;
  }

  current.count += 1;
  next();
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    model: MODEL,
    version: "zero-v7.2-native-initiative-boundaries",
  });
});

app.post("/api/reply", rateLimit, async (req, res) => {
  try {
    const {
      message = "",
      language = "fr",
      conversationHistory = [],
      zeroState = DEFAULT_ZERO_STATE,
      relationship = {},
    } = req.body || {};

    const cleanMessage = cleanText(message);

    if (!cleanMessage) {
      res.status(400).json({
        message: "Message vide.",
      });
      return;
    }

    if (cleanMessage.length > SERVER_LIMITS.maxUserChars) {
      res.status(400).json({
        message: `Maximum ${SERVER_LIMITS.maxUserChars} caractères.`,
      });
      return;
    }

    const currentState = normalizeState(zeroState);
    const currentRelationship =
      normalizeRelationship(relationship);

    // -------------------------------------------------
    // Économie tokens : micro-réponses locales.
    // -------------------------------------------------

    const local = tryLocalMicroReply({
      message: cleanMessage,
      language,
      relationship: currentRelationship,
    });

    if (local) {
      const nextState = deriveNextState(
        currentState,
        local
      );

      res.status(200).json({
        ...local,
        state: nextState,
        debug: {
          local: true,
        },
      });

      return;
    }

    // -------------------------------------------------
    // Appel modèle compact et borné.
    // -------------------------------------------------

    const history =
      buildCompactHistory(conversationHistory);

    const budget =
      chooseReplyBudget(cleanMessage);

    const completion =
      await openai.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "system",
            content: buildZeroPrompt({
              language,
              relationship: currentRelationship,
            }),
          },

          ...history,

          {
            role: "user",
            content: cleanMessage,
          },
        ],

        response_format: {
          type: "json_object",
        },

        temperature: 0.86,
        max_tokens: budget.maxTokens,
      });

    const raw =
      completion.choices[0]?.message?.content ||
      "{}";

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      const recoveredReply =
        recoverReplyFromTruncatedJson(raw);

      console.error(
        "ZERO_INVALID_JSON",
        JSON.stringify({
          finishReason:
            completion.choices[0]?.finish_reason || "",
          raw,
          recovered:
            Boolean(recoveredReply),
        })
      );

      // Don't punish the user with a 500 just because
      // non-visible metadata was cut.
      if (recoveredReply) {
        parsed = {
          r: recoveredReply,
          a: "none",
          e: {},
          s: {},
          f: {},
        };
      } else {
        res.status(500).json({
          message: "Ça a bug deux secondes. Réessaie.",
        });

        return;
      }
    }

    const model =
      normalizeCompactModelOutput(
        parsed,
        currentState
      );

    // Empêche une hallucination d'id de mémoire.
    const allowedHookIds =
      new Set(
        currentRelationship.hooks.map(
          (hook) => hook.id
        )
      );

    if (
      model.usedMemoryId &&
      !allowedHookIds.has(model.usedMemoryId)
    ) {
      model.usedMemoryId = "";
    }

    model.reply =
      clampReply(
        model.reply,
        budget.maxChars
      ) || "...";

    const nextState =
      deriveNextState(
        currentState,
        model
      );

    const usage = completion.usage || {};

    // Très utile pour calculer ta vraie marge.
    // Render Logs te donnera coût approximable par conversation.
    console.log(
      "ZERO_USAGE",
      JSON.stringify({
        model: MODEL,
        promptTokens:
          Number(usage.prompt_tokens || 0),
        completionTokens:
          Number(usage.completion_tokens || 0),
        totalTokens:
          Number(usage.total_tokens || 0),
        inputChars: cleanMessage.length,
        historyMessages: history.length,
        finishReason:
          completion.choices[0]?.finish_reason || "",
        outputBudgetTokens:
          budget.maxTokens,
        visibleReplyMaxChars:
          budget.maxChars,
      })
    );

    res.status(200).json({
      reply: model.reply,
      emotion: model.emotion,
      state: nextState,
      action: model.action,
      followUp: model.followUp,
      signals: model.signals,
      memoryCandidate: model.memoryCandidate,
      usedMemoryId: model.usedMemoryId,
      debug: {
        local: false,
      },
    });
  } catch (error) {
    console.error("ZERO_REPLY_ERROR", error);

    res.status(500).json({
      message: "Ça a planté. Réessaie.",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Zero V7.2 lancé sur http://localhost:${PORT}`
  );
});
