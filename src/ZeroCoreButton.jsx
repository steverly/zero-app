import { motion } from "framer-motion";
import { getPhaseProgress } from "./zero-relationship";

export default function ZeroCoreButton({
  relationship,
  highlighted = false,
  boosted = false,
  onClick,
}) {
  const progress = getPhaseProgress(relationship);

  return (
    <motion.button
      className={[
        "zero-core-entry",
        highlighted ? "is-highlighted" : "",
        boosted ? "is-boosted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-label="Ouvrir le Core de Zero"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
    >
      <span className="zero-core-entry-eyes" aria-hidden="true">
        <i />
        <i />
      </span>

      <span className="zero-core-entry-copy">
        <strong>Core</strong>
        <small>{boosted ? "boost actif" : "évolution"}</small>
      </span>

      <span
        className="zero-core-entry-ring"
        style={{ "--core-progress": progress }}
        aria-hidden="true"
      />

      {highlighted ? (
        <span className="zero-core-entry-spark" aria-hidden="true" />
      ) : null}
    </motion.button>
  );
}
