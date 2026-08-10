import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { initAdMob, showRewardedAd } from "./admob";
import "./styles.css";
import { Purchases } from '@revenuecat/purchases-capacitor';
import ZeroEntity from "./ZeroEntity";
import {
  loadRelationship,
  saveRelationship,
  evolveRelationship,
  evolveRelationshipFromGame,
  getServerRelationshipContext,
} from "./zero-relationship";

import { ZERO_CONFIG } from "./zero-config";

import {
  loadEconomy,
  saveEconomy,
  consumeChatTurn,
  canWatchRewarded,
  grantRewardedBundle,
  getCoreMultiplier,
  getCoreBoostRemainingMs,
  shouldHighlightRewarded,
  markEarlyOfferSeen,
} from "./zero-economy";

import ZeroCoreButton from "./ZeroCoreButton";
import ZeroCorePanel from "./ZeroCorePanel";
import ZeroArcade from "./ZeroArcade";
import ZeroShop from "./ZeroShop";
import ZeroWalletPanel from "./ZeroWalletPanel";
import ZeroSettings from "./ZeroSettings";
import ZeroCosmeticsLayer, { cosmeticClassNames } from "./ZeroCosmeticsLayer";
import ZeroWorldBackground from "./ZeroWorldBackground";
import { getCosmeticState } from "./zero-wallet";

import {
  loadWallet,
  saveWallet,
  rewardGameCoins,
  claimCoreStageReward,
  getCoreStageIndex,
  addPurchasedCoins,
  getWalletCoreMultiplier,
  canClaimCoinReward,
  getCoinRewardedToday,
  grantCoinReward,
} from "./zero-wallet";

import {
  loadZeroLanguage,
  saveZeroLanguage,
} from "./zero-language";

import { gameSfx } from "./zero-game-sfx";
import { zeroAudio } from "./zero-audio";
import { zeroVoice } from "./zero-voice";
import { getZeroCopy } from "./zero-i18n";
import {
  loadBoundaryState,
  saveBoundaryState,
  updateBoundaryFromSignals,
  attemptReconcile,
  finishReconciliation,
  departureLine,
  boundarySnarkLine,
  mergeDisrespectSignal,
} from "./zero-boundaries";
import { loadLivingCore, saveLivingCore, recordLivingChat, recordLivingGame, chooseZeroImpulse, markImpulseShown, livingCoreLabel, getCareProgress, addCareXP, claimCareReward, getZeroWants } from "./zero-care";
import "./zero-v5.css";

const MAX_CHARS = ZERO_CONFIG.chat.maxUserChars;
const MEMORY_TIMEOUT_MS = ZERO_CONFIG.chat.recentHistoryMaxAgeMs;
const MAX_MEMORY_MESSAGES = ZERO_CONFIG.chat.recentHistoryMessages;
const API_BASE = ZERO_CONFIG.apiBase;
const TEST_MODE = ZERO_CONFIG.testMode === true || import.meta.env.DEV;


const DEFAULT_ZERO_STATE = {
  mood: "neutral",
  energy: 0.58,
  warmth: 0.62,
  amusement: 0.25,
  annoyance: 0.04,
  curiosity: 0.48,
  trust: 0.22,
  patience: 0.78,
  ego: 0.82,
};

// --------------------
// SFX
// --------------------
const playSound = (frequency, duration, volume = 0.15, type = "sine") => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // ignore
  }
};

const sfx = {
  send: () => playSound(820, 0.08, 0.12, "sine"),
  arrive: () => playSound(620, 0.14, 0.1, "triangle"),
  button: () => playSound(420, 0.05, 0.08, "sine"),
  soft: () => playSound(520, 0.04, 0.05, "sine"),
};

// --------------------
// API
// --------------------
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Erreur serveur");
  }

  return data;
}

async function sendToBot(payload) {
  const data = await apiPost("/api/reply", payload);

  return {
    reply:
      typeof data?.reply === "string" && data.reply.trim()
        ? data.reply
            .trim()
            .slice(0, ZERO_CONFIG.chat.maxZeroReplyChars)
        : "...",

    emotion: data?.emotion || {
      energy: 0.55,
      warmth: 0.55,
      humor: 0.1,
      annoyance: 0.05,
      confidence: 0.78,
      surprise: 0,
    },

    state: data?.state || null,
    action: typeof data?.action === "string" ? data.action : "none",

    followUp: {
      shouldSend: data?.followUp?.shouldSend === true,
      message:
        typeof data?.followUp?.message === "string"
          ? data.followUp.message.trim()
          : "",
      delayMs:
        typeof data?.followUp?.delayMs === "number"
          ? data.followUp.delayMs
          : 1200,
    },

    signals: data?.signals || {},
    memoryCandidate: data?.memoryCandidate || null,
    usedMemoryId:
      typeof data?.usedMemoryId === "string"
        ? data.usedMemoryId
        : "",

    local: data?.debug?.local === true,
  };
}

// Paywall / upgrade = texte local.
// Aucune raison de payer des tokens OpenAI pour afficher un paywall.
async function getPaywallLine(language = "fr") {
  const copy = getZeroCopy(language);
  const lines = copy.monetization.paywallLines;

  return {
    line: lines[Math.floor(Math.random() * lines.length)],
  };
}

async function getUpgradeLine(language = "fr") {
  const copy = getZeroCopy(language);
  const lines = copy.monetization.premiumLines;

  return {
    line: lines[Math.floor(Math.random() * lines.length)],
  };
}

// --------------------
// UI Helpers
// --------------------
function TypewriterText({
  text,
  speed = 16,
  expression = "normal",
}) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    setVisible("");
    if (!text) return;

    let index = 0;
    let blipStep = 0;

    zeroAudio.setSpeaking(true);

    const interval = setInterval(() => {
      index += 1;

      const character =
        text[index - 1] || "";

      setVisible(
        text.slice(0, index)
      );

      blipStep += 1;

      // NPC-style voice: not every single letter.
      // Roughly one blip every 2–4 readable characters.
      const cadence =
        2 + Math.floor(Math.random() * 3);

      if (
        blipStep >= cadence &&
        !/\s/.test(character)
      ) {
        zeroAudio.voiceBlip(
          expression,
          character
        );

        blipStep = 0;
      }

      if (index >= text.length) {
        clearInterval(interval);
        zeroAudio.setSpeaking(false);
      }
    }, speed);

    return () => {
      clearInterval(interval);
      zeroAudio.setSpeaking(false);
    };
  }, [text, speed, expression]);

 return (
  <span className="typewriter-text">
    {visible}
    <span className="typewriter-cursor" />
  </span>
);
}

function LoaderDots() {
  return (
    <div className="loader-dots" aria-label="Chargement">
      <span />
      <span />
      <span />
    </div>
  );
}

function FloatingShapes() {
  return (
    <div className="floating-shapes">
      <div className="shape shape-1" />
      <div className="shape shape-2" />
      <div className="shape shape-3" />
      <div className="shape shape-4" />
    </div>
  );
}

function InteractiveBackground() {
  const [ripples, setRipples] = useState([]);
  const rippleIdRef = useRef(0);

  const handleBackgroundClick = (e) => {
    if (
      e.target.classList.contains("main-area") ||
      e.target.classList.contains("center-stage") ||
      e.target.classList.contains("interactive-bg-layer")
    ) {
      sfx.soft();

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, x, y }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1200);
    }
  };

  return (
    <div className="interactive-bg-layer" onClick={handleBackgroundClick}>
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          className="ripple"
          style={{ left: ripple.x, top: ripple.y }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function FlyingMessage({ text, id }) {
  return (
    <div className="flying-message-layer">
      <AnimatePresence mode="wait">
        {text ? (
          <motion.div
            key={id}
            className="flying-message"
            initial={{ opacity: 0, y: 140, scale: 0.88, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -160, scale: 0.9, filter: "blur(6px)" }}
            transition={{
              duration: 0.62,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CenterReply({
  loading,
  reply,
  action = "none",
  mood = "idle",
  emotion,
  language = "fr",
  spontaneous = false,
  promptType = "",
  onPromptYes,
  onPromptNo,
  away = false,
  awaySeconds = 0,
  awayCopy = null,
  awayAccelerating = false,
  reconciliationStage = 0,
}) {
 useEffect(() => {
  if (!reply || loading) {
    return undefined;
  }

  sfx.arrive();

  const timer = window.setTimeout(() => {
    zeroVoice.react({
      mood,
      action,
      emotion,
      spontaneous,
    });
  }, spontaneous ? 90 : 170);

  return () => {
    window.clearTimeout(timer);
  };
}, [
  reply,
  loading,
  action,
  spontaneous,
]);
  const humor = Number(emotion?.humor || 0);
  const surprise = Number(emotion?.surprise || 0);
  const annoyance = Number(emotion?.annoyance || 0);
  const warmth = Number(emotion?.warmth || 0);
  const confidence = Number(emotion?.confidence || 0.78);

  // V6.1 : l'effet ne dépend plus uniquement de `action`.
  // Les émotions moyennes donnent aussi un feedback visible,
  // donc Zero n'a plus l'air statique 90% du temps.
  const expression =
    action === "laugh" || humor > 0.52
      ? "laugh"
      : action === "surprised" || surprise > 0.48
        ? "pop"
        : action === "refuse" || annoyance > 0.56
          ? "sharp"
          : action === "soften" || warmth > 0.64
            ? "soft"
            : action === "excited" ||
              (confidence > 0.88 && humor > 0.28)
              ? "hype"
              : action === "think"
                ? "think"
                : confidence > 0.84 &&
                  warmth < 0.52 &&
                  humor < 0.3
                  ? "dry"
                  : surprise > 0.3
                    ? "glitch"
                    : "normal";

  return (
    <div
      className={[
        "center-stage",
        "zero-reply-expression",
        `zero-reply-${expression}`,
        "",
        away ? "zero72-away-reply" : "",
      ].filter(Boolean).join(" ")}
      data-reply-mood={mood}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            className="reply-shell"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <LoaderDots />
          </motion.div>
        ) : (
          <motion.div
            key={`${reply || "empty"}-${expression}`}
            className="reply-shell"
            initial={
              expression === "pop"
                ? { opacity: 0, scale: 0.72, y: 8 }
                : expression === "sharp"
                  ? { opacity: 0, x: -8, scaleX: 0.94 }
                  : expression === "laugh"
                    ? { opacity: 0, y: 12, rotate: -1.2 }
                    : expression === "dry"
                      ? { opacity: 0, y: 4, scaleX: 1.04 }
                      : expression === "glitch"
                        ? { opacity: 0, x: 5, scale: 0.98 }
                        : { opacity: 0, y: 20, scale: 0.95 }
            }
            animate={
              expression === "hype"
                ? {
                    opacity: 1,
                    y: [0, -5, 0],
                    scale: [1, 1.035, 1],
                  }
                : expression === "laugh"
                  ? {
                      opacity: 1,
                      y: [0, -4, 1, 0],
                      rotate: [0, -0.7, 0.6, 0],
                    }
                  : expression === "glitch"
                    ? {
                        opacity: 1,
                        x: [0, -2, 2, 0],
                        scale: [1, 1.01, 0.995, 1],
                      }
                    : { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }
            }
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{
              duration:
                expression === "hype" || expression === "laugh"
                  ? 0.48
                  : 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="reply-text">
              {reply ? (
                <TypewriterText
                  text={reply}
                  expression={expression}
                  speed={
                    expression === "sharp"
                      ? 8
                      : expression === "hype"
                        ? 11
                        : expression === "soft"
                          ? 18
                          : expression === "dry"
                            ? 10
                            : expression === "glitch"
                              ? 9
                              : 14
                  }
                />
              ) : (
                <span className="reply-placeholder">
                  {uiCopy(language).emptyReply}
                </span>
              )}
            </div>
            {spontaneous && promptType === "play" ? (
              <motion.div
                className="zero72-choice-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
              >
                <button
                  type="button"
                  className="is-yes"
                  onClick={onPromptYes}
                >
                  {awayCopy?.yes}
                </button>

                <button
                  type="button"
                  className="is-no"
                  onClick={onPromptNo}
                >
                  {awayCopy?.no}
                </button>
              </motion.div>
            ) : null}

            {away ? (
              <div
                className={[
                  "zero72-away-status",
                  awayAccelerating
                    ? "is-accelerating"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <strong>{awayCopy?.title}</strong>

                <span className="zero73-block-time">
                  {awayAccelerating
                    ? awayCopy?.accelerating
                    : `${awayCopy?.wait} · ${awaySeconds}s`}
                </span>

                <div className="zero73-block-track">
                  <i
                    style={{
                      "--zero73-block":
                        `${Math.max(
                          0,
                          Math.min(
                            100,
                            awayAccelerating
                              ? (1 -
                                  Math.min(
                                    1,
                                    awaySeconds / 5
                                  )) *
                                100
                              : 100
                          )
                        )}%`,
                    }}
                  />
                </div>

                <small>
                  {reconciliationStage === 1
                    ? awayCopy?.sure
                    : awayAccelerating
                      ? "..."
                      : awayCopy?.apology}
                </small>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const UI_COPY = {
  fr: {
    placeholder: "Sois direct.",
    send: "Envoyer",
    unlimited: "illimité",
    messages: "messages",
    noMessages: "Plus de messages",
    emptyReply: "Parle à Zero",
  },
  en: {
    placeholder: "Say it.",
    send: "Send",
    unlimited: "unlimited",
    messages: "messages",
    noMessages: "No messages left",
    emptyReply: "Talk to Zero",
  },
  id: {
    placeholder: "Bilang aja.",
    send: "Kirim",
    unlimited: "tanpa batas",
    messages: "pesan",
    noMessages: "Pesan habis",
    emptyReply: "Ngobrol sama Zero",
  },
};

function uiCopy(language) {
  return UI_COPY[language] || UI_COPY.fr;
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  messagesLeft,
  maxChars,
  isPremium,
  language,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const copy = uiCopy(language);
  const remaining = maxChars - value.length;
  const canSend = !disabled && value.trim().length > 0;

  const handleSubmit = () => {
    if (canSend) {
      sfx.send();
      onSubmit();
    }
  };

  const handleButtonClick = () => {
    sfx.button();
    handleSubmit();
  };

  return (
    <div className="composer-wrap">
      <motion.div
        className={`composer-card ${isFocused ? "focused" : ""}`}
        initial={false}
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <textarea
          className="composer-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={copy.placeholder}
          maxLength={maxChars}
          rows={1}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <div className="composer-bottom">
          <div className="composer-meta">
            <span
              className={[
                "char-count",
                value.length > 0 ? "is-active" : "",
                remaining <= 100 ? "is-near-limit" : "",
                remaining <= 20 ? "warn" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`${value.length} / ${maxChars}`}
            >
              <strong>{value.length}</strong>
              <i>/</i>
              <span>{maxChars}</span>
            </span>
            <span className="message-count">
              {isPremium
                ? copy.unlimited
                : messagesLeft > 0
                  ? `${messagesLeft} ${copy.messages}`
                  : copy.noMessages}
            </span>
          </div>

          <motion.button
            className="send-btn"
            onClick={handleButtonClick}
            disabled={!canSend}
            type="button"
            whileTap={{ scale: canSend ? 0.94 : 1 }}
            transition={{ duration: 0.1 }}
          >
            {copy.send}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function PaywallModal({
  open,
  loading,
  line,
  onClose,
  onWatchAd,
  onOpenPremium,
  rewardedAvailable,
  language = "fr",
}) {
  const copy = getZeroCopy(language);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-card"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="modal-eyebrow">Zero</div>

            <div className="modal-text">
              {loading ? <LoaderDots /> : <TypewriterText text={line} speed={14} />}
            </div>

            <div className="modal-actions">
              <motion.button
                className="modal-btn modal-btn-primary zero-v51-ad-button"
                type="button"
                onClick={onWatchAd}
                disabled={loading || !rewardedAvailable}
                whileTap={{ scale: rewardedAvailable ? 0.965 : 1 }}
              >
                <span className="zero-v51-ad-icon" aria-hidden="true">
                  <i />
                </span>

                <span className="zero-v51-ad-copy">
                  <strong>
                    {rewardedAvailable
                      ? `+${ZERO_CONFIG.rewarded.chatTurns} ${copy.common.messages}`
                      : copy.monetization.boostUsed}
                  </strong>

                  <small>
                    {rewardedAvailable
                      ? copy.monetization.watchAd
                      : copy.monetization.tomorrow}
                  </small>
                </span>
              </motion.button>

              <div className="zero-v5-bundle-copy">
                <span>
                  {copy.monetization.coreFor}{" "}
                  {ZERO_CONFIG.rewarded.coreBoostMinutes} min · ×
                  {ZERO_CONFIG.rewarded.coreMultiplier}
                </span>
                <span>
                  {copy.monetization.arcadeFor}{" "}
                  {ZERO_CONFIG.rewarded.arcadePassMinutes} min
                </span>
              </div>

              <button
                className="modal-btn modal-btn-secondary"
                type="button"
                onClick={onOpenPremium}
                disabled={loading}
              >
                {copy.monetization.unlimited}
              </button>
            </div>



            <button className="modal-close" type="button" onClick={onClose}>
              {copy.monetization.close}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PremiumModal({
  open,
  loading,
  line,
  onClose,
  onPurchase,
  onRestore,
  language = "fr",
}) {
  const copy = getZeroCopy(language);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-card premium-card"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="modal-eyebrow">Zero Premium</div>

            <div className="modal-text">
              {loading ? <LoaderDots /> : <TypewriterText text={line} speed={14} />}
            </div>

            <div className="premium-price">4.99€/mois</div>

            <div className="premium-list">
              {copy.monetization.premiumFeatures.map((feature) => (
                <div key={feature}>{feature}</div>
              ))}
            </div>

           <button
  className="modal-btn modal-btn-primary"
  type="button"
  onClick={() => {
    sfx.button(); // Le petit son reste ici !
    onPurchase(); // Et ça lance le vrai achat juste après
  }}
>
  {copy.monetization.getUnlimited}
</button>

<button
  className="restore-btn"
  type="button"
  onClick={onRestore}
>
  {copy.monetization.restore}
</button>

            <button className="modal-close" type="button" onClick={onClose}>
              {copy.monetization.close}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


function getZeroMood(text) {
  const t = String(text || "").toLowerCase();

  if (!t.trim()) return "idle";

  if (
    t.includes("faux") ||
    t.includes("non") ||
    t.includes("bancal") ||
    t.includes("aucun sens") ||
    t.includes("mauvais") ||
    t.includes("c’est mort") ||
    t.includes("ça pue") ||
    t.includes("éclaté")
  ) {
    return "sharp";
  }

  if (
    t.includes("mdr") ||
    t.includes("😭") ||
    t.includes("😂") ||
    t.includes("t’abuses") ||
    t.includes("tu forces")
  ) {
    return "funny";
  }

  if (
    t.includes("propre") ||
    t.includes("bien") ||
    t.includes("grave") ||
    t.includes("bonne idée") ||
    t.includes("là oui")
  ) {
    return "warm";
  }

  if (
    t.includes("ça dépend") ||
    t.includes("possible") ||
    t.includes("peut-être") ||
    t.includes("pas sûr")
  ) {
    return "calm";
  }

  return "replying";
}



function normalizeQuickIntent(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPromptAccept(text = "", language = "fr") {
  const t = normalizeQuickIntent(text);

  const accepted = {
    fr: [
      "oui",
      "ouais",
      "oe",
      "go",
      "vas y",
      "vasy",
      "chaud",
      "grave",
      "allez",
      "letsgo",
      "let's go",
      "ok",
      "okay",
    ],
    en: [
      "yes",
      "yeah",
      "yep",
      "sure",
      "go",
      "lets go",
      "let's go",
      "okay",
      "ok",
      "im down",
      "i'm down",
    ],
    id: [
      "iya",
      "ya",
      "ayo",
      "gas",
      "oke",
      "ok",
      "boleh",
      "yuk",
      "hayuk",
    ],
  };

  return (accepted[language] || accepted.fr)
    .includes(t);
}

function isPromptReject(text = "", language = "fr") {
  const t = normalizeQuickIntent(text);

  const rejected = {
    fr: [
      "non",
      "nan",
      "nope",
      "pas envie",
      "plus tard",
      "flemme",
    ],
    en: [
      "no",
      "nah",
      "nope",
      "later",
      "not now",
    ],
    id: [
      "nggak",
      "gak",
      "enggak",
      "ga",
      "nanti",
      "nggak dulu",
      "gak dulu",
    ],
  };

  return (rejected[language] || rejected.fr)
    .includes(t);
}

export default function App() {
  const [relationship, setRelationship] = useState(() => loadRelationship());
  const [livingCore, setLivingCore] = useState(() => loadLivingCore());
  const [zeroImpulse, setZeroImpulse] = useState(null);
  const [spontaneousPrompt, setSpontaneousPrompt] = useState(null);
  const [boundaryTick, setBoundaryTick] = useState(Date.now());
  const [boundaryState, setBoundaryState] = useState(() => loadBoundaryState());
  const [economy, setEconomy] = useState(() => loadEconomy());
  const [wallet, setWallet] = useState(() => loadWallet());

  const [coreOpen, setCoreOpen] = useState(false);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [arcadeGameActive, setArcadeGameActive] = useState(false);
  const [arcadeStartGame, setArcadeStartGame] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioState, setAudioState] = useState(() => zeroAudio.getState());
  const [voiceState, setVoiceState] = useState(() => zeroVoice.getState());
  const [language, setLanguage] = useState(() => loadZeroLanguage());
  const [coinRewardLoading, setCoinRewardLoading] = useState(false);
  const [feedPulse, setFeedPulse] = useState(0);
  const [rewardToast, setRewardToast] = useState("");
  const [worldNotice, setWorldNotice] = useState(null);
  const previousEnergyRef = useRef(
    Number(relationship?.totalEnergy || 0)
  );
  const previousCoreStageRef = useRef(
    getCoreStageIndex(
      Number(relationship?.totalEnergy || 0)
    )
  );

  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState("idle");
  const [emotion, setEmotion] = useState({
    energy: 0.55,
    warmth: 0.55,
    humor: 0.1,
    annoyance: 0.05,
    confidence: 0.78,
    surprise: 0,
  });
  const [zeroState, setZeroState] = useState(() => {
    try {
      const saved = localStorage.getItem("zero_emotional_state");
      return saved ? { ...DEFAULT_ZERO_STATE, ...JSON.parse(saved) } : DEFAULT_ZERO_STATE;
    } catch {
      return DEFAULT_ZERO_STATE;
    }
  });
  const [zeroAction, setZeroAction] = useState("none");

  // ZERO TEMPS MORT
  // Zero is allowed to start a REAL AI interaction after genuine silence.
  // Strict session/cooldown limits keep token cost controlled.
  const [zeroInitiative, setZeroInitiative] = useState(false);
  const initiativeTimerRef = useRef(null);
  const initiativeCountRef = useRef(0);
  const lastHumanActivityRef = useRef(Date.now());
  const lastInitiativeRef = useRef(0);

  const [isPremium, setIsPremium] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("zero_conversation_history");
      const parsed = raw ? JSON.parse(raw) : [];
      const now = Date.now();

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => now - item.at < MEMORY_TIMEOUT_MS)
        .slice(-MAX_MEMORY_MESSAGES);
    } catch {
      return [];
    }
  });

  const [flyingMessage, setFlyingMessage] = useState("");
  const [flyingId, setFlyingId] = useState(0);
  const [error, setError] = useState("");

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [paywallLine, setPaywallLine] = useState("");

  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumLine, setPremiumLine] = useState("");


const timeoutRef = useRef(null);
const followUpTimeoutRef = useRef(null);
  

  const title = useMemo(() => "Zero", []);
  const copy = getZeroCopy(language);

  const messagesLeft = isPremium
    ? Infinity
    : Number(economy.chatTurns || 0);

  const rewardedAvailable =
    !isPremium && canWatchRewarded(economy);

  const rewardHighlighted =
    !isPremium &&
    shouldHighlightRewarded(economy, relationship);

  const coreBoosted =
    getCoreBoostRemainingMs(economy) > 0 ||
    getWalletCoreMultiplier(wallet) > 1;

  const livingStatus = livingCoreLabel(livingCore, language);
  const boundaryRemainingMs =
    boundaryState.mode === "away"
      ? Math.max(
          0,
          Number(boundaryState.awayUntil || 0) -
            boundaryTick
        )
      : 0;

  const boundaryRemainingSeconds =
    Math.ceil(
      boundaryRemainingMs / 1000
    );

  const awayCopy = {
    fr: {
      title: "Zero t'a bloqué",
      wait: "blocage",
      apology: "excuse-toi pour essayer d'arranger ça",
      accelerating: "il écourte le blocage",
      sure: "il attend que tu confirmes",
      yes: "OUI",
      no: "NON",
      talkYes: "VAS-Y",
      talkNo: "PLUS TARD",
    },
    en: {
      title: "Zero blocked you",
      wait: "blocked",
      apology: "apologize if you want to fix it",
      accelerating: "he's shortening the block",
      sure: "he's waiting for you to confirm it",
      yes: "YES",
      no: "NO",
      talkYes: "GO ON",
      talkNo: "LATER",
    },
    id: {
      title: "Zero ngeblok kamu",
      wait: "diblokir",
      apology: "minta maaf kalau mau baikan",
      accelerating: "dia mempercepat blokirnya",
      sure: "dia nunggu kamu beneran konfirmasi",
      yes: "IYA",
      no: "NGGAK",
      talkYes: "AYO",
      talkNo: "NANTI",
    },
  }[language] || null;
  const cosmeticState = getCosmeticState(wallet);


  


  useEffect(() => {
    const handleGlobalUiSound = (event) => {
      const button = event.target.closest?.(
        "button, [role='button'], label"
      );

      if (!button || button.disabled) return;
      if (button.dataset?.zeroSilent === "true") return;

      gameSfx.tap();
    };

    document.addEventListener(
      "pointerdown",
      handleGlobalUiSound,
      true
    );

    return () =>
      document.removeEventListener(
        "pointerdown",
        handleGlobalUiSound,
        true
      );
  }, []);

  useEffect(() => {
    saveRelationship(relationship);
  }, [relationship]);

  useEffect(() => {
    saveLivingCore(livingCore);
  }, [livingCore]);

  useEffect(() => {
    saveBoundaryState(boundaryState);
  }, [boundaryState]);

  useEffect(() => {
    if (boundaryState.mode !== "away") return undefined;

    const timer = window.setInterval(() => {
      const now = Date.now();
      setBoundaryTick(now);

      if (
        boundaryState.accelerating &&
        now >= Number(boundaryState.awayUntil || 0)
      ) {
        setBoundaryState((previous) =>
          finishReconciliation(previous)
        );

        setMood("warm");
        gameSfx.unlock();

        window.setTimeout(() => {
          setBoundaryState((previous) => ({
            ...previous,
            mode: "normal",
          }));
          setMood("idle");
        }, 1200);
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [
    boundaryState.mode,
    boundaryState.accelerating,
    boundaryState.awayUntil,
  ]);

  useEffect(() => {
    saveEconomy(economy);
  }, [economy]);

  useEffect(() => {
    saveWallet(wallet);
  }, [wallet]);

  useEffect(() => {
    saveZeroLanguage(language);
  }, [language]);

  useEffect(() => {
    const unsubscribe =
      zeroAudio.subscribe(
        setAudioState
      );

    zeroAudio.init();

    // Browsers only allow audio after a user gesture.
    const unlock = () => {
      zeroAudio.unlock();

      window.removeEventListener(
        "pointerdown",
        unlock
      );

      window.removeEventListener(
        "keydown",
        unlock
      );
    };

    window.addEventListener(
      "pointerdown",
      unlock,
      { passive: true }
    );

    window.addEventListener(
      "keydown",
      unlock,
      { passive: true }
    );

    return () => {
      unsubscribe();

      window.removeEventListener(
        "pointerdown",
        unlock
      );

      window.removeEventListener(
        "keydown",
        unlock
      );
    };
  }, []);

  useEffect(() => {
    return zeroVoice.subscribe(
      setVoiceState
    );
  }, []);

  useEffect(() => {
    const modalOpen =
      coreOpen ||
      (arcadeOpen && !arcadeGameActive) ||
      shopOpen ||
      walletOpen ||
      settingsOpen ||
      paywallOpen ||
      premiumOpen;

    zeroAudio.setMuffled(
      modalOpen
    );
  }, [
    coreOpen,
    arcadeOpen,
    arcadeGameActive,
    shopOpen,
    walletOpen,
    settingsOpen,
    paywallOpen,
    premiumOpen,
  ]);

  useEffect(() => {
    const nextMode =
      arcadeOpen && arcadeGameActive
        ? "arcade"
        : "home";

    zeroAudio.setMode(nextMode);
    zeroVoice.setMode(nextMode);
  }, [arcadeOpen, arcadeGameActive]);

  


  useEffect(() => {
    const currentStage = getCoreStageIndex(
      Number(relationship?.totalEnergy || 0)
    );

    const previousStage =
      Number(previousCoreStageRef.current || 0);

    if (currentStage > previousStage) {
      let nextWallet = wallet;
      let earned = 0;

      for (
        let stage = previousStage + 1;
        stage <= currentStage;
        stage += 1
      ) {
        const reward =
          claimCoreStageReward(
            nextWallet,
            stage
          );

        nextWallet = reward.wallet;
        earned += reward.amount;
      }

      if (nextWallet !== wallet) {
        setWallet(nextWallet);
      }

      if (earned > 0) {
        gameSfx.unlock();

        setRewardToast(
          `Core +${earned} coins`
        );

        window.setTimeout(() => {
          setRewardToast("");
        }, 2300);
      }
    }

    previousCoreStageRef.current =
      currentStage;
  }, [relationship?.totalEnergy, language]);

  useEffect(() => {
    const previous = Number(previousEnergyRef.current || 0);
    const current = Number(relationship?.totalEnergy || 0);

    const noticeBanks = {
      fr: [
        { at: 5, title: "arcade", text: "Pierre · Feuille · Ciseaux est dispo" },
        { at: 8, title: "Core", text: "Zero commence à te cerner" },
        { at: 18, title: "arcade", text: "Puissance 4 est dispo" },
        { at: 26, title: "Core", text: "Zero devient plus à l’aise avec toi" },
        { at: 32, title: "arcade", text: "Mémoire Duel est dispo" },
        { at: 48, title: "arcade", text: "Tap Duel est dispo" },
        { at: 70, title: "Core", text: "votre dynamique commence à vraiment tenir" },
        { at: 72, title: "arcade", text: "Nombre secret est dispo" },
        { at: 105, title: "arcade", text: "Codebreaker est dispo" },
      ],

      en: [
        { at: 5, title: "arcade", text: "Rock · Paper · Scissors unlocked" },
        { at: 8, title: "Core", text: "Zero is starting to get you" },
        { at: 18, title: "arcade", text: "Connect 4 unlocked" },
        { at: 26, title: "Core", text: "Zero is getting more comfortable with you" },
        { at: 32, title: "arcade", text: "Memory Duel unlocked" },
        { at: 48, title: "arcade", text: "Tap Duel unlocked" },
        { at: 70, title: "Core", text: "your dynamic is starting to settle in" },
        { at: 72, title: "arcade", text: "Secret Number unlocked" },
        { at: 105, title: "arcade", text: "Codebreaker unlocked" },
      ],

      id: [
        { at: 5, title: "arcade", text: "Batu · Gunting · Kertas kebuka" },
        { at: 8, title: "Core", text: "Zero mulai ngerti kamu" },
        { at: 18, title: "arcade", text: "Connect 4 kebuka" },
        { at: 26, title: "Core", text: "Zero mulai makin nyaman sama kamu" },
        { at: 32, title: "arcade", text: "Duel Memori kebuka" },
        { at: 48, title: "arcade", text: "Tap Duel kebuka" },
        { at: 70, title: "Core", text: "dinamika kalian mulai makin stabil" },
        { at: 72, title: "arcade", text: "Angka Rahasia kebuka" },
        { at: 105, title: "arcade", text: "Pecahkan Kode kebuka" },
      ],
    };

    const moments =
      noticeBanks[language] ||
      noticeBanks.fr;

    const unlocked = moments.find(
      (moment) =>
        previous < moment.at &&
        current >= moment.at
    );

    if (unlocked) {
      setWorldNotice(unlocked);

      window.setTimeout(() => {
        setWorldNotice(null);
      }, 3200);
    }

    previousEnergyRef.current = current;
  }, [relationship?.totalEnergy]);

  useEffect(() => {
    try {
      localStorage.setItem("zero_emotional_state", JSON.stringify(zeroState));
    } catch {
      // ignore
    }
  }, [zeroState]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "zero_conversation_history",
        JSON.stringify(conversationHistory)
      );
    } catch {
      // ignore
    }
  }, [conversationHistory]);

useEffect(() => {
  setAppReady(false);

  // 1. Connexion automatique à RevenueCat
 const initRevenueCat = async () => {
  if (TEST_MODE) {
    console.log("ZERO_TEST_MODE: RevenueCat simulé");
    return;
  }

  try {
    await Purchases.configure({
      apiKey: "appl_hYOtUCSOdGEUIRPjilzRIKgZGMH"
    });

    const customerInfo = await Purchases.getCustomerInfo();

    if (customerInfo.entitlements.active["premium"]) {
      setIsPremium(true);
    }
  } catch (e) {
    console.log("Erreur RevenueCat :", e);
  }
};
  initRevenueCat();

  // 2. Le reste de ton code d'origine (on n'y touche pas)
  const controller = new AbortController();

  const readyTimer = setTimeout(() => {
    setAppReady(true);
  }, 800);

  fetch(`${API_BASE}/api/health`, {
    method: "GET",
    signal: controller.signal,
  }).catch(() => {
    // ignore
  });

  const abortTimer = setTimeout(() => {
    controller.abort();
  }, 2500);

  return () => {
    controller.abort();
    clearTimeout(readyTimer);
    clearTimeout(abortTimer);
  };
}, []);


useEffect(() => {
  if (TEST_MODE) {
    console.log("ZERO_TEST_MODE: AdMob simulé");
    return;
  }

  initAdMob().catch(() => {
    // ignore
  });
}, []);

  useEffect(() => {
    const now = Date.now();
    setConversationHistory((prev) =>
      prev
        .filter((item) => now - item.at < MEMORY_TIMEOUT_MS)
        .slice(-MAX_MEMORY_MESSAGES)
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setConversationHistory((prev) =>
        prev
          .filter((item) => now - item.at < MEMORY_TIMEOUT_MS)
          .slice(-MAX_MEMORY_MESSAGES)
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const clearFlyingLater = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setFlyingMessage("");
    }, 700);
  };

  const openPaywall = async () => {
    setPaywallOpen(true);
    setPaywallLoading(false);

    const data = await getPaywallLine(language);
    setPaywallLine(data.line);
  };

  const openPremium = async () => {
    setPremiumOpen(true);
    setPremiumLoading(false);

    const data = await getUpgradeLine(language);
    setPremiumLine(data.line);
  };

const handleRewardedAd = async () => {
  sfx.button();

  if (isPremium || !canWatchRewarded(economy)) {
    setPaywallLine(copy.monetization.noBoost);
    return;
  }

  setPaywallLoading(true);

  try {
    // LOCALHOST / npm run dev :
    // rewarded automatiquement simulée.
    // BUILD PRODUCTION :
    // AdMob réel.
    let rewarded = false;

    if (TEST_MODE) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 650)
      );

      rewarded = true;
    } else {
      rewarded = await showRewardedAd();
    }

    if (!rewarded) {
      setPaywallLine(copy.monetization.adFailed);
      return;
    }

    setEconomy((previous) =>
      grantRewardedBundle(previous)
    );

    setPaywallOpen(false);
    setRewardToast(
      `+${ZERO_CONFIG.rewarded.chatTurns} ${copy.common.messages} · ${copy.monetization.rewardToast}`
    );

    window.setTimeout(() => {
      setRewardToast("");
    }, 2300);

    sfx.arrive();
  } catch (err) {
    console.log("Ad error:", err);
    setPaywallLine(copy.monetization.adUnavailable);
  } finally {
    setPaywallLoading(false);
  }
};

  const markHumanActivity = () => {
    lastHumanActivityRef.current = Date.now();
  };

  const openArcadeFromHome = (gameId = "") => {
    const safeGameId =
      typeof gameId === "string"
        ? gameId
        : "";

    markHumanActivity();
    setArcadeStartGame(safeGameId);
    setCoreOpen(false);
    setShopOpen(false);
    setWalletOpen(false);
    setSettingsOpen(false);
    setPaywallOpen(false);
    setPremiumOpen(false);
    setArcadeOpen(true);
    gameSfx.arrive();
  };


  const acceptSpontaneousPrompt = () => {
    const prompt = spontaneousPrompt;

    if (!prompt || prompt.type !== "play") {
      return false;
    }

    setSpontaneousPrompt(null);
    setZeroImpulse(null);
    setReply("");
    markHumanActivity();

    openArcadeFromHome(
      prompt.gameId || ""
    );

    return true;
  };

  const rejectSpontaneousPrompt = () => {
    if (!spontaneousPrompt) return false;

    setSpontaneousPrompt(null);
    setZeroImpulse(null);
    setReply("");
    setMood("idle");
    markHumanActivity();
    gameSfx.soft();

    return true;
  };

  const handleSubmit = async () => {
  const clean = input.trim();

  if (!clean || loading) return;

  // A pending Zero proposal is an actual app action.
  // Typed "oui/go/vas-y/ayo..." must behave exactly like the OUI button
  // and must NOT be sent to the model.
  if (
    spontaneousPrompt?.type === "play" &&
    isPromptAccept(clean, language)
  ) {
    setInput("");
    acceptSpontaneousPrompt();
    return;
  }

  if (
    spontaneousPrompt?.type === "play" &&
    isPromptReject(clean, language)
  ) {
    setInput("");
    rejectSpontaneousPrompt();
    return;
  }

  markHumanActivity();
  setZeroImpulse(null);
  setSpontaneousPrompt(null);

  if (boundaryState.mode === "away") {
    const result =
      attemptReconcile(
        boundaryState,
        clean,
        language
      );

    setBoundaryState(result.state);
    setBoundaryTick(Date.now());
    setInput("");

    if (result.line) {
      setReply(result.line);
      setMood(
        result.accepted
          ? "warm"
          : "idle"
      );
      gameSfx.soft();
    } else {
      setReply("");
    }

    if (result.accelerated) {
      setMood("warm");
      gameSfx.unlock();
    }

    return;
  }

if (!isPremium && messagesLeft <= 0) {
  setLoading(true);
  setMood("thinking");

  setTimeout(() => {
    setLoading(false);
    openPaywall();
  }, 700);

  return;
}

  const now = Date.now();
  const recentHistory = conversationHistory
    .filter((item) => now - item.at < MEMORY_TIMEOUT_MS)
    .slice(-MAX_MEMORY_MESSAGES);

 setError("");
setInput("");
setReply("");

setLoading(true);
setMood("thinking");

setFlyingId((prev) => prev + 1);
  setFlyingMessage(clean);
  clearFlyingLater();

  try {
    const selectedLanguage = language;
    const data = await sendToBot({
      message: clean,
      language: selectedLanguage,
      conversationHistory: recentHistory,
      zeroState,
      relationship: getServerRelationshipContext(relationship, selectedLanguage),
    });
const modelDisrespect =
  Number(data.signals?.disrespect || 0);

const effectiveDisrespect =
  mergeDisrespectSignal(
    modelDisrespect,
    clean
  );

const nextBoundary =
  updateBoundaryFromSignals(
    boundaryState,
    {
      disrespect: effectiveDisrespect,
      interactionQuality:
        Number(data.signals?.interactionQuality || 0.4),
      humor:
        Number(data.signals?.humor || 0.1),
      userMessage: clean,
    }
  );

console.log("ZERO_BOUNDARY", {
  modelDisrespect,
  effectiveDisrespect,
  consecutive: nextBoundary.consecutive,
  pressure: nextBoundary.pressure,
  mode: nextBoundary.mode,
});

const justLeft =
  boundaryState.mode !== "away" &&
  nextBoundary.mode === "away";

setBoundaryState(nextBoundary);

const rawReply =
  String(data.reply || "").trim();

const hostileButStillTalking =
  !justLeft &&
  effectiveDisrespect > 0.48;

const collapsedReply =
  rawReply === "..." ||
  rawReply === "…" ||
  rawReply.length === 0;

setReply(
  justLeft
    ? departureLine(
        language,
        nextBoundary.severity
      )
    : hostileButStillTalking &&
      collapsedReply
      ? boundarySnarkLine(
          language,
          nextBoundary.consecutive
        )
      : data.reply
);

setEmotion(data.emotion);
if (data.state) setZeroState(data.state);

setZeroAction(
  justLeft
    ? "refuse"
    : data.action || "none"
);

setRelationship((previous) =>
  evolveRelationship(previous, {
    userMessage: clean,
    reply:
      justLeft
        ? departureLine(
            language,
            nextBoundary.severity
          )
        : hostileButStillTalking &&
          collapsedReply
          ? boundarySnarkLine(
              language,
              nextBoundary.consecutive
            )
          : data.reply,
    signals: {
      ...data.signals,
      disrespect: effectiveDisrespect,
    },
    memoryCandidate: data.memoryCandidate,
    usedMemoryId: data.usedMemoryId,
    coreMultiplier: getCoreMultiplier(economy) * getWalletCoreMultiplier(wallet),
  })
);

setFeedPulse((value) => value + 1);

setLivingCore((previous) =>
  addCareXP(
    recordLivingChat(previous, data.signals || {}),
    8
  )
);

if (
  data.followUp?.shouldSend &&
  data.followUp.message
) {
  if (followUpTimeoutRef.current) {
    clearTimeout(followUpTimeoutRef.current);
  }

  followUpTimeoutRef.current = setTimeout(() => {
    const followUpMessage = data.followUp.message;
    const followUpTime = Date.now();

    setReply(followUpMessage);
    setMood("replying");

    setConversationHistory((prev) => [
      ...prev,
      {
        role: "assistant",
        text: followUpMessage,
        at: followUpTime,
      },
    ].slice(-MAX_MEMORY_MESSAGES));

    setTimeout(() => {
      setMood("idle");
    }, 1600);
  }, data.followUp.delayMs);
}



const e = data.emotion;

if (justLeft) {
  setMood("annoyed");
  gameSfx.error();

  window.setTimeout(() => {
    setMood("idle");
  }, 1500);
} else if (data.action === "refuse" || e.annoyance > 0.9) {
  setMood("annoyed");
} else if (data.action === "laugh" || e.humor > 0.72) {
  setMood("funny");
} else if (data.action === "excited") {
  setMood("hyped");
} else if (data.action === "soften" || e.warmth > 0.78) {
  setMood("warm");
} else {
  setMood("replying");
}

setTimeout(() => {
  setMood("idle");
}, 1600);
  // Une micro-réponse traitée localement ne coûte aucun token,
  // donc elle ne consomme pas la réserve de conversation.
  if (!isPremium && !data.local) {
    setEconomy((previous) =>
      consumeChatTurn(previous)
    );
  }


    setConversationHistory((prev) => {
      const base = prev
        .filter((item) => now - item.at < MEMORY_TIMEOUT_MS)
        .slice(-MAX_MEMORY_MESSAGES + 2);

      return [
        ...base,
        { role: "user", text: clean, at: now },
        { role: "assistant", text: data.reply, at: Date.now() },
      ];
    });
} catch (err) {
  setReply("");
  setError(err?.message || "Ça a planté.");
  setMood("error");

  setTimeout(() => {
    setMood("idle");
  }, 1200);
} finally {
  setLoading(false);
}
};



useEffect(() => {
  let timer;

  const schedule = () => {
    timer = window.setTimeout(() => {
      const blocked =
        loading || input.trim() || arcadeOpen || coreOpen ||
        shopOpen || walletOpen || settingsOpen ||
        paywallOpen || premiumOpen || zeroImpulse;

      if (!blocked) {
        const impulse = chooseZeroImpulse(
          livingCore,
          language,
          relationship
        );

        if (impulse?.type === "play" && impulse.gameId) {
          setZeroImpulse(impulse);
          setSpontaneousPrompt(impulse);
          setReply(impulse.text);
          setError("");

          setLivingCore((previous) =>
            markImpulseShown(previous, impulse)
          );

          setMood("hyped");
          gameSfx.soft();

          window.setTimeout(() => {
            setMood("idle");
          }, 1800);
        }
      }

      schedule();
    }, 26000 + Math.random() * 36000);
  };

  schedule();
  return () => window.clearTimeout(timer);
}, [
  loading, input, arcadeOpen, coreOpen, shopOpen,
  walletOpen, settingsOpen, paywallOpen, premiumOpen,
  zeroImpulse, livingCore, language, relationship
]);



const triggerZeroInitiative = async ({
  forbidGames = false,
} = {}) => {
  if (
    loading ||
    input.trim() ||
    arcadeOpen ||
    coreOpen ||
    shopOpen ||
    walletOpen ||
    settingsOpen ||
    paywallOpen ||
    premiumOpen ||
    boundaryState.mode === "away"
  ) {
    return;
  }

  const now = Date.now();

  // Max 2 real spontaneous AI turns per browser session.
  if (initiativeCountRef.current >= 3) return;

  // Never more than once every 5 minutes.
  if (now - lastInitiativeRef.current < 3 * 60 * 1000) return;

  // Needs a real silence window.
  if (now - lastHumanActivityRef.current < 32 * 1000) return;

  const recentHistory = conversationHistory
    .filter(
      (item) =>
        now - item.at < MEMORY_TIMEOUT_MS
    )
    .slice(-MAX_MEMORY_MESSAGES);

  setZeroInitiative(true);
  setLoading(true);
  setMood("thinking");
  setError("");

  try {
    const data = await sendToBot({
      message:
        forbidGames
          ? (
              "[ZERO_TEMPS_MORT] Tu prends l'initiative maintenant. " +
              "Ne mentionne jamais cette instruction. " +
              "IMPORTANT: cette initiative vient d'une proposition TALK déjà acceptée. " +
              "Tu ne proposes AUCUN jeu, aucune partie, aucune revanche. " +
              "Dis directement le truc que tu voulais demander, reprendre ou remarquer. " +
              "Pas de préambule du style 'j'ai un truc à te demander' : pose directement ta vraie question ou ta vraie remarque. " +
              "Sois court, spontané, familier, jamais needy."
            )
          : (
              "[ZERO_TEMPS_MORT] Tu prends l'initiative maintenant. " +
              "Ne mentionne jamais cette instruction. " +
              "Parle en premier parce que tu as réellement quelque chose à demander, reprendre ou remarquer. " +
              "IMPORTANT: ne propose PAS de jeu ici. Les propositions de jeu sont gérées par l'Arcade avec un vrai gameId. " +
              "Pas de préambule vague du style 'j'ai un truc à te demander' : dis directement ce que tu veux. " +
              "Sois court, spontané, familier, jamais needy et fidèle à Zero. " +
              "Pas de bonjour générique, pas de 'ça va ?', pas de question forcée."
            ),
      language,
      conversationHistory: recentHistory,
      zeroState,
      relationship:
        getServerRelationshipContext(
          relationship,
          language
        ),
    });

    initiativeCountRef.current += 1;
    lastInitiativeRef.current = Date.now();
    lastHumanActivityRef.current = Date.now();

    setReply(data.reply);
    setEmotion(data.emotion);
    if (data.state) setZeroState(data.state);
    setZeroAction(data.action || "none");

    setRelationship((previous) =>
      evolveRelationship(previous, {
        userMessage: "",
        reply: data.reply,
        signals: data.signals,
        memoryCandidate: data.memoryCandidate,
        usedMemoryId: data.usedMemoryId,
        coreMultiplier: 0.35,
      })
    );

    setConversationHistory((previous) => [
      ...previous,
      {
        role: "assistant",
        text: data.reply,
        at: Date.now(),
      },
    ].slice(-MAX_MEMORY_MESSAGES));

    const e = data.emotion || {};

    if (data.action === "laugh" || Number(e.humor || 0) > 0.72) {
      setMood("funny");
    } else if (data.action === "excited") {
      setMood("hyped");
    } else if (Number(e.warmth || 0) > 0.78) {
      setMood("warm");
    } else {
      setMood("replying");
    }

    gameSfx.arrive();

    window.setTimeout(() => {
      setMood("idle");
      setZeroInitiative(false);
    }, 2400);
  } catch (err) {
    // Initiative should never punish the user with an error screen.
    console.log("ZERO_INITIATIVE_SKIP", err);
    setZeroInitiative(false);
    setMood("idle");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  const schedule = () => {
    if (initiativeTimerRef.current) {
      clearTimeout(initiativeTimerRef.current);
    }

    // Randomized timing makes Zero feel less clockwork.
    const delay =
      44000 + Math.random() * 28000;

    initiativeTimerRef.current =
      window.setTimeout(async () => {
        await triggerZeroInitiative();
        schedule();
      }, delay);
  };

  schedule();

  const activity = () => {
    lastHumanActivityRef.current = Date.now();
  };

  window.addEventListener("pointerdown", activity, { passive: true });
  window.addEventListener("keydown", activity, { passive: true });

  return () => {
    if (initiativeTimerRef.current) {
      clearTimeout(initiativeTimerRef.current);
    }

    window.removeEventListener("pointerdown", activity);
    window.removeEventListener("keydown", activity);
  };
}, [
  loading,
  input,
  language,
  conversationHistory,
  relationship,
  zeroState,
  arcadeOpen,
  coreOpen,
  shopOpen,
  walletOpen,
  settingsOpen,
  paywallOpen,
  premiumOpen,
]);

const handleGameFinish = (gameEvent) => {
  setLivingCore((previous) =>
    addCareXP(
      recordLivingGame(previous, gameEvent.result),
      gameEvent.result === "win" ? 14 : 10
    )
  );

  setRelationship((previous) =>
    evolveRelationshipFromGame(previous, {
      ...gameEvent,
      coreMultiplier:
        getCoreMultiplier(economy) *
        getWalletCoreMultiplier(wallet),
    })
  );

  const reward = rewardGameCoins(
    wallet,
    gameEvent.result
  );

  setWallet(reward.wallet);
  setFeedPulse((value) => value + 1);

  return {
    coins: reward.amount,
    boosted: reward.boosted,
  };
};

const handleLanguageChange = (nextLanguage) => {
  setLanguage(nextLanguage);

  // Une nouvelle langue repart avec un contexte de session propre
  // pour éviter que les anciens messages FR contaminent l'ID/EN.
  setConversationHistory([]);
  setReply("");
  setInput("");
  setError("");
  setMood("idle");
  setZeroAction("none");

  try {
    localStorage.removeItem(
      "zero_conversation_history"
    );
  } catch {
    // ignore
  }

  gameSfx.soft();
};

const handleRewardedCoins = async () => {
  if (!canClaimCoinReward(wallet, 5)) {
    gameSfx.error();
    setRewardToast(copy.wallet.noReward);

    window.setTimeout(() => {
      setRewardToast("");
    }, 1800);

    return;
  }

  setCoinRewardLoading(true);
  gameSfx.tap();

  try {
    let rewarded = false;

    if (TEST_MODE) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 650)
      );

      rewarded = true;
    } else {
      rewarded = await showRewardedAd();
    }

    if (!rewarded) {
      setRewardToast(copy.wallet.adFailed);
      return;
    }

    setWallet((previous) =>
      grantCoinReward(previous, 45)
    );

    gameSfx.coin();
    setRewardToast("+45 coins");

    window.setTimeout(() => {
      setRewardToast("");
    }, 1900);
  } catch (err) {
    console.log("Coin rewarded error:", err);
    gameSfx.error();
    setRewardToast(copy.wallet.adUnavailable);

    window.setTimeout(() => {
      setRewardToast("");
    }, 1800);
  } finally {
    setCoinRewardLoading(false);
  }
};

const handleBuyCoinPack = async (pack) => {
  if (!pack) return;

  gameSfx.tap();

  try {
    // DEV = achat simulé
    if (TEST_MODE) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 550)
      );

      setWallet((previous) =>
        addPurchasedCoins(
          previous,
          pack.coins
        )
      );

      gameSfx.buy();

      setRewardToast(
        `+${pack.coins} coins`
      );

      window.setTimeout(() => {
        setRewardToast("");
      }, 2200);

      return;
    }

    await Purchases.purchaseProduct({
      productIdentifier:
        pack.productIdentifier,
    });

    setWallet((previous) =>
      addPurchasedCoins(
        previous,
        pack.coins
      )
    );

    gameSfx.buy();

    setRewardToast(
      `+${pack.coins} coins`
    );

    window.setTimeout(() => {
      setRewardToast("");
    }, 2200);
  } catch (err) {
    if (!err?.userCancelled) {
      gameSfx.error();

      setRewardToast(
        copy.wallet.purchaseUnavailable
      );

      window.setTimeout(() => {
        setRewardToast("");
      }, 1800);
    }
  }
};

const handleRestorePurchases = async () => {
  gameSfx.tap();

  if (TEST_MODE) {
    await new Promise((resolve) =>
      window.setTimeout(resolve, 350)
    );

    setIsPremium(true);
    setPremiumOpen(false);
    setPaywallOpen(false);

    setRewardToast(
      language === "id"
        ? "Premium dipulihkan · TEST"
        : language === "en"
          ? "Premium restored · TEST"
          : "Premium restauré · TEST"
    );

    window.setTimeout(() => {
      setRewardToast("");
    }, 1800);

    return;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();

    if (customerInfo.entitlements.active["premium"]) {
      setIsPremium(true);
      setPremiumOpen(false);
      setPaywallOpen(false);
    }
  } catch (e) {
    setRewardToast(copy.wallet.purchaseUnavailable);

    window.setTimeout(() => {
      setRewardToast("");
    }, 1800);
  }
};

const handlePurchasePremium = async () => {
  sfx.button();
  setPremiumLoading(true);

  try {
    if (TEST_MODE) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 500)
      );

      setIsPremium(true);
      setPremiumOpen(false);
      setPaywallOpen(false);

      setRewardToast(
        language === "id"
          ? "Premium aktif · TEST"
          : language === "en"
            ? "Premium active · TEST"
            : "Premium actif · TEST"
      );

      window.setTimeout(() => {
        setRewardToast("");
      }, 1900);

      return;
    }

    await Purchases.purchaseProduct({
      productIdentifier: "zero_premium_monthly"
    });

    setIsPremium(true);
    setPremiumOpen(false);
    setPaywallOpen(false);
  } catch (err) {
    if (!err?.userCancelled) {
      setRewardToast(copy.wallet.purchaseUnavailable);

      window.setTimeout(() => {
        setRewardToast("");
      }, 1800);
    }
  } finally {
    setPremiumLoading(false);
  }
};

if (!appReady) {
  return (
    <div className="app app-loader-screen">
      <div className="bg-gradient" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <div className="startup-loader">
        <div className="startup-logo">Zero</div>
        <div className="startup-ring" />
        <div className="startup-text">préparation...</div>
      </div>
    </div>
  );
} 
  return (
 <div
  className={`app mood-${mood} ${cosmeticClassNames(wallet)}`}
  style={{
    "--zero-energy": emotion.energy,
    "--zero-warmth": emotion.warmth,
    "--zero-humor": emotion.humor,
    "--zero-annoyance": emotion.annoyance,
    "--zero-confidence": emotion.confidence,
    "--zero-surprise": emotion.surprise || 0,
  }}
  data-zero-action={zeroAction}
>
      <div className="bg-gradient" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <ZeroWorldBackground
        background={cosmeticState.background}
      />

      <FloatingShapes />
      <ZeroCosmeticsLayer wallet={wallet} />

      <header className="topbar">
        <div className="brand">{title}</div>

        <div className="topbar-right">
          <ZeroCoreButton
            relationship={relationship}
            highlighted={rewardHighlighted}
            boosted={coreBoosted}
            language={language}
            onClick={() => {
              gameSfx.soft();
              setCoreOpen(true);

              if (rewardHighlighted) {
                setEconomy((previous) =>
                  markEarlyOfferSeen(previous)
                );
              }
            }}
          />

          <div className="status-pill">
            {isPremium ? "∞" : `${messagesLeft} ${copy.topbar.free}`}
          </div>

          <motion.button
            className="zero-shop-top"
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              gameSfx.tap();
              setShopOpen(true);
            }}
          >
            <span className="zero-shop-top-icon" aria-hidden="true">
              <i />
            </span>
            <strong>{copy.common.shop}</strong>
          </motion.button>

          <motion.button
            className="zero-wallet-top"
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              gameSfx.tap();
              setWalletOpen(true);
            }}
          >
            <span className="zero-coin-icon is-small">
              <i />
            </span>
            <strong>{wallet.coins}</strong>
          </motion.button>

          <motion.button
            className={[
              "zero65-music-top",
              audioState.enabled &&
              audioState.hasTrack
                ? "is-on"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            aria-label={
              audioState.enabled
                ? "Couper la musique"
                : "Activer la musique"
            }
            whileTap={{ scale: 0.92 }}
            onClick={async () => {
              gameSfx.soft();

              await zeroAudio.toggle();
            }}
          >
            <span aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </motion.button>

          <motion.button
            className="zero-settings-top"
            type="button"
            aria-label={copy.common.settings}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              gameSfx.soft();
              setSettingsOpen(true);
            }}
          >
            <i />
            <i />
            <i />
          </motion.button>

          <motion.button
            className="ghost-btn"
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              sfx.button();
              openPremium();
            }}
          >
            Premium
          </motion.button>
        </div>
      </header>

      <main className="main-area">
  <InteractiveBackground />

  <motion.button
    type="button"
    className="zero64-play-orb"
    aria-label={
      language === "id"
        ? "Main sama Zero"
        : language === "en"
          ? "Play with Zero"
          : "Jouer avec Zero"
    }
    onClick={() => openArcadeFromHome("")}
    whileTap={{ scale: 0.91 }}
    whileHover={{ scale: 1.04 }}
  >
    <span className="zero64-play-icon" aria-hidden="true">
      <i />
      <i />
      <b />
      <b />
    </span>
    <strong>
      {language === "id"
        ? "MAIN"
        : language === "en"
          ? "PLAY"
          : "JOUER"}
    </strong>
    <small>
      {language === "id"
        ? "lawan Zero"
        : language === "en"
          ? "vs Zero"
          : "avec Zero"}
    </small>
  </motion.button>
<ZeroEntity
  mood={mood}
  action={zeroAction}
  emotion={emotion}
  loading={loading}
  input={input}
  reply={reply}
  relationship={relationship}
  feedPulse={feedPulse}
  language={language}
  away={boundaryState.mode === "away"}
/>


  <FlyingMessage text={flyingMessage} id={flyingId} />
  <CenterReply
    loading={loading}
    reply={error || reply}
    action={zeroAction}
    mood={mood}
    emotion={emotion}
    language={language}
    spontaneous={spontaneousPrompt?.type === "play"}
    promptType={spontaneousPrompt?.type === "play" ? "play" : ""}
    onPromptYes={acceptSpontaneousPrompt}
    onPromptNo={rejectSpontaneousPrompt}
    away={boundaryState.mode === "away"}
    awaySeconds={boundaryRemainingSeconds}
    awayCopy={awayCopy}
    awayAccelerating={Boolean(boundaryState.accelerating)}
    reconciliationStage={Number(
      boundaryState.reconciliationStage || 0
    )}
  />
</main>





      <Composer
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={loading}
        messagesLeft={messagesLeft}
        maxChars={MAX_CHARS}
        isPremium={isPremium}
        language={language}
      />

      <PaywallModal
        open={paywallOpen}
        loading={paywallLoading}
        line={paywallLine}
        onClose={() => {
          setPaywallOpen(false);
          setPaywallLoading(false);
        }}
        onWatchAd={handleRewardedAd}
        onOpenPremium={openPremium}
        rewardedAvailable={rewardedAvailable}
        language={language}
      />

<PremiumModal
  open={premiumOpen}
  loading={premiumLoading}
  line={premiumLine}
  onClose={() => setPremiumOpen(false)}
  onPurchase={handlePurchasePremium}
  onRestore={handleRestorePurchases}
  language={language}
/>


<ZeroCorePanel
  open={coreOpen}
  relationship={relationship}
  economy={economy}
  wallet={wallet}
  isPremium={isPremium}
  rewardLoading={paywallLoading}
  onClose={() => setCoreOpen(false)}
  onReward={handleRewardedAd}
  onOpenShop={() => {
    setCoreOpen(false);
    setShopOpen(true);
  }}
  language={language}
/>

<AnimatePresence>
  {arcadeOpen ? (
    <ZeroArcade
      open={arcadeOpen}
      initialGameId={arcadeStartGame}
      relationship={relationship}
      economy={economy}
      wallet={wallet}
      isPremium={isPremium}
      onClose={() => {
        setArcadeOpen(false);
        setArcadeGameActive(false);
        setArcadeStartGame("");
      }}
      onGameActive={setArcadeGameActive}
      onGameFinish={handleGameFinish}
      language={language}
    />
  ) : null}
</AnimatePresence>



<AnimatePresence>
  {shopOpen ? (
    <ZeroShop
      open={shopOpen}
      wallet={wallet}
      onWallet={setWallet}
      onClose={() => setShopOpen(false)}
      language={language}
    />
  ) : null}
</AnimatePresence>

<AnimatePresence>
  {walletOpen ? (
    <ZeroWalletPanel
      open={walletOpen}
      wallet={wallet}
      rewardedCount={getCoinRewardedToday(wallet)}
      rewardedMax={5}
      rewardedLoading={coinRewardLoading}
      onRewardedCoins={handleRewardedCoins}
      onBuyPack={handleBuyCoinPack}
      onClose={() => setWalletOpen(false)}
      language={language}
    />
  ) : null}
</AnimatePresence>

<AnimatePresence>
  {settingsOpen ? (
    <ZeroSettings
      open={settingsOpen}
      language={language}
      onLanguage={handleLanguageChange}
      audioState={audioState}
      onToggleMusic={() => zeroAudio.toggle()}
      onMusicVolume={(value) => zeroAudio.setVolume(value)}
      voiceState={voiceState}
      onToggleVoice={() => zeroVoice.toggle()}
      onTestVoice={() => zeroVoice.test(language)}
      onClose={() => setSettingsOpen(false)}
    />
  ) : null}
</AnimatePresence>

<AnimatePresence>
  {worldNotice ? (
    <motion.button
      type="button"
      className="zero-v51-world-notice"
      initial={{ opacity: 0, y: -16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -9, scale: 0.96 }}
      transition={{
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => {
        setWorldNotice(null);
        setCoreOpen(true);
      }}
    >
      <span className="zero-v51-world-notice-core">
        <i />
      </span>

      <span>
        <small>{worldNotice.title}</small>
        <strong>{worldNotice.text}</strong>
      </span>
    </motion.button>
  ) : null}
</AnimatePresence>

<AnimatePresence>
  {rewardToast ? (
    <motion.div
      className="zero-v5-reward-toast"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
    >
      {rewardToast}
    </motion.div>
  ) : null}
</AnimatePresence>
    </div>
  );
}