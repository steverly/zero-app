import { ZERO_CONFIG } from "./zero-config";

const STORAGE_KEY = "zero_economy_v5";

function dayKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function createDefaultEconomy() {
  return {
    version: 5,
    dayKey: dayKey(),
    chatTurns: ZERO_CONFIG.chat.starterTurns,
    rewardedToday: 0,
    coreBoostUntil: 0,
    arcadePassUntil: 0,
    earlyOfferSeen: false,
    totalRewardedViews: 0,
  };
}

export function loadEconomy() {
  const fallback = createDefaultEconomy();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const currentDay = dayKey();

    const merged = {
      ...fallback,
      ...parsed,
    };

    if (merged.dayKey !== currentDay) {
      merged.dayKey = currentDay;
      merged.rewardedToday = 0;

      // Pas de streak punitive.
      // On remet juste un petit confort si l'utilisateur était à sec.
      merged.chatTurns = Math.max(
        Number(merged.chatTurns || 0),
        ZERO_CONFIG.chat.dailyRefillFloor
      );
    }

    merged.chatTurns = Math.max(
      0,
      Math.min(
        ZERO_CONFIG.chat.maxStoredFreeTurns,
        Number(merged.chatTurns || 0)
      )
    );

    return merged;
  } catch {
    return fallback;
  }
}

export function saveEconomy(economy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(economy));
  } catch {
    // ignore
  }
}

export function consumeChatTurn(economy) {
  return {
    ...economy,
    chatTurns: Math.max(0, Number(economy.chatTurns || 0) - 1),
  };
}

export function canWatchRewarded(economy) {
  return (
    Number(economy.rewardedToday || 0) <
    ZERO_CONFIG.rewarded.maxPerDay
  );
}

export function grantRewardedBundle(economy) {
  const now = Date.now();
  const coreBoostMs = ZERO_CONFIG.rewarded.coreBoostMinutes * 60_000;
  const arcadePassMs = ZERO_CONFIG.rewarded.arcadePassMinutes * 60_000;

  return {
    ...economy,
    dayKey: dayKey(now),

    chatTurns: Math.min(
      ZERO_CONFIG.chat.maxStoredFreeTurns,
      Number(economy.chatTurns || 0) +
        ZERO_CONFIG.rewarded.chatTurns
    ),

    rewardedToday: Number(economy.rewardedToday || 0) + 1,
    totalRewardedViews: Number(economy.totalRewardedViews || 0) + 1,

    // Un nouveau boost prolonge le boost existant au lieu de l'écraser.
    coreBoostUntil:
      Math.max(now, Number(economy.coreBoostUntil || 0)) + coreBoostMs,

    arcadePassUntil:
      Math.max(now, Number(economy.arcadePassUntil || 0)) + arcadePassMs,

    earlyOfferSeen: true,
  };
}

export function getCoreMultiplier(economy) {
  return Date.now() < Number(economy.coreBoostUntil || 0)
    ? ZERO_CONFIG.rewarded.coreMultiplier
    : 1;
}

export function hasArcadePass(economy) {
  return Date.now() < Number(economy.arcadePassUntil || 0);
}

export function getCoreBoostRemainingMs(economy) {
  return Math.max(
    0,
    Number(economy.coreBoostUntil || 0) - Date.now()
  );
}

export function getArcadePassRemainingMs(economy) {
  return Math.max(
    0,
    Number(economy.arcadePassUntil || 0) - Date.now()
  );
}

export function shouldHighlightRewarded(economy, relationship) {
  return (
    !economy.earlyOfferSeen &&
    Number(relationship?.interactionCount || 0) >=
      ZERO_CONFIG.rewarded.earlyOfferAfterInteractions &&
    canWatchRewarded(economy)
  );
}

export function markEarlyOfferSeen(economy) {
  return {
    ...economy,
    earlyOfferSeen: true,
  };
}

export function formatDuration(ms) {
  const minutes = Math.ceil(Math.max(0, ms) / 60_000);

  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
