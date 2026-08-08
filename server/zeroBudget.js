import { cleanText } from "./zeroNormalize.js";

export const SERVER_LIMITS = Object.freeze({
  maxUserChars: 2000,
  maxHistoryMessages: 8,
  maxHistoryCharsEach: 600,
  maxReplyChars: 420,
  maxFollowUpChars: 220,
});

export function buildCompactHistory(conversationHistory) {
  if (!Array.isArray(conversationHistory)) return [];

  return conversationHistory
    .filter(
      (message) =>
        message &&
        typeof message.text === "string" &&
        typeof message.role === "string" &&
        message.text.trim()
    )
    .slice(-SERVER_LIMITS.maxHistoryMessages)
    .map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: cleanText(message.text)
        .slice(0, SERVER_LIMITS.maxHistoryCharsEach),
    }));
}

export function chooseReplyBudget(message) {
  const text = String(message || "").trim().toLowerCase();
  const length = text.length;

  const explicitlyDetailed =
    /\b(explique|développe|détaille|pourquoi|explain|details?|jelasin|kenapa)\b/i
      .test(text);

  if (explicitlyDetailed) {
    return {
      maxTokens: 190,
      maxChars: SERVER_LIMITS.maxReplyChars,
    };
  }

  if (length <= 24) {
    return {
      maxTokens: 95,
      maxChars: 180,
    };
  }

  if (length <= 140) {
    return {
      maxTokens: 135,
      maxChars: 280,
    };
  }

  return {
    maxTokens: 170,
    maxChars: 380,
  };
}

export function clampReply(text, maxChars) {
  const clean = cleanText(text);

  if (clean.length <= maxChars) {
    return clean;
  }

  const slice = clean.slice(0, maxChars);
  const lastBreak = Math.max(
    slice.lastIndexOf("\n"),
    slice.lastIndexOf(" "),
    slice.lastIndexOf("."),
    slice.lastIndexOf("?")
  );

  return (
    lastBreak > maxChars * 0.65
      ? slice.slice(0, lastBreak)
      : slice
  ).trim();
}
