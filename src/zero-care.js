const KEY = "zero_living_core_v1";

const clamp = (n) =>
  Math.max(
    0,
    Math.min(100, Number(n) || 0)
  );

const day = () =>
  new Date().toISOString().slice(0, 10);

const pick = (items) =>
  items[
    Math.floor(
      Math.random() * items.length
    )
  ];

export function loadLivingCore() {
  const base = {
    bond: 4,
    curiosity: 20,
    playUrge: 24,
    sharedMoments: 0,
    lastImpulseAt: 0,
    lastInteractionAt: Date.now(),
    today: day(),
    recent: [],
    careXP: 0,
    careLevel: 1,
    careCoinsClaimed: 0,
  };

  try {
    const saved =
      JSON.parse(
        localStorage.getItem(KEY) || "null"
      );

    if (!saved) return base;

    const value = {
      ...base,
      ...saved,
    };

    if (value.today !== day()) {
      value.today = day();
      value.curiosity =
        clamp(value.curiosity + 10);
      value.playUrge =
        clamp(value.playUrge + 8);
    }

    return value;
  } catch {
    return base;
  }
}

export function saveLivingCore(value) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(value)
    );
  } catch {
    // ignore
  }
}

export function recordLivingChat(
  value,
  signals = {}
) {
  const quality =
    Math.max(
      0.15,
      Math.min(
        1,
        (
          Number(signals.depth || 0.3) +
          Number(signals.openness || 0.3) +
          Number(signals.humor || 0.1)
        ) / 1.7
      )
    );

  return {
    ...value,
    bond: clamp(
      value.bond +
        1.4 +
        quality * 2.6
    ),
    curiosity: clamp(
      value.curiosity -
        2 +
        Number(signals.openness || 0) * 4
    ),
    playUrge: clamp(
      value.playUrge +
        1 +
        Number(signals.humor || 0) * 3
    ),
    sharedMoments:
      Number(value.sharedMoments || 0) + 1,
    lastInteractionAt: Date.now(),
  };
}

export function recordLivingGame(
  value,
  result = ""
) {
  return {
    ...value,
    bond: clamp(
      value.bond +
        (result === "win" ? 3.8 : 3.1)
    ),
    curiosity: clamp(
      value.curiosity + 2
    ),
    playUrge: clamp(
      value.playUrge - 14
    ),
    sharedMoments:
      Number(value.sharedMoments || 0) + 1,
    lastGameResult: result,
    lastInteractionAt: Date.now(),
  };
}

const GAME_NAMES = {
  fr: {
    tictactoe: "morpion",
    reflex: "réflexes",
    rps: "pierre feuille ciseaux",
    connect4: "puissance 4",
    memory: "mémoire",
    tapduel: "tap duel",
    secret: "nombre secret",
    codebreaker: "codebreaker",
  },

  en: {
    tictactoe: "tic tac toe",
    reflex: "reflex",
    rps: "rock paper scissors",
    connect4: "connect four",
    memory: "memory",
    tapduel: "tap duel",
    secret: "secret number",
    codebreaker: "codebreaker",
  },

  id: {
    tictactoe: "tic tac toe",
    reflex: "refleks",
    rps: "batu gunting kertas",
    connect4: "connect four",
    memory: "memory",
    tapduel: "tap duel",
    secret: "angka rahasia",
    codebreaker: "codebreaker",
  },
};

const PLAY_LINES = {
  fr: (name) => [
    `eh viens ${name}`,
    `viens on fait ${name}`,
    `att viens me battre à ${name}`,
    `jveux ma revanche à ${name}`,
  ],

  en: (name) => [
    `yo come play ${name}`,
    `come on ${name}`,
    `come beat me at ${name}`,
    `I want my ${name} rematch`,
  ],

  id: (name) => [
    `eh ayo ${name}`,
    `sini main ${name}`,
    `ayo lawan gue di ${name}`,
    `gue mau rematch ${name}`,
  ],
};

export function chooseZeroImpulse(
  value,
  language = "fr",
  relationship = null
) {
  // IMPORTANT:
  // This function is now PLAY-ONLY.
  // Conversation initiative belongs exclusively to
  // App.jsx -> triggerZeroInitiative() -> OpenAI.
  //
  // This prevents "talk" from accidentally becoming
  // an OUI/NON prompt or launching Arcade.

  if (
    Date.now() -
      Number(value.lastImpulseAt || 0) <
    75000
  ) {
    return null;
  }

  const energy =
    Number(
      relationship?.totalEnergy || 0
    );

  const games = [
    ["tictactoe", 0],
    ["reflex", 0],
    ["rps", 5],
    ["connect4", 18],
    ["memory", 32],
    ["tapduel", 48],
    ["secret", 72],
    ["codebreaker", 105],
  ].filter(
    ([, unlock]) =>
      energy >= unlock
  );

  if (!games.length) {
    return null;
  }

  const gamesPlayed =
    Number(
      relationship
        ?.gameProfile
        ?.gamesPlayed || 0
    );

  // Play urges can trigger a REAL game proposal,
  // but not every living-core pulse becomes one.
  const playChance =
    Math.min(
      0.72,
      0.16 +
        Number(value.playUrge || 0) /
          190 +
        Math.min(
          0.14,
          gamesPlayed / 100
        )
    );

  if (Math.random() >= playChance) {
    return null;
  }

  const picked =
    games[
      Math.floor(
        Math.random() * games.length
      )
    ]?.[0] || "tictactoe";

  const names =
    GAME_NAMES[language] ||
    GAME_NAMES.fr;

  const name =
    names[picked] || picked;

  const lineFactory =
    PLAY_LINES[language] ||
    PLAY_LINES.fr;

  return {
    id: String(Date.now()),
    type: "play",
    gameId: picked,
    text: pick(
      lineFactory(name)
    ),
  };
}

export function markImpulseShown(
  value,
  impulse
) {
  return {
    ...value,
    lastImpulseAt: Date.now(),
    recent: [
      ...(value.recent || []),
      impulse.type,
    ].slice(-5),
  };
}

export function livingCoreLabel(
  value,
  language = "fr"
) {
  const bond =
    Number(value.bond || 0);

  const index =
    bond >= 78
      ? 4
      : bond >= 48
        ? 3
        : bond >= 24
          ? 2
          : bond >= 10
            ? 1
            : 0;

  const labels = {
    fr: [
      "il t'observe",
      "il te capte",
      "il prend ses habitudes",
      "vous avez vos délires",
      "c'est vraiment ton Zero",
    ],

    en: [
      "he's observing you",
      "he's getting you",
      "he's building habits",
      "you've got your own thing",
      "this is really your Zero",
    ],

    id: [
      "dia lagi merhatiin kamu",
      "dia mulai ngerti kamu",
      "dia mulai punya kebiasaan",
      "kalian udah punya vibe sendiri",
      "ini beneran Zero kamu",
    ],
  };

  return {
    label:
      (labels[language] || labels.fr)[index],
    progress: clamp(bond),
  };
}

export function getCareProgress(value) {
  const xp =
    Number(value.careXP || 0);

  const level =
    Math.max(
      1,
      Math.floor(xp / 80) + 1
    );

  const inside =
    xp % 80;

  return {
    level,
    xp,
    inside,
    needed: 80,
    percent:
      (inside / 80) * 100,
    claimable:
      Math.max(
        0,
        (level - 1) -
          Number(
            value.careCoinsClaimed || 0
          )
      ),
  };
}

export function addCareXP(
  value,
  amount
) {
  const next = {
    ...value,
    careXP:
      Number(value.careXP || 0) +
      Math.max(
        0,
        Number(amount) || 0
      ),
  };

  next.careLevel =
    getCareProgress(next).level;

  return next;
}

export function claimCareReward(value) {
  const progress =
    getCareProgress(value);

  if (progress.claimable <= 0) {
    return {
      state: value,
      coins: 0,
    };
  }

  const count =
    progress.claimable;

  return {
    state: {
      ...value,
      careCoinsClaimed:
        Number(
          value.careCoinsClaimed || 0
        ) + count,
    },
    coins:
      count * 35,
  };
}

export function getZeroWants(
  value,
  language = "fr"
) {
  const text = {
    fr: {
      play: "il a envie de jouer",
      talk: "il veut te parler",
      chill: "il est posé",
      reward: "récompense prête",
    },

    en: {
      play: "he wants to play",
      talk: "he wants to talk",
      chill: "he's chilling",
      reward: "reward ready",
    },

    id: {
      play: "dia pengen main",
      talk: "dia mau ngobrol",
      chill: "dia lagi santai",
      reward: "hadiah siap",
    },
  };

  const copy =
    text[language] || text.fr;

  const progress =
    getCareProgress(value);

  if (progress.claimable > 0) {
    return {
      type: "reward",
      text: copy.reward,
    };
  }

  if (
    Number(value.playUrge || 0) > 48
  ) {
    return {
      type: "play",
      text: copy.play,
    };
  }

  if (
    Number(value.curiosity || 0) > 45
  ) {
    // This is only a CORE STATUS label.
    // It does NOT create a talk prompt.
    return {
      type: "talk",
      text: copy.talk,
    };
  }

  return {
    type: "chill",
    text: copy.chill,
  };
}
