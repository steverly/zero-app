import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./styles.css";

const MAX_CHARS = 120;
const FREE_MESSAGES_START = 20;
const REWARDED_MESSAGES_GAIN = 10;
const MEMORY_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_MEMORY_MESSAGES = 8;
const API_BASE = "https://zero-app-ebsv.onrender.com";

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
        ? data.reply.trim()
        : "Parle mieux. Là c’est flou.",
  };
}

async function getPaywallLine(payload) {
  const data = await apiPost("/api/paywall", payload);
  return {
    line:
      typeof data?.line === "string" && data.line.trim()
        ? data.line.trim()
        : "T’as vidé. Regarde une pub ou prends l’illimité.",
  };
}

async function getUpgradeLine(payload) {
  const data = await apiPost("/api/upgrade", payload);
  return {
    line:
      typeof data?.line === "string" && data.line.trim()
        ? data.line.trim()
        : "Illimité, sans pub. Là tu parles tranquille.",
  };
}

// --------------------
// UI Helpers
// --------------------
function TypewriterText({ text, speed = 16 }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    setVisible("");
    if (!text) return;

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{visible}</span>;
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

function CenterReply({ loading, reply }) {
  useEffect(() => {
    if (reply && !loading) {
      sfx.arrive();
    }
  }, [reply, loading]);

  return (
    <div className="center-stage">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            className="reply-shell"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <LoaderDots />
          </motion.div>
        ) : (
          <motion.div
            key={reply || "empty"}
            className="reply-shell"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="reply-text">
              {reply ? (
                <TypewriterText text={reply} />
              ) : (
                <span className="reply-placeholder">Balance ton truc.</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  messagesLeft,
  maxChars,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const remaining = maxChars - value.length;

    messagesLeft > 0;

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
          placeholder="Sois direct."
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
            <span className={`char-count ${remaining <= 20 ? "warn" : ""}`}>
              {value.length}/{maxChars}
            </span>
            <span className="message-count">
              {messagesLeft > 0 ? `${messagesLeft} messages` : "Plus de messages"}
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
            Envoyer
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
  adCount,
  maxAdsInRow,
}) {
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
  className="modal-btn modal-btn-primary"
  type="button"
  onClick={onWatchAd}
  disabled={loading || adCount >= maxAdsInRow}
  animate={
    loading || adCount >= maxAdsInRow
      ? { scale: 1 }
      : {
          scale: [1, 1.03, 1],
        }
  }
  transition={{
    duration: 1.6,
    repeat: Infinity,
    ease: "easeInOut",
  }}
>
  +{REWARDED_MESSAGES_GAIN} messages
</motion.button>

              <button
                className="modal-btn modal-btn-secondary"
                type="button"
                onClick={onOpenPremium}
                disabled={loading}
              >
                Illimité
              </button>
            </div>

            <button className="modal-close" type="button" onClick={onClose}>
              Fermer
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PremiumModal({ open, loading, line, onClose }) {
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
              <div>Illimité</div>
              <div>Sans pub</div>
              <div>Accès direct</div>
            </div>

            <button
              className="modal-btn modal-btn-primary"
              type="button"
              onClick={() => {
                sfx.button();
                alert("Branche ici ton vrai achat abonnement.");
              }}
            >
              Prendre l’illimité
            </button>

            <button className="modal-close" type="button" onClick={onClose}>
              Fermer
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const [messagesLeft, setMessagesLeft] = useState(FREE_MESSAGES_START);
  const [messagesUsed, setMessagesUsed] = useState(0);
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

  const [adCountInRow, setAdCountInRow] = useState(0);

  const timeoutRef = useRef(null);
  const sessionStartedAtRef = useRef(Date.now());

  const title = useMemo(() => "Zero", []);
  const MAX_ADS_IN_ROW = 3;


  

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
  let cancelled = false;

  const start = Date.now();

  const warmup = async () => {
    try {
      await fetch(`${API_BASE}/api/health`, {
        method: "GET",
      });
    } catch {
      // ignore
    } finally {
      const elapsed = Date.now() - start;
      const delay = Math.max(1200 - elapsed, 0);

      setTimeout(() => {
        if (!cancelled) {
          setAppReady(true);
        }
      }, delay);
    }
  };

  warmup();

  return () => {
    cancelled = true;
  };
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


  
  const sessionDurationSeconds = () =>
    Math.max(1, Math.floor((Date.now() - sessionStartedAtRef.current) / 1000));

  const clearFlyingLater = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setFlyingMessage("");
    }, 700);
  };

  const openPaywall = async () => {
    setPaywallOpen(true);
    setPaywallLoading(true);

    try {
      const data = await getPaywallLine({
        messagesUsed,
        sessionDurationSeconds: sessionDurationSeconds(),
        adCountInRow,
        messagesLeft,
      });
      setPaywallLine(data.line);
    } catch {
      setPaywallLine("T’as vidé tes messages. Regarde une pub ou prends l’illimité..");
    } finally {
      setPaywallLoading(false);
    }
  };

  const openPremium = async () => {
    setPremiumOpen(true);
    setPremiumLoading(true);

    try {
      const data = await getUpgradeLine({
        messagesUsed,
        sessionDurationSeconds: sessionDurationSeconds(),
        adCountInRow,
      });
      setPremiumLine(data.line);
    } catch {
      setPremiumLine("Illimité, sans pub. Là tu parles tranquille");
    } finally {
      setPremiumLoading(false);
    }
  };

  const handleRewardedAd = async () => {
    sfx.button();

    if (adCountInRow >= MAX_ADS_IN_ROW) {
      setPaywallLine("C’est bon. Pause. T’as déjà assez gratté là.");
      return;
    }

    setPaywallLoading(true);

    setTimeout(() => {
      setMessagesLeft((prev) => prev + REWARDED_MESSAGES_GAIN);
      setAdCountInRow((prev) => prev + 1);
      setPaywallLoading(false);
      setPaywallOpen(false);
      setReply("Re");
      sfx.arrive();
    }, 1200);
  };

  const handleSubmit = async () => {
  const clean = input.trim();

  if (!clean || loading) return;

  if (messagesLeft <= 0) {
    openPaywall();
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

  setFlyingId((prev) => prev + 1);
  setFlyingMessage(clean);
  clearFlyingLater();

  try {
    const data = await sendToBot({
      message: clean,
      messagesUsed,
      sessionDurationSeconds: sessionDurationSeconds(),
      conversationHistory: recentHistory,
    });

    setReply(data.reply);
    setMessagesLeft((prev) => Math.max(0, prev - 1));
    setMessagesUsed((prev) => prev + 1);

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

    if ((messagesUsed + 1) % 4 === 0) {
      setAdCountInRow(0);
    }
  } catch (err) {
    setReply("");
    setError(err?.message || "Ça a planté.");
  } finally {
    setLoading(false);
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
    <div className="app">
      <div className="bg-gradient" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />
      <FloatingShapes />

      <header className="topbar">
        <div className="brand">{title}</div>

        <div className="topbar-right">
          <div className="status-pill">{messagesLeft} free</div>

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
        <FlyingMessage text={flyingMessage} id={flyingId} />
        <CenterReply loading={loading} reply={error || reply} />
      </main>

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={loading}
        messagesLeft={messagesLeft}
        maxChars={MAX_CHARS}
      />

      <PaywallModal
        open={paywallOpen}
        loading={paywallLoading}
        line={paywallLine}
        onClose={() => {
  if (messagesLeft > 0) {
    setPaywallOpen(false);
  }
}}
        onWatchAd={handleRewardedAd}
        onOpenPremium={openPremium}
        adCount={adCountInRow}
        maxAdsInRow={MAX_ADS_IN_ROW}
      />

      <PremiumModal
        open={premiumOpen}
        loading={premiumLoading}
        line={premiumLine}
        onClose={() => setPremiumOpen(false)}
      />
    </div>
  );
}