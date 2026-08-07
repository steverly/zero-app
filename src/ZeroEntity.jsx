import { useEffect, useMemo, useRef, useState } from "react";
import ZeroEyes from "./ZeroEyes";
import ZeroEmotionFX from "./ZeroEmotionFX";
import "./zero-entity.css";

const IDLE_ACTIONS = [
  { action: "blink", weight: 5 },
  { action: "lookAway", weight: 2 },
  { action: "stare", weight: 1 },
  { action: "think", weight: 1 },
];

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.action;
  }

  return "blink";
}

function sanitizeVisualState({ mood, action, emotion }) {
  const annoyance = Number(emotion?.annoyance || 0);

  let safeAction = action || "none";
  let safeMood = mood || "idle";

  if (safeAction === "challenge") safeAction = "none";

  const explicitAnger =
    safeAction === "refuse" ||
    annoyance >= 0.9;

  if (
    (safeMood === "annoyed" || safeMood === "sharp") &&
    !explicitAnger
  ) {
    safeMood = "replying";
  }

  return {
    mood: safeMood,
    action: safeAction,
    explicitAnger,
  };
}

export default function ZeroEntity({
  mood = "idle",
  action = "none",
  emotion,
  loading = false,
  input = "",
  reply = "",
}) {
  const idleTimerRef = useRef(null);
  const microTimerRef = useRef(null);

  const [awake, setAwake] = useState(false);
  const [microAction, setMicroAction] = useState("none");
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [near, setNear] = useState(false);
  const [replyPulse, setReplyPulse] = useState(0);

  const typing = input.trim().length > 0;

  const safe = useMemo(
    () => sanitizeVisualState({ mood, action, emotion }),
    [mood, action, emotion]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setAwake(true), 260);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!reply || loading) return;
    setReplyPulse((value) => value + 1);
  }, [reply, loading]);

  useEffect(() => {
    const updateLook = (clientX, clientY) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      const nx = (clientX / width - 0.5) * 2;
      const ny = (clientY / height - 0.36) * 2;

      const x = Math.max(-1, Math.min(1, nx)) * 8;
      const y = Math.max(-1, Math.min(1, ny)) * 5;

      setLook({ x, y });

      const eyeX = width * 0.5;
      const eyeY = Math.min(height * 0.2, 165);
      const distance = Math.hypot(clientX - eyeX, clientY - eyeY);

      setNear(distance < Math.min(210, width * 0.2));
    };

    const onPointerMove = (event) => {
      updateLook(event.clientX, event.clientY);
    };

    const onTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (touch) updateLook(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!awake || loading || typing || safe.action !== "none") {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (microTimerRef.current) clearTimeout(microTimerRef.current);
      setMicroAction("none");
      return undefined;
    }

    const schedule = () => {
      const delay = 6000 + Math.random() * 9000;

      idleTimerRef.current = window.setTimeout(() => {
        const picked = weightedPick(IDLE_ACTIONS);
        setMicroAction(picked);

        const duration =
          picked === "lookAway" ? 1100 :
          picked === "stare" ? 1350 :
          picked === "think" ? 1250 :
          520;

        microTimerRef.current = window.setTimeout(() => {
          setMicroAction("none");
          schedule();
        }, duration);
      }, delay);
    };

    schedule();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (microTimerRef.current) clearTimeout(microTimerRef.current);
    };
  }, [awake, loading, typing, safe.action]);

  let visualAction = safe.action;

  if (visualAction === "none" && microAction !== "none") {
    visualAction = microAction;
  }

  if (
    near &&
    !loading &&
    !typing &&
    visualAction === "none"
  ) {
    visualAction = "stare";
  }

  if (typing && visualAction === "none") {
    visualAction = "think";
  }

  return (
    <div
      key={`zero-presence-${replyPulse}`}
      className={[
        "zero-entity",
        awake ? "is-awake" : "is-sleeping",
        typing ? "is-listening" : "",
        loading ? "is-thinking" : "",
        near ? "is-near" : "",
        replyPulse ? "has-replied" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--zero-look-x": `${look.x}px`,
        "--zero-look-y": `${look.y}px`,
      }}
      aria-hidden="true"
    >
      <div className="zero-presence-field" />
      <div className="zero-presence-core" />

      <div className="zero-entity-motion">
        <ZeroEyes
          mood={safe.mood}
          action={visualAction}
        />

        <ZeroEmotionFX
          mood={safe.mood}
          action={visualAction}
          emotion={{
            ...emotion,
            annoyance: safe.explicitAnger
              ? Number(emotion?.annoyance || 0)
              : Math.min(Number(emotion?.annoyance || 0), 0.45),
          }}
        />
      </div>

      <div className="zero-presence-wake">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}