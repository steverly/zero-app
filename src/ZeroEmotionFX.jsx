import React, { useEffect, useMemo, useState } from "react";

function pickEffect({ mood, action, emotion }) {
  const surprise = Number(emotion?.surprise || 0);
  const annoyance = Number(emotion?.annoyance || 0);
  const humor = Number(emotion?.humor || 0);
  const warmth = Number(emotion?.warmth || 0);

  if (action === "surprised" || action === "excited" || surprise > 0.72) return "exclaim";
  if (action === "think" || mood === "thinking") return "thinking";
  if (action === "refuse" || mood === "annoyed" || mood === "sharp" || annoyance > 0.68) return "anger";
  if (action === "lookAway" || action === "sigh") return "sweat";
  if (mood === "error") return "confused";
  if (action === "soften" && warmth > 0.72) return "spark";
  if (action === "laugh" || mood === "funny" || humor > 0.76) return "spark";
  return "none";
}

export default function ZeroEmotionFX({ mood = "idle", action = "none", emotion }) {
  const wantedEffect = useMemo(() => pickEffect({ mood, action, emotion }), [mood, action, emotion]);
  const [effect, setEffect] = useState("none");
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (wantedEffect === "none") {
      setEffect("none");
      return;
    }

    setEffect(wantedEffect);
    setInstance((value) => value + 1);

    const durations = {
      sweat: 1450,
      anger: 1100,
      thinking: 1800,
      confused: 1450,
      exclaim: 1050,
      spark: 1100,
    };

    const timer = window.setTimeout(() => setEffect("none"), durations[wantedEffect] || 1200);
    return () => window.clearTimeout(timer);
  }, [wantedEffect, action, mood]);

  if (effect === "none") return null;

  return (
    <div key={`${effect}-${instance}`} className={`zero-emotion-fx zero-emotion-fx--${effect}`} aria-hidden="true">
      {effect === "sweat" && <span className="zero-fx-sweat"><i /></span>}
      {effect === "anger" && (
        <span className="zero-fx-anger">
          <i className="zero-fx-anger-line zero-fx-anger-line--one" />
          <i className="zero-fx-anger-line zero-fx-anger-line--two" />
          <i className="zero-fx-anger-line zero-fx-anger-line--three" />
          <i className="zero-fx-anger-line zero-fx-anger-line--four" />
        </span>
      )}
      {effect === "thinking" && <span className="zero-fx-dots"><i /><i /><i /></span>}
      {effect === "confused" && <span className="zero-fx-punctuation zero-fx-punctuation--question"><i>?</i><i>?</i></span>}
      {effect === "exclaim" && <span className="zero-fx-punctuation zero-fx-punctuation--exclaim"><i>!</i><i>!</i></span>}
      {effect === "spark" && (
        <span className="zero-fx-bulb">
          <i className="zero-fx-bulb-glass" />
          <i className="zero-fx-bulb-base" />
          <i className="zero-fx-bulb-ray zero-fx-bulb-ray--one" />
          <i className="zero-fx-bulb-ray zero-fx-bulb-ray--two" />
          <i className="zero-fx-bulb-ray zero-fx-bulb-ray--three" />
        </span>
      )}
    </div>
  );
}
