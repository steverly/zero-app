const STORAGE_KEY = "zero_voice_enabled_v2";

const state = {
  enabled:
    localStorage.getItem(STORAGE_KEY) !== "0",
  supported:
    typeof window !== "undefined" &&
    typeof Audio !== "undefined",
  mode: "home",
};

const listeners = new Set();

const BASE = "/audio/voice/";

const SOUNDS = {
  surpriseBig: `${BASE}wahh.mp3`,
  approve: `${BASE}mmh.mp3`,
  frustrated: `${BASE}nngh.mp3`,
  annoyed: `${BASE}tss.mp3`,
  laugh: `${BASE}ha.mp3`,
  realize: `${BASE}oh.mp3`,
  confused: `${BASE}huh.mp3`,
  initiative: `${BASE}hey.mp3`,
  think: `${BASE}hm.mp3`,
  thinkLong: `${BASE}hmmm.mp3`,
};

const pools = {
  think: ["think", "thinkLong"],
  warm: ["approve", "realize"],
  funny: ["laugh", "realize"],
  surprised: ["confused", "surpriseBig", "realize"],
  annoyed: ["annoyed", "frustrated"],
  initiative: ["initiative", "realize"],
};

let currentAudio = null;
let lastSound = "";
let lastPlayedAt = 0;
let lastStrongAt = 0;

function emit() {
  const snapshot = { ...state };
  listeners.forEach((listener) =>
    listener(snapshot)
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, Number(value) || 0)
  );
}

function pick(list = []) {
  if (!list.length) return "";

  const filtered =
    list.filter((name) =>
      name !== lastSound
    );

  const pool =
    filtered.length
      ? filtered
      : list;

  return pool[
    Math.floor(Math.random() * pool.length)
  ];
}

function variationFor(kind, emotion = {}) {
  const energy =
    clamp(emotion.energy, 0, 1);

  const annoyance =
    clamp(emotion.annoyance, 0, 1);

  const surprise =
    clamp(emotion.surprise, 0, 1);

  let rate =
    0.97 +
    (Math.random() * 0.08 - 0.04);

  let volume =
    0.68 +
    Math.random() * 0.12;

  if (
    kind === "surpriseBig" ||
    kind === "initiative"
  ) {
    rate +=
      0.04 + energy * 0.05;

    volume += 0.06;
  }

  if (
    kind === "annoyed" ||
    kind === "frustrated"
  ) {
    rate -=
      0.03 + annoyance * 0.025;
  }

  if (
    kind === "think" ||
    kind === "thinkLong"
  ) {
    rate -= 0.05;
    volume -= 0.08;
  }

  if (surprise > 0.7) {
    rate += 0.035;
  }

  return {
    rate:
      clamp(rate, 0.86, 1.14),
    volume:
      clamp(volume, 0.48, 0.9),
  };
}

function shouldStaySilent({
  kind,
  spontaneous = false,
  emotion = {},
}) {
  const arcade =
    state.mode === "arcade";

  // Arcade Zero is intentionally much more vocal.
  if (arcade) {
    if (
      kind === "initiative" ||
      kind === "surpriseBig" ||
      kind === "laugh" ||
      kind === "annoyed" ||
      kind === "frustrated"
    ) {
      return Math.random() < 0.12;
    }

    return Math.random() < 0.28;
  }

  if (
    spontaneous &&
    kind === "initiative"
  ) {
    return Math.random() < 0.10;
  }

  const strong =
    kind === "surpriseBig" ||
    kind === "annoyed" ||
    kind === "frustrated" ||
    kind === "laugh";

  if (strong) {
    return Math.random() < 0.20;
  }

  const energy =
    clamp(emotion.energy, 0, 1);

  // Home/chat: vocal, but still not on every single reply.
  const silentChance =
    energy > 0.72
      ? 0.34
      : 0.46;

return Math.random() < silentChance;
}

function chooseReaction({
  mood = "replying",
  action = "none",
  emotion = {},
  spontaneous = false,
} = {}) {
  const humor =
    clamp(emotion.humor, 0, 1);

  const annoyance =
    clamp(emotion.annoyance, 0, 1);

  const surprise =
    clamp(emotion.surprise, 0, 1);

  const warmth =
    clamp(emotion.warmth, 0, 1);

  if (spontaneous) {
    return "initiative";
  }

  if (
    action === "surprised" ||
    surprise > 0.72
  ) {
    return surprise > 0.86
      ? "surpriseBig"
      : pick(pools.surprised);
  }

  if (
    action === "laugh" ||
    humor > 0.68 ||
    mood === "funny"
  ) {
    return "laugh";
  }

  if (
    action === "refuse" ||
    mood === "sharp" ||
    annoyance > 0.72
  ) {
    return annoyance > 0.86
      ? "frustrated"
      : "annoyed";
  }

  if (
    action === "think" ||
    mood === "thinking"
  ) {
    return pick(pools.think);
  }

  if (
    action === "soften" ||
    mood === "warm" ||
    warmth > 0.75
  ) {
    return pick(pools.warm);
  }

  if (
    mood === "hyped" ||
    action === "excited"
  ) {
    return Math.random() < 0.55
      ? "initiative"
      : "laugh";
  }

  // Neutral replies only occasionally get a tiny reaction.
  const neutralRoll = Math.random();

  if (neutralRoll < 0.22) {
    return "think";
  }

  if (neutralRoll < 0.34) {
    return "realize";
  }

  return "";
}

async function playReaction(
  kind,
  {
    emotion = {},
    spontaneous = false,
    force = false,
  } = {}
) {
  if (
    !state.enabled ||
    !state.supported ||
    !kind ||
    !SOUNDS[kind]
  ) {
    return false;
  }

  const now = Date.now();

  // Hard anti-spam. Arcade is deliberately snappier.
  const hardCooldown =
    state.mode === "arcade"
      ? 650
      : 1250;

  if (
    !force &&
    now - lastPlayedAt < hardCooldown
  ) {
    return false;
  }

  const strong =
    [
      "surpriseBig",
      "frustrated",
      "annoyed",
      "laugh",
      "initiative",
    ].includes(kind);

  const strongCooldown =
    state.mode === "arcade"
      ? 1900
      : 3600;

  if (
    !force &&
    strong &&
    now - lastStrongAt < strongCooldown
  ) {
    return false;
  }

  if (
    !force &&
    shouldStaySilent({
      kind,
      spontaneous,
      emotion,
    })
  ) {
    return false;
  }

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }

  const audio =
    new Audio(SOUNDS[kind]);

  const variation =
    variationFor(
      kind,
      emotion
    );

  audio.preload = "auto";
  audio.volume =
    variation.volume;

  // HTMLAudio playbackRate gives us subtle reusable variation
  // without altering the original files.
  audio.playbackRate =
    variation.rate;

  currentAudio = audio;
  lastSound = kind;
  lastPlayedAt = now;

  if (strong) {
    lastStrongAt = now;
  }

  try {
    await audio.play();
    return true;
  } catch (error) {
    console.warn(
      "ZERO_LOCAL_VOICE_ERROR",
      kind,
      error
    );

    return false;
  }
}

export const zeroVoice = {
  getState() {
    return { ...state };
  },

  subscribe(listener) {
    listeners.add(listener);
    listener({ ...state });

    return () =>
      listeners.delete(listener);
  },

  setEnabled(value) {
    state.enabled =
      Boolean(value);

    localStorage.setItem(
      STORAGE_KEY,
      state.enabled ? "1" : "0"
    );

    if (!state.enabled) {
      this.stop();
    }

    emit();
  },

  toggle() {
    this.setEnabled(
      !state.enabled
    );

    return state.enabled;
  },

  stop() {
    if (!currentAudio) return;

    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }

    currentAudio = null;
  },

  react({
    mood = "replying",
    action = "none",
    emotion = {},
    spontaneous = false,
    force = false,
  } = {}) {
    const kind =
      chooseReaction({
        mood,
        action,
        emotion,
        spontaneous,
      });

    return playReaction(
      kind,
      {
        emotion,
        spontaneous,
        force,
      }
    );
  },

  setMode(mode = "home") {
    state.mode =
      mode === "arcade"
        ? "arcade"
        : "home";

    emit();
  },

  arcadePulse() {
    if (
      !state.enabled ||
      state.mode !== "arcade"
    ) {
      return false;
    }

    const roll = Math.random();

    const kind =
      roll < 0.20
        ? "initiative"
        : roll < 0.38
          ? "laugh"
          : roll < 0.56
            ? "approve"
            : roll < 0.72
              ? "realize"
              : roll < 0.86
                ? "think"
                : "confused";

    return playReaction(
      kind,
      {
        emotion: {
          energy: 0.78,
          humor: 0.46,
          surprise: 0.18,
          warmth: 0.5,
        },
        force: false,
      }
    );
  },

  gameResult(result = "") {
    const value =
      String(result).toLowerCase();

    // Result is from the USER's perspective in the current Arcade flow.
    // User win => Zero lost.
    if (value === "win") {
      return playReaction(
        Math.random() < 0.58
          ? "frustrated"
          : "annoyed",
        {
          emotion: {
            annoyance: 0.72,
            energy: 0.72,
          },
          force: true,
        }
      );
    }

    if (
      value === "loss" ||
      value === "lose"
    ) {
      return playReaction(
        Math.random() < 0.55
          ? "laugh"
          : "initiative",
        {
          emotion: {
            humor: 0.76,
            energy: 0.86,
          },
          force: true,
        }
      );
    }

    return playReaction(
      Math.random() < 0.5
        ? "think"
        : "realize",
      {
        emotion: {
          energy: 0.52,
        },
        force: true,
      }
    );
  },

  // Used internally for a specific local reaction.
  play(kind, options = {}) {
    return playReaction(
      kind,
      options
    );
  },
};
