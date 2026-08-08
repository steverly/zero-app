const pick = (items) =>
  items[Math.floor(Math.random() * items.length)];

function microSignals(overrides = {}) {
  return {
    interactionQuality: 0.18,
    depth: 0.02,
    humor: 0.08,
    warmth: 0.4,
    disrespect: 0,
    openness: 0,
    userVerbosity: 0.05,
    userInitiative: 0.15,
    ...overrides,
  };
}

function payload(reply, {
  humor = 0.08,
  warmth = 0.42,
  action = "none",
  signals = {},
} = {}) {
  return {
    local: true,
    reply,
    action,

    emotion: {
      energy: 0.5,
      warmth,
      humor,
      annoyance: 0.02,
      confidence: 0.78,
      surprise: 0,
    },

    signals: microSignals(signals),

    followUp: {
      shouldSend: false,
      message: "",
      delayMs: 0,
    },

    memoryCandidate: null,
    usedMemoryId: "",
  };
}

export function tryLocalMicroReply({
  message,
  language,
  relationship,
}) {
  const text = String(message || "").trim();

  // On laisse les deux premières interactions au modèle :
  // le premier contact doit être riche et le moteur doit apprendre.
  if (Number(relationship?.i || 0) < 2) {
    return null;
  }

  if (text.length > 28) return null;

  const lower = text.toLowerCase();

  const laughter =
    /^(m+d+r+|ptdr+|jpp+|lol+|lmao+|w+k+w*k+|😂+|😭+|💀+)$/iu;

  const acknowledgements = {
    fr: /^(oe+|ouais+|ok+|okay+|dacc+|d'accord|grave+)$/iu,
    en: /^(yeah+|yep+|ok+|okay+|fair+|sure+)$/iu,
    id: /^(iya+|ya+|oke+|ok+|sip+|yaudah+|bener+|betul+)$/iu,
  };

  const thanks = {
    fr: /^(merci+|mercii+)$/iu,
    en: /^(thanks+|thank you+|ty+)$/iu,
    id: /^(makasih+|makasi+|terima kasih+|thanks+)$/iu,
  };

  if (laughter.test(lower)) {
    const replies = {
      fr: ["mdr", "😭", "j’avoue", "..."],
      en: ["lol", "😭", "fair", "..."],
      id: ["wkwk", "😭", "iya sih", "..."],
    };

    return payload(
      pick(replies[language] || replies.fr),
      {
        humor: 0.78,
        signals: {
          interactionQuality: 0.22,
          humor: 0.85,
          warmth: 0.52,
        },
      }
    );
  }

  if ((acknowledgements[language] || acknowledgements.fr).test(lower)) {
    const replies = {
      fr: ["oe", "mhm", "ok", "voilà"],
      en: ["yeah", "mhm", "alright", "fair"],
      id: ["iya", "mhm", "oke", "yaudah"],
    };

    // Pas besoin de répondre à TOUS les acknowledgements.
    if (Math.random() < 0.24) {
      return payload("...", {
        warmth: 0.35,
      });
    }

    return payload(
      pick(replies[language] || replies.fr),
      {
        signals: {
          interactionQuality: 0.12,
        },
      }
    );
  }

  if ((thanks[language] || thanks.fr).test(lower)) {
    const replies = {
      fr: ["tkt", "oe tranquille", "normal"],
      en: ["all good", "yeah", "np"],
      id: ["santai", "iya", "gapapa", "aman"],
    };

    return payload(
      pick(replies[language] || replies.fr),
      {
        warmth: 0.58,
        signals: {
          warmth: 0.66,
          interactionQuality: 0.2,
        },
      }
    );
  }

  return null;
}
