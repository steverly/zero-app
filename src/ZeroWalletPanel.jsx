import { AnimatePresence, motion } from "framer-motion";
import { ZERO_CONFIG } from "./zero-config";
import { gameSfx } from "./zero-game-sfx";
import { getZeroCopy } from "./zero-i18n";

function Coin() {
  return (
    <span className="zero-coin-icon" aria-hidden="true">
      <i />
    </span>
  );
}

export default function ZeroWalletPanel({
  open,
  wallet,
  rewardedCount = 0,
  rewardedMax = 5,
  rewardedLoading = false,
  onRewardedCoins,
  onBuyPack,
  onClose,
  language = "fr",
}) {
  if (!open) return null;

  const copy = getZeroCopy(language);

  return (
    <motion.div
      className="zero-wallet-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="zero-wallet-ambient zero-wallet-ambient-a" />
      <div className="zero-wallet-ambient zero-wallet-ambient-b" />

      <header className="zero-wallet-screen-head">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            gameSfx.tap();
            onClose();
          }}
        >
          ←
        </motion.button>

        <div>
          <small>WALLET</small>
          <strong>{copy.wallet.title}</strong>
        </div>

        <i />
      </header>

      <main className="zero-wallet-screen-content">
        <section className="zero-wallet-hero">
          <motion.div
            className="zero-wallet-bigcoin"
            animate={{
              y: [0, -6, 0],
              rotateY: [0, 16, 0, -16, 0],
            }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Coin />
          </motion.div>

          <strong>{wallet.coins}</strong>
          <small>{copy.wallet.available}</small>
        </section>

        <section className="zero-wallet-method">
          <div className="zero-wallet-method-title">
            <span>{copy.wallet.free}</span>
            <small>
              {Math.max(
                0,
                rewardedMax - rewardedCount
              )}{" "}
              {copy.wallet.today}
            </small>
          </div>

          <motion.button
            type="button"
            className="zero-wallet-rewarded"
            disabled={
              rewardedLoading ||
              rewardedCount >= rewardedMax
            }
            whileTap={{
              scale:
                rewardedCount < rewardedMax
                  ? 0.98
                  : 1,
            }}
            onClick={onRewardedCoins}
          >
            <span className="zero-wallet-video">
              <i />
            </span>

            <span>
              <strong>{copy.wallet.rewardedCoins}</strong>
              <small>{copy.wallet.watchAd}</small>
            </span>

            <Coin />
          </motion.button>
        </section>

        <section className="zero-wallet-method">
          <div className="zero-wallet-method-title">
            <span>{copy.wallet.packs}</span>
            <small>{copy.wallet.optional}</small>
          </div>

          <div className="zero-wallet-pack-list">
            {Object.values(
              ZERO_CONFIG.shop.coinPacks
            ).map((pack, index) => (
              <motion.button
                key={pack.id}
                type="button"
                className={
                  index === 1
                    ? "is-featured"
                    : ""
                }
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -2 }}
                onClick={() => onBuyPack(pack)}
              >
                <Coin />

                <span>
                  <strong>{pack.coins}</strong>
                  <small>coins</small>
                </span>

                <i>
                  {index === 1 ? "+" : "›"}
                </i>
              </motion.button>
            ))}
          </div>
        </section>

        <p className="zero-wallet-note">
          {copy.wallet.note}
        </p>
      </main>
    </motion.div>
  );
}
