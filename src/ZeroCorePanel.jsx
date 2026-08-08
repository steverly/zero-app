import { AnimatePresence, motion } from "framer-motion";
import { ZERO_CONFIG } from "./zero-config";
import {
  getRelationshipAgeDays,
  getRelationshipDescriptors,
  getRelationshipPhase,
  getPhaseProgress,
} from "./zero-relationship";
import {
  canWatchRewarded,
  formatDuration,
  getArcadePassRemainingMs,
  getCoreBoostRemainingMs,
} from "./zero-economy";

import { getWalletCoreMultiplier } from "./zero-wallet";
import { getZeroCopy } from "./zero-i18n";

function Meter({ label, value }) {
  const safeValue = Math.max(0.04, Math.min(1, Number(value || 0)));

  return (
    <div className="zero-v5-meter">
      <div className="zero-v5-meter-head">
        <span>{label}</span>
        <i />
      </div>

      <div className="zero-v5-meter-track">
        <motion.span
          initial={false}
          animate={{ scaleX: safeValue }}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>
    </div>
  );
}

function MiniZero({ relationship }) {
  const expression = Number(
    relationship?.traits?.expressiveness || 0.26
  );

  return (
    <div
      className="zero-v5-mini-zero"
      style={{ "--mini-expression": expression }}
      aria-hidden="true"
    >
      <div className="zero-v5-mini-aura" />
      <div className="zero-v51-mini-orbit zero-v51-mini-orbit-a"><i /></div>
      <div className="zero-v51-mini-orbit zero-v51-mini-orbit-b"><i /></div>
      <div className="zero-v51-mini-scan" />

      <div className="zero-v5-mini-eyes">
        <i />
        <i />
      </div>

      <div className="zero-v5-mini-core">
        <i />
      </div>
    </div>
  );
}

export default function ZeroCorePanel({
  open,
  relationship,
  economy,
  wallet,
  isPremium,
  rewardLoading,
  onClose,
  onReward,
  onOpenShop,
  language = "fr",
}) {
  const copy = getZeroCopy(language);

  const gameLoopCopy = {
    fr: {
      title: "Fais grandir ton Zero",
      text: "parle avec lui, joue avec lui, laisse votre dynamique se construire",
      talk: "discuter",
      play: "jouer",
      next: "prochain stade",
      open: "ouvrir",
    },
    en: {
      title: "Grow your Zero",
      text: "talk to him, play with him, let your dynamic build over time",
      talk: "chat",
      play: "play",
      next: "next stage",
      open: "open",
    },
    id: {
      title: "Kembangin Zero kamu",
      text: "ngobrol, main bareng, biarin dinamika kalian tumbuh sendiri",
      talk: "ngobrol",
      play: "main",
      next: "tahap berikutnya",
      open: "buka",
    },
  }[language] || {
    title: "Fais grandir ton Zero",
    text: "parle avec lui, joue avec lui, laisse votre dynamique se construire",
    talk: "discuter",
    play: "jouer",
    next: "prochain stade",
    open: "ouvrir",
  };

  const traits = relationship?.traits || {};

  const descriptorMap = {
    fr: {
      taquin: "taquin",
      expressif: "expressif",
      franc: "franc",
      curieux: "curieux",
      posé: "posé",
      complice: "complice",
      spontané: "spontané",
      patient: "patient",
      direct: "direct",
    },
    en: {
      taquin: "teasing",
      expressif: "expressive",
      franc: "honest",
      curieux: "curious",
      posé: "calm",
      complice: "close",
      spontané: "spontaneous",
      patient: "patient",
      direct: "direct",
    },
    id: {
      taquin: "suka ngeledek",
      expressif: "ekspresif",
      franc: "jujur",
      curieux: "penasaran",
      posé: "santai",
      complice: "nyambung",
      spontané: "spontan",
      patient: "sabar",
      direct: "to the point",
    },
  };

  const descriptors = getRelationshipDescriptors(relationship)
    .map((value) => descriptorMap[language]?.[value] || value);

  const energy = Number(relationship?.totalEnergy || 0);
  const phase =
    energy < 8
      ? copy.core.discover
      : energy < 26
        ? copy.core.starting
        : energy < 70
          ? copy.core.comfortable
          : energy < 180
            ? copy.core.anchored
            : copy.core.evolving;
  const progress = getPhaseProgress(relationship);
  const ageDays = getRelationshipAgeDays(relationship);

  const boostedMs = getCoreBoostRemainingMs(economy);
  const arcadeMs = getArcadePassRemainingMs(economy);

  const walletCoreMs = Math.max(
    0,
    Number(wallet?.boosts?.coreUntil || 0) - Date.now()
  );

  const walletArcadeMs = Math.max(
    0,
    Number(wallet?.boosts?.arcadeUntil || 0) - Date.now()
  );

  const rewardedAvailable =
    !isPremium && canWatchRewarded(economy);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="zero-v5-core-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="zero-v5-core-panel"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{
              duration: 0.36,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="zero-v5-core-head">
              <div>
                <small>{copy.core.title}</small>
                <strong>{phase}</strong>
              </div>

              <button type="button" onClick={onClose}>
                ×
              </button>
            </header>

            <div className="zero-v5-core-hero">
              <MiniZero relationship={relationship} />

              <div className="zero-v5-core-phase-line">
                <span
                  style={{
                    transform: `scaleX(${Math.max(0.05, progress)})`,
                  }}
                />
              </div>

              <div className="zero-v5-core-tags">
                {descriptors.map((descriptor) => (
                  <span key={descriptor}>{descriptor}</span>
                ))}
              </div>
            </div>

            <section className="zero63-core-loop">
              <div className="zero63-core-loop-head">
                <span className="zero63-core-loop-heart">
                  <i />
                </span>

                <div>
                  <strong>{gameLoopCopy.title}</strong>
                  <small>{gameLoopCopy.text}</small>
                </div>
              </div>

              <div className="zero63-core-loop-progress">
                <div>
                  <motion.i
                    initial={false}
                    animate={{ scaleX: Math.max(0.03, progress) }}
                    transition={{ duration: 0.55 }}
                  />
                </div>

                <strong>{Math.round(progress * 100)}%</strong>
              </div>

              <div className="zero63-core-loop-actions">
                <span>💬 {gameLoopCopy.talk}</span>
              </div>
            </section>

            <div className="zero-v6-core-actions">
              <button
                type="button"
                onClick={onOpenShop}
              >
                <span className="zero-coin-icon is-small">
                  <i />
                </span>

                <span>
                  <strong>{wallet?.coins || 0}</strong>
                  <small>{copy.common.shop}</small>
                </span>
              </button>

              <button
                type="button"
                
              >
                <span className="zero-v6-arcade-glyph">
                  ✦
                </span>

                <span>
                  <strong>{copy.common.arcade}</strong>
                  <small>{games.length} {copy.core.games}</small>
                </span>
              </button>
            </div>

            <section className="zero-v5-core-section">
              <div className="zero-v5-section-title">
                <span>{copy.core.imprint}</span>
                <small>
                  {ageDays === 0
                    ? copy.core.firstDay
                    : `${ageDays}${copy.core.togetherDays}`}
                </small>
              </div>

              <div className="zero-v5-meters">
                <Meter
                  label={copy.core.affinity}
                  value={
                    (
                      Number(traits.familiarity || 0) +
                      Number(traits.trust || 0)
                    ) / 2
                  }
                />

                <Meter
                  label={copy.core.spontaneity}
                  value={traits.initiative}
                />

                <Meter
                  label={copy.core.expression}
                  value={traits.expressiveness}
                />

                <Meter
                  label={copy.core.stability}
                  value={relationship?.stability}
                />
              </div>
            </section>

            

            {boostedMs > 0 ||
            arcadeMs > 0 ||
            walletCoreMs > 0 ||
            walletArcadeMs > 0 ? (
              <section className="zero-v5-active-perks">
                {boostedMs > 0 ? (
                  <div>
                    <span>Core ×{ZERO_CONFIG.rewarded.coreMultiplier}</span>
                    <small>{formatDuration(boostedMs)}</small>
                  </div>
                ) : null}

                {walletCoreMs > 0 ? (
                  <div>
                    <span>
                      Core ×{getWalletCoreMultiplier(wallet)}
                    </span>
                    <small>{formatDuration(walletCoreMs)}</small>
                  </div>
                ) : null}

                {arcadeMs > 0 || walletArcadeMs > 0 ? (
                  <div>
                    <span>{copy.core.arcadeOpen}</span>
                    <small>
                      {formatDuration(
                        Math.max(arcadeMs, walletArcadeMs)
                      )}
                    </small>
                  </div>
                ) : null}
              </section>
            ) : null}

            {rewardedAvailable ? (
              <section className="zero-v5-reward-card">
                <div className="zero-v5-reward-glow" />

                <div>
                  <small>{copy.core.boostTitle}</small>
                  <strong>
                    {copy.core.boostText}
                  </strong>

                  <p>
                    +{ZERO_CONFIG.rewarded.chatTurns} messages · Core ×
                    {ZERO_CONFIG.rewarded.coreMultiplier} · arcade{" "}
                    {ZERO_CONFIG.rewarded.arcadePassMinutes} min
                  </p>
                </div>

                <button
                  type="button"
                  className="zero-v51-core-ad"
                  disabled={rewardLoading}
                  onClick={onReward}
                >
                  <span className="zero-v51-ad-icon" aria-hidden="true">
                    <i />
                  </span>
                  <span>
                    {rewardLoading ? "..." : "activer"}
                  </span>
                </button>
              </section>
            ) : isPremium ? (
              <section className="zero-v5-premium-perk">
                <span>{copy.common.premium}</span>
                <small>{copy.core.premiumSub}</small>
              </section>
            ) : (
              <section className="zero-v5-premium-perk">
                <span>{copy.core.boostsUsed}</span>
                <small>{copy.core.keepsEvolving}</small>
              </section>
            )}

            <footer className="zero-v5-core-footer">
              <span>
                {Number(relationship?.interactionCount || 0)} {copy.core.exchanges}
              </span>
              <span>{copy.core.infinite}</span>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
