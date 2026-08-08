import { ZERO_CONFIG } from "./zero-config";

const STORAGE_KEY = "zero_wallet_v6";

const COSMETICS = [
  {
    id: "bg_void",
    type: "background",
    label: "Original",
    description: "le décor classique de Zero",
    price: 0,
    preview: "black",
  },
  {
    id: "bg_sunset",
    type: "background",
    label: "Sunset",
    description: "un coucher de soleil doux et chaleureux",
    price: 260,
    preview: "peach",
  },
  {
    id: "bg_aquarium",
    type: "background",
    label: "Blue Room",
    description: "une ambiance bleue calme avec reflets d’eau",
    price: 300,
    preview: "cyan",
  },
  {
    id: "bg_cloud",
    type: "background",
    label: "Cloud Room",
    description: "un ciel pastel et des nuages qui flottent",
    price: 320,
    preview: "peach",
  },

  {
    id: "eyes_violet",
    type: "eyes",
    label: "Lavender",
    description: "une lueur violette douce",
    price: 120,
    preview: "violet",
  },
  {
    id: "eyes_cyan",
    type: "eyes",
    label: "Aqua",
    description: "une lueur bleu clair",
    price: 120,
    preview: "cyan",
  },
  {
    id: "eyes_peach",
    type: "eyes",
    label: "Warm",
    description: "une lueur chaude légèrement rosée",
    price: 120,
    preview: "peach",
  },

  {
    id: "fx_fireflies",
    type: "effect",
    label: "Fireflies",
    description: "quelques petites lumières chaudes autour de Zero",
    price: 220,
    preview: "peach",
  },
  {
    id: "fx_stardust",
    type: "effect",
    label: "Soft Stars",
    description: "de petites étoiles très discrètes",
    price: 220,
    preview: "cyan",
  },

  {
    id: "accessory_crown",
    type: "accessory",
    label: "Crown",
    description: "une petite couronne flottante propre",
    price: 280,
    preview: "peach",
  },
  {
    id: "accessory_headphones",
    type: "accessory",
    label: "Headphones",
    description: "un vrai casque simple autour de Zero",
    price: 320,
    preview: "violet",
  },
  {
    id: "accessory_beanie",
    type: "accessory",
    label: "Beanie",
    description: "un bonnet doux posé au-dessus de ses yeux",
    price: 300,
    preview: "cyan",
  },
];

const ALLOWED_COSMETIC_IDS = new Set(
  COSMETICS.map((item) => item.id)
);

function sanitizeEquipped(equipped = {}) {
  const next = {
    background: "bg_void",
    eyes: "",
    effect: "",
    accessory: "",
  };

  for (const type of Object.keys(next)) {
    const id = String(equipped?.[type] || "");

    if (!id) {
      next[type] = type === "background" ? "bg_void" : "";
      continue;
    }

    next[type] = ALLOWED_COSMETIC_IDS.has(id)
      ? id
      : type === "background"
        ? "bg_void"
        : "";
  }

  return next;
}

const BOOSTS = [
  {
    id: "boost_core_20",
    type: "boost",
    label: "Core Boost",
    description: "Core ×1.5 pendant 20 min",
    price: 120,
    durationMs: 20 * 60 * 1000,
    effect: "core",
    multiplier: 1.5,
  },
  {
    id: "boost_coins_3",
    type: "boost",
    label: "Win Bonus",
    description: "coins ×2 sur tes 3 prochaines victoires",
    price: 150,
    effect: "winCoins",
    uses: 3,
    multiplier: 2,
  },
];

export function getShopCatalog() {
  return {
    cosmetics: COSMETICS,
    boosts: BOOSTS,
  };
}

export function createDefaultWallet() {
  return {
    version: 6,
    coins: ZERO_CONFIG.wallet.starterCoins,
    lifetimeCoins: ZERO_CONFIG.wallet.starterCoins,
    owned: ["bg_void"],
    equipped: {
      background: "bg_void",
      eyes: "",
      effect: "",
      accessory: "",
    },
    boosts: {
      coreUntil: 0,
      coreMultiplier: 1,
      winCoinUses: 0,
      winCoinMultiplier: 1,
      arcadeUntil: 0,
    },
    coreRewardClaims: [],
    coinRewardDay: new Date().toISOString().slice(0, 10),
    coinRewardedToday: 0,
  };
}

export function loadWallet() {
  const fallback = createDefaultWallet();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return fallback;

    const saved = JSON.parse(raw);

    return {
      ...fallback,
      ...saved,
      owned: Array.isArray(saved?.owned)
        ? [...new Set(["bg_void", ...saved.owned])]
        : fallback.owned,
      equipped: sanitizeEquipped({
        ...fallback.equipped,
        ...(saved?.equipped || {}),
      }),
      boosts: {
        ...fallback.boosts,
        ...(saved?.boosts || {}),
      },
      coreRewardClaims: Array.isArray(saved?.coreRewardClaims)
        ? saved.coreRewardClaims
        : [],
    };
  } catch {
    return fallback;
  }
}

export function saveWallet(wallet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  } catch {
    // ignore
  }
}

export function addCoins(wallet, amount) {
  const safeAmount = Math.max(0, Math.round(Number(amount || 0)));

  return {
    ...wallet,
    coins: Math.min(
      ZERO_CONFIG.wallet.maxCoins,
      Number(wallet.coins || 0) + safeAmount
    ),
    lifetimeCoins:
      Number(wallet.lifetimeCoins || 0) + safeAmount,
  };
}

export function spendCoins(wallet, amount) {
  const safeAmount = Math.max(0, Math.round(Number(amount || 0)));

  if (Number(wallet.coins || 0) < safeAmount) {
    return null;
  }

  return {
    ...wallet,
    coins: Number(wallet.coins || 0) - safeAmount,
  };
}

export function buyCosmetic(wallet, item) {
  if (!item || item.type === "boost") return wallet;

  if (wallet.owned.includes(item.id)) {
    return equipCosmetic(wallet, item);
  }

  const spent = spendCoins(wallet, item.price);
  if (!spent) return null;

  return equipCosmetic(
    {
      ...spent,
      owned: [...spent.owned, item.id],
    },
    item
  );
}

export function equipCosmetic(wallet, item) {
  if (!item || !wallet.owned.includes(item.id)) return wallet;

  return {
    ...wallet,
    equipped: {
      ...wallet.equipped,
      [item.type]: item.id,
    },
  };
}

export function buyBoost(wallet, item) {
  if (!item || item.type !== "boost") return wallet;

  const spent = spendCoins(wallet, item.price);
  if (!spent) return null;

  const now = Date.now();
  const boosts = { ...spent.boosts };

  if (item.effect === "core") {
    boosts.coreUntil =
      Math.max(now, Number(boosts.coreUntil || 0)) +
      item.durationMs;
    boosts.coreMultiplier = item.multiplier;
  }

  if (item.effect === "winCoins") {
    boosts.winCoinUses =
      Number(boosts.winCoinUses || 0) + item.uses;
    boosts.winCoinMultiplier = item.multiplier;
  }

  if (item.effect === "arcade") {
    boosts.arcadeUntil =
      Math.max(now, Number(boosts.arcadeUntil || 0)) +
      item.durationMs;
  }

  return {
    ...spent,
    boosts,
  };
}

export function getWalletCoreMultiplier(wallet) {
  return Date.now() < Number(wallet?.boosts?.coreUntil || 0)
    ? Number(wallet?.boosts?.coreMultiplier || 1)
    : 1;
}

export function hasWalletArcadePass(wallet) {
  return Date.now() < Number(wallet?.boosts?.arcadeUntil || 0);
}

export function rewardGameCoins(wallet, result) {
  let amount =
    result === "win"
      ? ZERO_CONFIG.wallet.winCoins
      : result === "draw"
        ? ZERO_CONFIG.wallet.drawCoins
        : ZERO_CONFIG.wallet.lossCoins;

  const boosted =
    result === "win" &&
    Number(wallet?.boosts?.winCoinUses || 0) > 0;

  let next = { ...wallet, boosts: { ...wallet.boosts } };

  if (boosted) {
    amount *= Number(wallet.boosts.winCoinMultiplier || 1);
    next.boosts.winCoinUses =
      Math.max(0, Number(wallet.boosts.winCoinUses || 0) - 1);
  }

  return {
    wallet: addCoins(next, amount),
    amount,
    boosted,
  };
}

export function claimCoreStageReward(wallet, stageIndex) {
  if (
    stageIndex <= 0 ||
    wallet.coreRewardClaims.includes(stageIndex)
  ) {
    return {
      wallet,
      amount: 0,
    };
  }

  const amount =
    ZERO_CONFIG.core.phaseCoinRewards[stageIndex] || 0;

  return {
    wallet: {
      ...addCoins(wallet, amount),
      coreRewardClaims: [
        ...wallet.coreRewardClaims,
        stageIndex,
      ],
    },
    amount,
  };
}

export function getCoreStageIndex(energy) {
  const thresholds = ZERO_CONFIG.core.phaseThresholds;
  let index = 0;

  for (let i = 0; i < thresholds.length; i += 1) {
    if (Number(energy || 0) >= thresholds[i]) {
      index = i;
    }
  }

  return index;
}

export function canClaimCoinReward(wallet, maxPerDay = 5) {
  const today = new Date().toISOString().slice(0, 10);

  const count =
    wallet?.coinRewardDay === today
      ? Number(wallet?.coinRewardedToday || 0)
      : 0;

  return count < maxPerDay;
}

export function getCoinRewardedToday(wallet) {
  const today = new Date().toISOString().slice(0, 10);

  return wallet?.coinRewardDay === today
    ? Number(wallet?.coinRewardedToday || 0)
    : 0;
}

export function grantCoinReward(wallet, amount = 45) {
  const today = new Date().toISOString().slice(0, 10);

  const count =
    wallet?.coinRewardDay === today
      ? Number(wallet?.coinRewardedToday || 0)
      : 0;

  return {
    ...addCoins(wallet, amount),
    coinRewardDay: today,
    coinRewardedToday: count + 1,
  };
}

export function resetCosmetics(wallet) {
  return {
    ...wallet,
    equipped: {
      background: "bg_void",
      eyes: "",
      effect: "",
      accessory: "",
    },
  };
}

export function addPurchasedCoins(wallet, amount) {
  return addCoins(wallet, amount);
}

export function getCosmeticState(wallet) {
  return {
    background: wallet?.equipped?.background || "bg_void",
    eyes: wallet?.equipped?.eyes || "",
    effect: wallet?.equipped?.effect || "",
    accessory: wallet?.equipped?.accessory || "",
  };
}
