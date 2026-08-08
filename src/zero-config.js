// ZERO V6 — produit, économie et arcade centralisés ici.

export const ZERO_CONFIG = Object.freeze({
  apiBase: "https://zero-app-ebsv.onrender.com",

  chat: {
    maxUserChars: 2000,
    recentHistoryMessages: 8,
    recentHistoryMaxAgeMs: 30 * 60 * 1000,
    starterTurns: 8,
    dailyRefillFloor: 5,
    maxStoredFreeTurns: 28,
  },

  rewarded: {
    chatTurns: 6,
    coreMultiplier: 1.6,
    coreBoostMinutes: 25,
    arcadePassMinutes: 60,
    maxPerDay: 5,
    earlyOfferAfterInteractions: 3,
  },

  core: {
    phaseThresholds: [0, 8, 26, 70, 180],
    phaseCoinRewards: [0, 80, 120, 180, 260],
    gameBaseEnergy: 1.35,
    fullGameRewardsPerDay: 5,
    halfGameRewardsPerDay: 10,
  },

  wallet: {
    starterCoins: 80,
    winCoins: 20,
    drawCoins: 6,
    lossCoins: 0,
    maxCoins: 999999,
  },

  arcade: {
    games: {
      tictactoe: {
        label: "Morpion",
        short: "3×3",
        unlockEnergy: 0,
      },
      reflex: {
        label: "Réflexes",
        short: "GO",
        unlockEnergy: 0,
      },
      rps: {
        label: "Pierre · Feuille · Ciseaux",
        short: "RPS",
        unlockEnergy: 5,
      },
      connect4: {
        label: "Puissance 4",
        short: "4",
        unlockEnergy: 18,
      },
      memory: {
        label: "Mémoire Duel",
        short: "MEM",
        unlockEnergy: 32,
      },
      twentyone: {
        label: "Duel 21",
        short: "21",
        unlockEnergy: 48,
      },
      secret: {
        label: "Nombre secret",
        short: "?",
        unlockEnergy: 72,
      },
      codebreaker: {
        label: "Codebreaker",
        short: "◆",
        unlockEnergy: 105,
      },
    },
  },

  shop: {
    coinPacks: {
      small: {
        id: "small",
        label: "500 coins",
        coins: 500,
        productIdentifier: "zero_coins_500",
      },
      medium: {
        id: "medium",
        label: "1 400 coins",
        coins: 1400,
        productIdentifier: "zero_coins_1400",
      },
      large: {
        id: "large",
        label: "3 200 coins",
        coins: 3200,
        productIdentifier: "zero_coins_3200",
      },
    },
  },
});

export function getGameConfig(gameId) {
  return ZERO_CONFIG.arcade.games[gameId] || null;
}
