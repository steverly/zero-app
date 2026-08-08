export const DEFAULT_ZERO_STATE = Object.freeze({
  mood: "neutral",
  energy: 0.58,
  warmth: 0.62,
  amusement: 0.25,
  annoyance: 0.04,
  curiosity: 0.48,
  trust: 0.22,
  patience: 0.78,
  ego: 0.82,
});

const ALLOWED_MOODS = new Set([
  "neutral",
  "happy",
  "amused",
  "curious",
  "annoyed",
  "irritated",
  "soft",
  "serious",
  "surprised",
  "tired",
  "bored",
  "proud",
]);

const ALLOWED_ACTIONS = new Set([
  "none",
  "blink",
  "laugh",
  "smile",
  "stare",
  "lookAway",
  "sigh",
  "soften",
  "refuse",
  "surprised",
  "excited",
  "think",
]);

export function clamp(value, min = 0, max = 1, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.min(max, Math.max(min, number));
}

export function cleanText(text) {
  return String(text || "")
    .replace(/<\/?(user|assistant|system)>/gi, "")
    .replace(/\[\/?INST\]/gi, "")
    .replace(/<\/?s>/gi, "")
    .replace(/^(assistant|user)\s*:/i, "")
    .trim();
}

export function normalizeState(input) {
  const source =
    input && typeof input === "object"
      ? input
      : {};

  return {
    mood: ALLOWED_MOODS.has(source.mood)
      ? source.mood
      : DEFAULT_ZERO_STATE.mood,

    energy: clamp(
      source.energy,
      0,
      1,
      DEFAULT_ZERO_STATE.energy
    ),

    warmth: clamp(
      source.warmth,
      0,
      1,
      DEFAULT_ZERO_STATE.warmth
    ),

    amusement: clamp(
      source.amusement,
      0,
      1,
      DEFAULT_ZERO_STATE.amusement
    ),

    annoyance: clamp(
      source.annoyance,
      0,
      1,
      DEFAULT_ZERO_STATE.annoyance
    ),

    curiosity: clamp(
      source.curiosity,
      0,
      1,
      DEFAULT_ZERO_STATE.curiosity
    ),

    trust: clamp(
      source.trust,
      0,
      1,
      DEFAULT_ZERO_STATE.trust
    ),

    patience: clamp(
      source.patience,
      0,
      1,
      DEFAULT_ZERO_STATE.patience
    ),

    ego: clamp(
      source.ego,
      0,
      1,
      DEFAULT_ZERO_STATE.ego
    ),
  };
}

export function normalizeAction(action) {
  return ALLOWED_ACTIONS.has(action)
    ? action
    : "none";
}

export function normalizeRelationship(input) {
  const source =
    input && typeof input === "object"
      ? input
      : {};

  const t =
    source.t && typeof source.t === "object"
      ? source.t
      : {};

  return {
    i: Math.max(0, Number(source.i || 0)),
    e: Math.max(0, Number(source.e || 0)),
    s: clamp(source.s, 0, 1, 0.05),

    t: {
      f: clamp(t.f, 0, 1, 0.08),
      tr: clamp(t.tr, 0, 1, 0.12),
      p: clamp(t.p, 0, 1, 0.42),
      te: clamp(t.te, 0, 1, 0.22),
      h: clamp(t.h, 0, 1, 0.74),
      ini: clamp(t.ini, 0, 1, 0.14),
      ex: clamp(t.ex, 0, 1, 0.26),
      c: clamp(t.c, 0, 1, 0.48),
      w: clamp(t.w, 0, 1, 0.5),
      pa: clamp(t.pa, 0, 1, 0.74),
      d: clamp(t.d, 0, 1, 0.74),
      v: clamp(t.v, 0, 1, 0.45),
    },

    x: Array.isArray(source.x)
      ? source.x
          .filter((value) => typeof value === "string")
          .map((value) => value.slice(0, 22))
          .slice(0, 8)
      : [],

    r: Array.isArray(source.r)
      ? source.r
          .filter((value) => typeof value === "string")
          .map((value) => value.slice(0, 180))
          .slice(-4)
      : [],

    hooks: Array.isArray(source.hooks)
      ? source.hooks
          .filter(
            (hook) =>
              hook &&
              typeof hook.id === "string" &&
              typeof hook.text === "string" &&
              hook.text.trim()
          )
          .map((hook) => ({
            id: hook.id.slice(0, 70),
            text: hook.text.trim().slice(0, 140),
            category: String(hook.category || "habit").slice(0, 24),
          }))
          .slice(-5)
      : [],

    g:
      source.g && typeof source.g === "object"
        ? {
            played: Math.max(0, Number(source.g.played || 0)),
            wins: Math.max(0, Number(source.g.wins || 0)),
            losses: Math.max(0, Number(source.g.losses || 0)),
            draws: Math.max(0, Number(source.g.draws || 0)),
            rematches: Math.max(0, Number(source.g.rematches || 0)),
            avgReactionMs: Math.max(0, Number(source.g.avgReactionMs || 0)),
            lastGame: String(source.g.lastGame || "").slice(0, 24),
            lastResult: String(source.g.lastResult || "").slice(0, 16),
            favoriteGame: String(source.g.favoriteGame || "").slice(0, 24),
          }
        : {
            played: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            rematches: 0,
            avgReactionMs: 0,
            lastGame: "",
            lastResult: "",
            favoriteGame: "",
          },
  };
}

export function normalizeCompactModelOutput(parsed, state) {
  const source =
    parsed && typeof parsed === "object"
      ? parsed
      : {};

  const e =
    source.e && typeof source.e === "object"
      ? source.e
      : {};

  const s =
    source.s && typeof source.s === "object"
      ? source.s
      : {};

  const f =
    source.f && typeof source.f === "object"
      ? source.f
      : {};

  const emotion = {
    energy: clamp(e.en, 0, 1, state.energy),
    warmth: clamp(e.w, 0, 1, state.warmth),
    humor: clamp(e.h, 0, 1, state.amusement),
    annoyance: clamp(e.n, 0, 1, state.annoyance),
    confidence: clamp(e.c, 0, 1, state.ego),
    surprise: clamp(e.s, 0, 1, 0),
  };

  const signals = {
    interactionQuality: clamp(s.q, 0, 1, 0.45),
    depth: clamp(s.d, 0, 1, 0.2),
    humor: clamp(s.h, 0, 1, 0.15),
    warmth: clamp(s.w, 0, 1, 0.45),
    disrespect: clamp(s.x, 0, 1, 0),
    openness: clamp(s.o, 0, 1, 0.2),
    userVerbosity: clamp(s.v, 0, 1, 0.45),
    userInitiative: clamp(s.i, 0, 1, 0.5),
  };

  const followUpMessage = cleanText(f.m).slice(0, 220);

  const memoryCandidate =
    source.mem &&
    typeof source.mem === "object" &&
    source.mem.safe === true
      ? {
          text: cleanText(source.mem.text).slice(0, 140),
          category: String(source.mem.category || "").slice(0, 24),
          safe: true,
          teaseable: source.mem.teaseable === true,
          strength: clamp(source.mem.strength, 0, 1, 0.45),
        }
      : null;

  return {
    reply: cleanText(source.r),
    action: normalizeAction(source.a),
    emotion,
    signals,

    followUp: {
      shouldSend:
        f.on === true &&
        followUpMessage.length > 0,
      message: followUpMessage,
      delayMs: 1200,
    },

    memoryCandidate,

    usedMemoryId:
      typeof source.use === "string"
        ? source.use.slice(0, 70)
        : "",
  };
}

export function deriveNextState(current, model) {
  const e = model.emotion;
  const s = model.signals;

  const next = {
    ...current,

    mood:
      e.annoyance > 0.82
        ? "annoyed"
        : e.surprise > 0.72
          ? "surprised"
          : e.humor > 0.65
            ? "amused"
            : e.warmth > 0.72
              ? "soft"
              : current.mood,

    energy:
      current.energy * 0.74 +
      e.energy * 0.26,

    warmth:
      current.warmth * 0.78 +
      e.warmth * 0.22,

    amusement:
      current.amusement * 0.72 +
      e.humor * 0.28,

    annoyance:
      Math.max(
        0,
        current.annoyance * 0.68 +
          e.annoyance * 0.32
      ),

    curiosity:
      current.curiosity * 0.82 +
      s.openness * 0.1 +
      s.depth * 0.08,

    trust:
      current.trust * 0.97 +
      s.warmth * 0.02 -
      s.disrespect * 0.01,

    patience:
      current.patience * 0.985 -
      s.disrespect * 0.035 +
      s.interactionQuality * 0.01,

    ego: current.ego,
  };

  return normalizeState(next);
}
