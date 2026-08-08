import { motion } from "framer-motion";
import { getPhaseProgress } from "./zero-relationship";

const COPY = {
  fr: {
    core: "Core",
    grow: "à faire grandir",
    boosted: "boost actif",
  },
  en: {
    core: "Core",
    grow: "keep it growing",
    boosted: "boost active",
  },
  id: {
    core: "Core",
    grow: "terus kembangin",
    boosted: "boost aktif",
  },
};

export default function ZeroCoreButton({
  relationship,
  highlighted = false,
  boosted = false,
  onClick,
  language = "fr",
}) {
  const progress = getPhaseProgress(relationship);
  const percent = Math.max(
    0,
    Math.min(99, Math.round(progress * 100))
  );

  const copy = COPY[language] || COPY.fr;

  return (
    <motion.button
      className={[
        "zero-core-entry zero63-core-entry",
        highlighted ? "is-highlighted" : "",
        boosted ? "is-boosted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-label={copy.core}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      animate={
        highlighted
          ? {
              y: [0, -2, 0],
            }
          : undefined
      }
      transition={{
        duration: 1.8,
        repeat: highlighted ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      <span className="zero63-core-heart" aria-hidden="true">
        <i />
      </span>

      <span className="zero-core-entry-copy">
        <strong>{copy.core}</strong>
        <small>
          {boosted ? copy.boosted : copy.grow}
        </small>
      </span>

      <span className="zero63-core-percent">
        {percent}%
      </span>

      <span className="zero63-core-track" aria-hidden="true">
        <motion.i
          initial={false}
          animate={{ scaleX: progress }}
          transition={{
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </span>
    </motion.button>
  );
}
