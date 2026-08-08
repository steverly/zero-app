import { ZERO_CONFIG } from "./zero-config";

const STORAGE_KEY = "zero_wallet_v6";

const COSMETICS = [
  {
    id: "bg_void",
    type: "background",
    label: "Deep Void",
    description: "le noir original de Zero",
    price: 0,
    preview: "black",
  },
  {
    id: "bg_aurora",
    type: "background",
    label: "Aurora Room",
    description: "voiles cyan et violet qui bougent",
    price: 260,
    preview: "cyan",
  },
  {
    id: "bg_sunset",
    type: "background",
    label: "Sunset Room",
    description: "ciel peach, horizon rose et lumière douce",
    price: 280,
    preview: "peach",
  },
  {
    id: "bg_arcade",
    type: "background",
    label: "Dream Arcade",
    description: "grille néon et étoiles lentes",
    price: 320,
    preview: "violet",
  },
  {
    id: "bg_aquarium",
    type: "background",
    label: "Aquarium",
    description: "lueurs d’eau et bulles calmes",
    price: 340,
    preview: "cyan",
  },
  {
    id: "bg_cloud",
    type: "background",
    label: "Cloud Nine",
    description: "nuages pastel flottants",
    price: 360,
    preview: "peach",
  },

  {
    id: "eyes_violet",
    type: "eyes",
    label: "Violet Pulse",
    description: "yeux violet électrique",
    price: 130,
    preview: "violet",
  },
  {
    id: "eyes_cyan",
    type: "eyes",
    label: "Aqua Pulse",
    description: "yeux cyan lumineux",
    price: 140,
    preview: "cyan",
  },
  {
    id: "eyes_peach",
    type: "eyes",
    label: "Sunset Glow",
    description: "yeux peach et rose",
    price: 140,
    preview: "peach",
  },
  {
    id: "eyes_prism",
    type: "eyes",
    label: "Prism",
    description: "reflet multiton très léger",
    price: 220,
    preview: "violet",
  },

  {
    id: "fx_orbit",
    type: "effect",
    label: "Orbit",
    description: "deux étoiles tournent autour de Zero",
    price: 220,
    preview: "violet",
  },
  {
    id: "fx_stardust",
    type: "effect",
    label: "Stardust",
    description: "poussière d’étoiles flottante",
    price: 260,
    preview: "cyan",
  },
  {
    id: "fx_echo",
    type: "effect",
    label: "Echo",
    description: "ondes fantômes autour de lui",
    price: 240,
    preview: "violet",
  },
  {
    id: "fx_fireflies",
    type: "effect",
    label: "Fireflies",
    description: "petites lumières chaudes qui vivent",
    price: 300,
    preview: "peach",
  },
  {
    id: "fx_glitch",
    type: "effect",
    label: "Soft Glitch",
    description: "mini décalages numériques occasionnels",
    price: 320,
    preview: "cyan",
  },

  {
    id: "accessory_crown",
    type: "accessory",
    label: "Float Crown",
    description: "couronne flottante au-dessus de ses yeux",
    price: 360,
    preview: "peach",
  },
  {
    id: "accessory_headphones",
    type: "accessory",
    label: "Zero Phones",
    description: "casque futuriste autour de lui",
    price: 420,
    preview: "violet",
  },
  {
    id: "accessory_horns",
    type: "accessory",
    label: "Little Horns",
    description: "deux petites cornes lumineuses",
    price: 350,
    preview: "violet",
  },
  {
    id: "accessory_visor",
    type: "accessory",
    label: "Visor",
    description: "visière holographique devant les yeux",
    price: 460,
    preview: "cyan",
  },
  {
    id: "accessory_wings",
    type: "accessory",
    label: "Mini Wings",
    description: "petites ailes lumineuses sur les côtés",
    price: 440,
    preview: "peach",
  },
  {
    id: "accessory_shards",
    type: "accessory",
    label: "Shards",
    description: "fragments cristallins autour du Core",
    price: 340,
    preview: "cyan",
  },
];

const BOOSTS = [
  {
    id: "boost_core_20",
    type: "boost",
    label: "Core Rush",
    description: "Core ×1.5 pendant 20 min",
    price: 120,
    durationMs: 20 * 60 * 1000,
    effect: "core",
    multiplier: 1.5,
  },
  {
    id: "boost_coins_3",
    type: "boost",
    label: "Win Spark",
    description: "coins ×2 sur tes 3 prochaines victoires",
    price: 150,
    effect: "winCoins",
    uses: 3,
    multiplier: 2,
  },
  {
    id: "boost_arcade_60",
    type: "boost",
    label: "Arcade Key",
    description: "tous les jeux ouverts 60 min",
    price: 90,
    durationMs: 60 * 60 * 1000,
    effect: "arcade",
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
      equipped: {
        ...fallback.equipped,
        ...(saved?.equipped || {}),
      },
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
