import { AnimatePresence, motion } from "framer-motion";
import {
  getRelationshipAgeDays,
  getRelationshipDescriptors,
  getRelationshipPhase,
} from "./zero-relationship";
import "./zero-evolution.css";

export default function ZeroEvolution({
  open,
  relationship,
  onClose,
}) {
  const days = getRelationshipAgeDays(relationship);
  const descriptors = getRelationshipDescriptors(relationship);
  const phase = getRelationshipPhase(relationship);
  const interactions = Number(relationship?.interactionCount || 0);
  const stability = Number(relationship?.stability || 0);
  const recentEnergy = Number(relationship?.recentEnergy || 0);

  const copyCard = async () => {
    const text = [
      "ZERO",
      days === 0
        ? "On vient de se rencontrer"
        : `Avec moi depuis ${days} jour${days > 1 ? "s" : ""}`,
      descriptors.join(" · "),
      phase,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="zero-evolution-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="zero-evolution-sheet"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="zero-evolution-handle" />

            <div className="zero-evolution-head">
              <div>
                <small>ton Zero</small>
                <h2>Zero</h2>
              </div>

              <button type="button" onClick={onClose}>
                ×
              </button>
            </div>

            <div className="zero-evolution-core-wrap">
              <div
                className="zero-evolution-core"
                style={{
                  "--zero-core-stability": stability,
                  "--zero-core-energy": recentEnergy,
                }}
              >
                <i />
              </div>
            </div>

            <p className="zero-evolution-phase">{phase}</p>

            <div className="zero-evolution-traits">
              {descriptors.map((descriptor) => (
                <span key={descriptor}>{descriptor}</span>
              ))}
            </div>

            <div className="zero-evolution-history">
              <div>
                <strong>{days}</strong>
                <small>jours ensemble</small>
              </div>

              <div>
                <strong>{interactions}</strong>
                <small>échanges</small>
              </div>

              <div>
                <strong>∞</strong>
                <small>évolution</small>
              </div>
            </div>

            <p className="zero-evolution-note">
              il n’y a pas de meilleur Zero
              <br />
              juste le tien
            </p>

            <button
              type="button"
              className="zero-evolution-share"
              onClick={copyCard}
            >
              copier ma carte
            </button>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}