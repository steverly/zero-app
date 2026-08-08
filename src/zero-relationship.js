const STORAGE_KEY = "zero_relationship_v5";

const now = () => Date.now();

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const DEFAULT_TRAITS = {
  familiarity: 0.08,
  trust: 0.12,
  playfulness: 0.42,
  teasing: 0.22,
  honesty: 0.74,
  initiative: 0.14,
  expressiveness: 0.26,
  curiosity: 0.48,
  warmth: 0.5,
  patience: 0.74,
  directness: 0.74,
  userVerbosity: 0.45,
};

const DEFAULT_GAME_PROFILE = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  rematches: 0,
  quitCount: 0,
  avgReactionMs: 0,
  lastGame: "",
  lastResult: "",
  lastPlayedAt: 0,
  favoriteGame: "",
  gameCounts: {},
  gameResults: {},
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultRelationship() {
  const timestamp = now();

  return {
    version: 5,
    createdAt: timestamp,
    lastSeenAt: timestamp,

    interactionCount: 0,
    totalEnergy: 0,
    stability: 0.05,
    recentEnergy: 0,

    traits: { ...DEFAULT_TRAITS },

    style: {
      tokens: {},
      adopted: [],
    },

    memories: [],
    recentReplies: [],
    recentUserMessages: [],
    evolutionMoments: [],

    gameProfile: {
      ...DEFAULT_GAME_PROFILE,
    },

    gameRewardDay: todayKey(),
    gameRewardsToday: 0,
  };
}

export function loadRelationship() {
  const fallback = createDefaultRelationship();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw);

    return {
      ...fallback,
      ...saved,

      traits: {
        ...fallback.traits,
        ...(saved?.traits || {}),
      },

      style: {
        ...fallback.style,
        ...(saved?.style || {}),
        tokens: {
          ...fallback.style.tokens,
          ...(saved?.style?.tokens || {}),
        },
        adopted: Array.isArray(saved?.style?.adopted)
          ? saved.style.adopted.slice(-18)
          : [],
      },

      memories: Array.isArray(saved?.memories)
        ? saved.memories.slice(-24)
        : [],

      recentReplies: Array.isArray(saved?.recentReplies)
        ? saved.recentReplies.slice(-8)
        : [],

      recentUserMessages: Array.isArray(saved?.recentUserMessages)
        ? saved.recentUserMessages.slice(-8)
        : [],

      evolutionMoments: Array.isArray(saved?.evolutionMoments)
        ? saved.evolutionMoments.slice(-20)
        : [],

      gameProfile: {
        ...fallback.gameProfile,
        ...(saved?.gameProfile || {}),
        gameCounts: {
          ...(saved?.gameProfile?.gameCounts || {}),
        },
        gameResults: {
          ...(saved?.gameProfile?.gameResults || {}),
        },
      },
    };
  } catch {
    return fallback;
  }
}

export function saveRelationship(relationship) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relationship));
  } catch {
    // ignore
  }
}

const STYLE_TOKENS = [
  "mdr", "mdrr", "ptdr", "jpp", "jsp", "oe", "ouais", "nan", "grave",
  "wesh", "vas-y", "vasy", "frérot", "frr", "bg", "j'avoue", "j’avoue",
  "bro", "dude", "nah", "yeah", "fr", "ngl", "lowkey", "kinda", "fair", "lol", "lmao",
  "wkwk", "wkwkwk", "iya", "yaudah", "gak", "nggak", "gapapa", "banget", "sih", "dong",
  "deh", "kok", "lah", "kan", "gitu", "emang", "bentar", "aduh", "astaga", "buset", "serius"
];

function learnStyle(style, text, familiarity) {
  const lower = String(text || "").toLowerCase();
  const tokens = { ...(style?.tokens || {}) };

  for (const token of STYLE_TOKENS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(^|\\s|[^\\p{L}\\p{N}])${escaped}($|\\s|[^\\p{L}\\p{N}])`,
      "giu"
    );

    if (regex.test(lower)) {
      tokens[token] = Math.min(50, (tokens[token] || 0) + 1);
    }
  }

  const adopted = Object.entries(tokens)
    .filter(([, count]) => count >= 4 && familiarity >= 0.28)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([token]) => token);

  return { tokens, adopted };
}

function safeMemoryCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return null;

  const text = String(candidate.text || "").trim();
  const category = String(candidate.category || "").trim();

  const allowed = new Set([
    "habit",
    "preference",
    "project",
    "routine",
    "joke",
  ]);

  if (
    candidate.safe !== true ||
    !text ||
    text.length > 150 ||
    !allowed.has(category)
  ) {
    return null;
  }

  // Deuxième filet local. Le serveur filtre déjà.
  const banned = [
    "trauma", "suicide", "self-harm", "abuse", "violence",
    "diagnosis", "depression", "anxiety", "sexual", "password",
    "address", "medical", "religion", "race", "politic"
  ];

  const normalized = text.toLowerCase();

  if (banned.some((word) => normalized.includes(word))) {
    return null;
  }

  return {
    id:
      candidate.id ||
      `m_${Math.random().toString(36).slice(2, 9)}`,
    text,
    category,
    teaseable: candidate.teaseable === true,
    createdAt: now(),
    lastUsedAt: 0,
    strength: clamp(candidate.strength ?? 0.45),
  };
}

function mergeMemory(memories, candidate) {
  if (!candidate) return memories.slice(-24);

  const normalized = candidate.text.toLowerCase();

  const existingIndex = memories.findIndex(
    (memory) =>
      memory.text.toLowerCase() === normalized ||
      (
        memory.category === candidate.category &&
        memory.text
          .toLowerCase()
          .includes(normalized.slice(0, 28))
      )
  );

  if (existingIndex >= 0) {
    return memories
      .map((memory, index) =>
        index === existingIndex
          ? {
              ...memory,
              strength: clamp((memory.strength || 0.4) + 0.08),
            }
          : memory
      )
      .slice(-24);
  }

  return [...memories, candidate].slice(-24);
}

function addMoment(moments, type, text) {
  return [
    ...moments,
    {
      id: `e_${Math.random().toString(36).slice(2, 10)}`,
      type,
      text,
      at: now(),
    },
  ].slice(-20);
}

function traitDelta(current, target, learningRate, intensity = 1) {
  return (target - current) * learningRate * intensity;
}

export function evolveRelationship(
  previous,
  {
    userMessage,
    reply,
    signals = {},
    memoryCandidate = null,
    usedMemoryId = "",
    coreMultiplier = 1,
  }
) {
  const relationship = previous || createDefaultRelationship();
  const beforeTraits = relationship.traits || DEFAULT_TRAITS;

  const interactionQuality = clamp(signals.interactionQuality ?? 0.45);
  const depth = clamp(signals.depth ?? 0.25);
  const humor = clamp(signals.humor ?? 0.2);
  const warmthSignal = clamp(signals.warmth ?? 0.45);
  const disrespect = clamp(signals.disrespect ?? 0);
  const openness = clamp(signals.openness ?? 0.25);
  const userVerbosity = clamp(signals.userVerbosity ?? 0.45);
  const userInitiative = clamp(signals.userInitiative ?? 0.5);

  const messageLength = String(userMessage || "").trim().length;

  const antiSpamFactor =
    messageLength < 4
      ? 0.15
      : messageLength < 12
        ? 0.42
        : 1;

  const rawNourishment =
    antiSpamFactor *
    (
      0.58 +
      interactionQuality * 1.35 +
      depth * 1.05 +
      humor * 0.4 +
      openness * 0.68
    );

  const nourishment =
    rawNourishment *
    Math.max(1, Number(coreMultiplier || 1));

  const nextEnergy = Math.max(
    0,
    Number(relationship.totalEnergy || 0) + nourishment
  );

  // Gros changements au début, puis convergence progressive.
  const learningRate =
    0.18 / Math.sqrt(1 + nextEnergy / 20);

  const stability = clamp(
    1 - Math.exp(-nextEnergy / 125),
    0.04,
    0.995
  );

  const target = {
    familiarity:
      0.2 +
      interactionQuality * 0.5 +
      openness * 0.3,

    trust:
      0.16 +
      interactionQuality * 0.4 +
      warmthSignal * 0.28 -
      disrespect * 0.2,

    playfulness:
      0.28 + humor * 0.62,

    teasing:
      0.14 +
      humor * 0.38 +
      interactionQuality * 0.2,

    honesty:
      0.74 +
      interactionQuality * 0.1,

    initiative:
      0.11 +
      userInitiative * 0.25 +
      interactionQuality * 0.32,

    expressiveness:
      0.18 +
      humor * 0.28 +
      interactionQuality * 0.33,

    curiosity:
      0.3 +
      depth * 0.32 +
      openness * 0.29,

    warmth:
      0.32 +
      warmthSignal * 0.48 -
      disrespect * 0.2,

    patience:
      0.78 -
      disrespect * 0.52 +
      interactionQuality * 0.1,

    directness:
      0.74 +
      interactionQuality * 0.06,

    userVerbosity,
  };

  const traits = {};

  for (const key of Object.keys(DEFAULT_TRAITS)) {
    const current = clamp(
      beforeTraits[key] ?? DEFAULT_TRAITS[key]
    );

    const desired = clamp(target[key] ?? current);

    const stabilityBrake = 1 - stability * 0.64;

    traits[key] = clamp(
      current +
        traitDelta(
          current,
          desired,
          learningRate,
          stabilityBrake
        )
    );
  }

  if (disrespect > 0.65) {
    traits.patience = clamp(
      traits.patience -
        (0.013 + disrespect * 0.014) *
          (1 - stability * 0.45)
    );

    traits.warmth = clamp(
      traits.warmth -
        0.008 *
          disrespect *
          (1 - stability * 0.4)
    );
  }

  // Ce sont des piliers de Zero, jamais des traits payants.
  traits.honesty = Math.max(0.7, traits.honesty);
  traits.directness = Math.max(0.68, traits.directness);

  const style = learnStyle(
    relationship.style,
    userMessage,
    traits.familiarity
  );

  let memories = mergeMemory(
    relationship.memories || [],
    safeMemoryCandidate(memoryCandidate)
  );

  if (usedMemoryId) {
    memories = memories.map((memory) =>
      memory.id === usedMemoryId
        ? { ...memory, lastUsedAt: now() }
        : memory
    );
  }

  let evolutionMoments = relationship.evolutionMoments || [];

  const milestones = [
    {
      key: "familiarity",
      before: beforeTraits.familiarity || 0,
      after: traits.familiarity,
      threshold: 0.3,
      type: "familiarity",
      text: "Zero commence à être vraiment à l’aise avec toi",
    },
    {
      key: "initiative",
      before: beforeTraits.initiative || 0,
      after: traits.initiative,
      threshold: 0.34,
      type: "initiative",
      text: "Zero prend plus facilement l’initiative",
    },
    {
      key: "expressiveness",
      before: beforeTraits.expressiveness || 0,
      after: traits.expressiveness,
      threshold: 0.4,
      type: "expression",
      text: "Zero est devenu plus expressif avec toi",
    },
  ];

  for (const milestone of milestones) {
    if (
      milestone.before < milestone.threshold &&
      milestone.after >= milestone.threshold
    ) {
      evolutionMoments = addMoment(
        evolutionMoments,
        milestone.type,
        milestone.text
      );
    }
  }

  const recentReplies = [
    ...(relationship.recentReplies || []),
    String(reply || "").slice(0, 500),
  ]
    .filter(Boolean)
    .slice(-8);

  const recentUserMessages = [
    ...(relationship.recentUserMessages || []),
    String(userMessage || "").slice(0, 500),
  ]
    .filter(Boolean)
    .slice(-8);

  return {
    ...relationship,
    version: 5,
    lastSeenAt: now(),
    interactionCount:
      Number(relationship.interactionCount || 0) + 1,
    totalEnergy: nextEnergy,
    recentEnergy: clamp(
      (relationship.recentEnergy || 0) * 0.72 +
        nourishment / 4
    ),
    stability,
    traits,
    style,
    memories,
    recentReplies,
    recentUserMessages,
    evolutionMoments,
  };
}

function gameRewardFactor(relationship) {
  const currentDay = todayKey();

  const rewardsToday =
    relationship.gameRewardDay === currentDay
      ? Number(relationship.gameRewardsToday || 0)
      : 0;

  if (rewardsToday < 5) return 1;
  if (rewardsToday < 10) return 0.5;

  return 0.2;
}

export function evolveRelationshipFromGame(
  previous,
  {
    gameId,
    result,
    reactionMs = 0,
    rematch = false,
    quit = false,
    coreMultiplier = 1,
  }
) {
  const relationship = previous || createDefaultRelationship();
  const profile = {
    ...DEFAULT_GAME_PROFILE,
    ...(relationship.gameProfile || {}),
    gameCounts: {
      ...(relationship.gameProfile?.gameCounts || {}),
    },
    gameResults: {
      ...(relationship.gameProfile?.gameResults || {}),
    },
  };

  profile.gamesPlayed += 1;
  profile.lastGame = gameId;
  profile.lastResult = result;
  profile.lastPlayedAt = now();
  profile.gameCounts[gameId] =
    Number(profile.gameCounts[gameId] || 0) + 1;

  const gameResult = {
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    avgReactionMs: 0,
    ...(profile.gameResults?.[gameId] || {}),
  };

  gameResult.played += 1;

  if (result === "win") gameResult.wins += 1;
  if (result === "loss") gameResult.losses += 1;
  if (result === "draw") gameResult.draws += 1;

  if (reactionMs > 0) {
    gameResult.avgReactionMs =
      gameResult.avgReactionMs > 0
        ? Math.round(
            gameResult.avgReactionMs * 0.72 +
            reactionMs * 0.28
          )
        : Math.round(reactionMs);
  }

  profile.gameResults[gameId] = gameResult;

  if (result === "win") profile.wins += 1;
  if (result === "loss") profile.losses += 1;
  if (result === "draw") profile.draws += 1;
  if (rematch) profile.rematches += 1;
  if (quit) profile.quitCount += 1;

  if (reactionMs > 0) {
    profile.avgReactionMs =
      profile.avgReactionMs > 0
        ? Math.round(profile.avgReactionMs * 0.72 + reactionMs * 0.28)
        : Math.round(reactionMs);
  }

  profile.favoriteGame =
    Object.entries(profile.gameCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const currentDay = todayKey();

  const rewardsToday =
    relationship.gameRewardDay === currentDay
      ? Number(relationship.gameRewardsToday || 0)
      : 0;

  const factor = gameRewardFactor(relationship);

  const base = 1.35;

  // Gagner ne nourrit pas "mieux" la relation que perdre.
  // C'est le fait de jouer ensemble qui compte.
  const gained =
    base *
    factor *
    Math.max(1, Number(coreMultiplier || 1));

  const totalEnergy =
    Number(relationship.totalEnergy || 0) + gained;

  const stability = clamp(
    1 - Math.exp(-totalEnergy / 125),
    0.04,
    0.995
  );

  return {
    ...relationship,
    lastSeenAt: now(),
    totalEnergy,
    recentEnergy: clamp(
      (relationship.recentEnergy || 0) * 0.8 +
        gained / 4
    ),
    stability,
    gameProfile: profile,
    gameRewardDay: currentDay,
    gameRewardsToday: rewardsToday + 1,
  };
}

export function getRelationshipAgeDays(relationship) {
  const createdAt = Number(relationship?.createdAt || now());

  return Math.max(
    0,
    Math.floor((now() - createdAt) / 86_400_000)
  );
}

export function getRelationshipDescriptors(relationship) {
  const traits = relationship?.traits || DEFAULT_TRAITS;

  const candidates = [
    ["taquin", traits.teasing],
    ["expressif", traits.expressiveness],
    ["franc", traits.honesty],
    ["curieux", traits.curiosity],
    ["posé", 1 - traits.expressiveness * 0.55],
    ["complice", (traits.familiarity + traits.trust) / 2],
    ["spontané", traits.initiative],
    ["patient", traits.patience],
    ["direct", traits.directness],
  ];

  return candidates
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

export function getRelationshipPhase(relationship) {
  const energy = Number(relationship?.totalEnergy || 0);

  if (energy < 8) return "il te découvre";
  if (energy < 26) return "il commence à te cerner";
  if (energy < 70) return "il est à l’aise avec toi";
  if (energy < 180) return "il est bien ancré avec toi";

  return "il continue de se construire avec toi";
}

export function getPhaseProgress(relationship) {
  const energy = Number(relationship?.totalEnergy || 0);
  const thresholds = [0, 8, 26, 70, 180];

  for (let index = 0; index < thresholds.length - 1; index += 1) {
    const start = thresholds[index];
    const end = thresholds[index + 1];

    if (energy < end) {
      return clamp((energy - start) / (end - start));
    }
  }

  // Après 180 l'évolution reste infinie.
  // On crée une respiration logarithmique uniquement visuelle.
  return clamp(
    Math.log10(1 + (energy - 180) / 90) / 1.25,
    0.08,
    1
  );
}

function filterAdoptedExpressions(expressions, language) {
  const all = Array.isArray(expressions) ? expressions : [];

  const idTokens = new Set([
    "wkwk", "wkwkwk", "iya", "yaudah", "gak", "nggak",
    "gapapa", "banget", "sih", "dong", "deh", "kok", "lah",
    "kan", "gitu", "emang", "bentar", "aduh", "astaga", "buset", "serius",
  ]);

  const frTokens = new Set([
    "mdr", "mdrr", "ptdr", "jpp", "jsp", "tfq", "pq", "tkt", "vrm", "mtn", "stv", "oe", "ouais",
    "nan", "grave", "wesh", "vas-y", "vasy", "frérot", "frr",
    "bg", "j'avoue", "j’avoue",
  ]);

  const enTokens = new Set([
    "bro", "dude", "nah", "yeah", "fr", "ngl",
    "lowkey", "kinda", "fair", "lol", "lmao",
  ]);

  if (language === "id") {
    return all.filter(
      (token) =>
        idTokens.has(token) ||
        (!frTokens.has(token) && !enTokens.has(token))
    );
  }

  if (language === "en") {
    return all.filter(
      (token) =>
        enTokens.has(token) ||
        (!frTokens.has(token) && !idTokens.has(token))
    );
  }

  return all.filter(
    (token) =>
      frTokens.has(token) ||
      (!enTokens.has(token) && !idTokens.has(token))
  );
}

export function getServerRelationshipContext(relationship, language = "fr") {
  const safeHooks = (relationship?.memories || [])
    .filter((memory) => {
      if (!memory.teaseable) return false;

      const cooldown = 5 * 24 * 60 * 60 * 1000;

      return (
        !memory.lastUsedAt ||
        now() - memory.lastUsedAt > cooldown
      );
    })
    .slice(-5)
    .map(({ id, text, category }) => ({
      id,
      text,
      category,
    }));

  const gameProfile = relationship?.gameProfile || DEFAULT_GAME_PROFILE;

  return {
    i: Number(relationship?.interactionCount || 0),
    e: Math.round(Number(relationship?.totalEnergy || 0) * 10) / 10,
    s: Math.round(clamp(relationship?.stability || 0.05) * 100) / 100,

    t: {
      f: Math.round(clamp(relationship?.traits?.familiarity || 0.08) * 100) / 100,
      tr: Math.round(clamp(relationship?.traits?.trust || 0.12) * 100) / 100,
      p: Math.round(clamp(relationship?.traits?.playfulness || 0.42) * 100) / 100,
      te: Math.round(clamp(relationship?.traits?.teasing || 0.22) * 100) / 100,
      h: Math.round(clamp(relationship?.traits?.honesty || 0.74) * 100) / 100,
      ini: Math.round(clamp(relationship?.traits?.initiative || 0.14) * 100) / 100,
      ex: Math.round(clamp(relationship?.traits?.expressiveness || 0.26) * 100) / 100,
      c: Math.round(clamp(relationship?.traits?.curiosity || 0.48) * 100) / 100,
      w: Math.round(clamp(relationship?.traits?.warmth || 0.5) * 100) / 100,
      pa: Math.round(clamp(relationship?.traits?.patience || 0.74) * 100) / 100,
      d: Math.round(clamp(relationship?.traits?.directness || 0.74) * 100) / 100,
      v: Math.round(clamp(relationship?.traits?.userVerbosity || 0.45) * 100) / 100,
    },

    x: filterAdoptedExpressions(
      relationship?.style?.adopted || [],
      language
    ).slice(0, 8),

    r: (relationship?.recentReplies || [])
      .slice(-4)
      .map((value) => String(value).slice(0, 180)),

    hooks: safeHooks,

    g: {
      played: Number(gameProfile.gamesPlayed || 0),
      wins: Number(gameProfile.wins || 0),
      losses: Number(gameProfile.losses || 0),
      draws: Number(gameProfile.draws || 0),
      rematches: Number(gameProfile.rematches || 0),
      avgReactionMs: Number(gameProfile.avgReactionMs || 0),
      lastGame: String(gameProfile.lastGame || ""),
      lastResult: String(gameProfile.lastResult || ""),
      favoriteGame: String(gameProfile.favoriteGame || ""),
    },
  };
}
