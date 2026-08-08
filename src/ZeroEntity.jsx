import { useEffect, useMemo, useRef, useState } from "react";
import ZeroEyes from "./ZeroEyes";
import ZeroEmotionFX from "./ZeroEmotionFX";
import "./zero-eyes-kawaii.css";
import "./zero-emotion-fx.css";
import "./zero-entity.css";

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= item.weight;

    if (roll <= 0) {
      return item.action;
    }
  }

  return "blink";
}

export default function ZeroEntity({
  mood = "idle",
  action = "none",
  emotion,
  loading = false,
  input = "",
  relationship,
  feedPulse = 0,
}) {
  const idleTimerRef = useRef(null);
  const microTimerRef = useRef(null);
  const lifeTimerRef = useRef(null);
  const lifeEndRef = useRef(null);

  const [awake, setAwake] = useState(false);
  const [microAction, setMicroAction] = useState("none");
  const [lifeMode, setLifeMode] = useState("none");
  const [lifeDrift, setLifeDrift] = useState({ x: 0, y: 0 });
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [near, setNear] = useState(false);

  const traits = relationship?.traits || {};

  const familiarity = Number(
    traits.familiarity || 0.08
  );

  const expressiveness = Number(
    traits.expressiveness || 0.26
  );

  const initiative = Number(
    traits.initiative || 0.14
  );

  const playfulness = Number(
    traits.playfulness || 0.42
  );

  const typing = input.trim().length > 0;

  const safeVisual = useMemo(() => {
    let safeAction = action || "none";
    let safeMood = mood || "idle";

    const annoyance = Number(
      emotion?.annoyance || 0
    );

    const explicitAnger =
      safeAction === "refuse" ||
      annoyance >= 0.92;

    if (
      (safeMood === "annoyed" ||
        safeMood === "sharp") &&
      !explicitAnger
    ) {
      safeMood = "replying";
    }

    return {
      action: safeAction,
      mood: safeMood,
      explicitAnger,
    };
  }, [action, mood, emotion]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setAwake(true),
      220
    );

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateLook = (clientX, clientY) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      const intensity =
        4 + familiarity * 4;

      const nx =
        (clientX / width - 0.5) * 2;

      const ny =
        (clientY / height - 0.36) * 2;

      setLook({
        x:
          Math.max(-1, Math.min(1, nx)) *
          intensity,

        y:
          Math.max(-1, Math.min(1, ny)) *
          intensity *
          0.62,
      });

      const eyeX = width * 0.5;
      const eyeY = Math.min(
        height * 0.2,
        165
      );

      const distance = Math.hypot(
        clientX - eyeX,
        clientY - eyeY
      );

      setNear(
        distance <
          Math.min(190, width * 0.18)
      );
    };

    const onPointerMove = (event) => {
      updateLook(
        event.clientX,
        event.clientY
      );
    };

    window.addEventListener(
      "pointermove",
      onPointerMove,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        onPointerMove
      );
    };
  }, [familiarity]);

  useEffect(() => {
    if (
      !awake ||
      loading ||
      typing ||
      safeVisual.action !== "none"
    ) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      if (microTimerRef.current) {
        clearTimeout(microTimerRef.current);
      }

      setMicroAction("none");
      return undefined;
    }

    const schedule = () => {
      const baseMin =
        10000 - familiarity * 3800;

      const baseRange =
        8500 - initiative * 3000;

      const delay =
        baseMin +
        Math.random() * baseRange;

      idleTimerRef.current =
        window.setTimeout(() => {
          const actions = [
            {
              action: "blink",
              weight: 7,
            },
            {
              action: "lookAway",
              weight:
                1.7 +
                familiarity * 1.2,
            },
            {
              action: "stare",
              weight:
                0.5 +
                initiative * 1.8,
            },
            {
              action: "think",
              weight:
                0.5 +
                expressiveness * 1.2,
            },
            {
              action: "smile",
              weight:
                0.3 +
                playfulness *
                  familiarity,
            },
          ];

          const picked =
            weightedPick(actions);

          setMicroAction(picked);

          const duration =
            picked === "lookAway"
              ? 1050
              : picked === "stare"
                ? 1250
                : picked === "think"
                  ? 1150
                  : picked === "smile"
                    ? 900
                    : 480;

          microTimerRef.current =
            window.setTimeout(() => {
              setMicroAction("none");
              schedule();
            }, duration);
        }, delay);
    };

    schedule();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      if (microTimerRef.current) {
        clearTimeout(microTimerRef.current);
      }
    };
  }, [
    awake,
    loading,
    typing,
    safeVisual.action,
    familiarity,
    initiative,
    expressiveness,
    playfulness,
  ]);

  // --------------------------------------------------
  // "SA VIE" — entièrement local, 0 token.
  // Quand personne ne lui parle, Zero ne reste plus
  // planté au milieu en attendant une commande.
  // --------------------------------------------------
  useEffect(() => {
    if (
      !awake ||
      loading ||
      typing ||
      safeVisual.action !== "none"
    ) {
      if (lifeTimerRef.current) {
        clearTimeout(lifeTimerRef.current);
      }

      if (lifeEndRef.current) {
        clearTimeout(lifeEndRef.current);
      }

      setLifeMode("none");
      setLifeDrift({ x: 0, y: 0 });

      return undefined;
    }

    const scheduleLife = () => {
      const delay =
        5200 +
        Math.random() *
          (7200 - initiative * 1800);

      lifeTimerRef.current =
        window.setTimeout(() => {
          const possibilities = [
            "roam",
            "peek",
            "nap",
            "corePlay",
            "float",
            "inspect",
          ];

          const picked =
            possibilities[
              Math.floor(
                Math.random() *
                  possibilities.length
              )
            ];

          const direction =
            Math.random() > 0.5 ? 1 : -1;

          const drifts = {
            roam: {
              x:
                direction *
                (24 + Math.random() * 34),
              y:
                -3 + Math.random() * 12,
            },

            peek: {
              x:
                direction *
                (42 + Math.random() * 28),
              y:
                4 + Math.random() * 11,
            },

            nap: {
              x:
                direction *
                (5 + Math.random() * 9),
              y: 8 + Math.random() * 8,
            },

            corePlay: {
              x:
                direction *
                (10 + Math.random() * 14),
              y:
                -4 + Math.random() * 8,
            },

            float: {
              x:
                direction *
                (8 + Math.random() * 18),
              y:
                -(12 + Math.random() * 16),
            },

            inspect: {
              x:
                direction *
                (18 + Math.random() * 20),
              y:
                12 + Math.random() * 15,
            },
          };

          setLifeMode(picked);
          setLifeDrift(
            drifts[picked] || {
              x: 0,
              y: 0,
            }
          );

          const duration =
            picked === "nap"
              ? 3900
              : picked === "corePlay"
                ? 3300
                : picked === "peek"
                  ? 2300
                  : 2700;

          lifeEndRef.current =
            window.setTimeout(() => {
              setLifeMode("none");
              setLifeDrift({
                x: 0,
                y: 0,
              });

              scheduleLife();
            }, duration);
        }, delay);
    };

    scheduleLife();

    return () => {
      if (lifeTimerRef.current) {
        clearTimeout(lifeTimerRef.current);
      }

      if (lifeEndRef.current) {
        clearTimeout(lifeEndRef.current);
      }
    };
  }, [
    awake,
    loading,
    typing,
    safeVisual.action,
    initiative,
  ]);

  let visualAction = safeVisual.action;

  if (
    visualAction === "none" &&
    lifeMode !== "none"
  ) {
    visualAction =
      lifeMode === "nap"
        ? "blink"
        : lifeMode === "peek"
          ? "stare"
          : lifeMode === "inspect"
            ? "think"
            : lifeMode === "roam"
              ? "lookAway"
              : lifeMode === "corePlay"
                ? "smile"
                : "none";
  }

  if (
    visualAction === "none" &&
    microAction !== "none"
  ) {
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

  if (
    typing &&
    visualAction === "none"
  ) {
    visualAction =
      familiarity > 0.34
        ? "stare"
        : "think";
  }

  return (
    <div
      className={[
        "zero-entity",
        awake ? "is-awake" : "is-sleeping",
        typing ? "is-listening" : "",
        loading ? "is-thinking" : "",
        near ? "is-near" : "",
        lifeMode !== "none"
          ? `is-life-${lifeMode}`
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--zero-look-x": `${look.x + lifeDrift.x}px`,
        "--zero-look-y": `${look.y + lifeDrift.y}px`,
        "--zero-familiarity": familiarity,
        "--zero-expression": expressiveness,
      }}
      aria-hidden="true"
    >
      <div className="zero-presence-field" />
      <div className="zero-presence-core" />

      <div className="zero-entity-motion">
        <ZeroEyes
          mood={safeVisual.mood}
          action={visualAction}
        />

        <ZeroEmotionFX
          mood={safeVisual.mood}
          action={visualAction}
          emotion={{
            ...emotion,

            // Aucun spam colère à cause
            // d'une annoyance moyenne.
            annoyance:
              safeVisual.explicitAnger
                ? Number(
                    emotion?.annoyance || 0
                  )
                : Math.min(
                    Number(
                      emotion?.annoyance || 0
                    ),
                    0.42
                  ),
          }}
        />
      </div>

      {lifeMode === "corePlay" ? (
        <div className="zero-life-coretoy">
          <i />
          <i />
        </div>
      ) : null}

      {lifeMode === "inspect" ? (
        <div className="zero-life-scan">
          <i />
        </div>
      ) : null}

      <div className="zero-presence-wake">
        <i />
        <i />
        <i />
      </div>

      <div
        key={feedPulse}
        className="zero-feed-pulse"
      />
    </div>
  );
}
