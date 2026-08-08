import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  buyBoost,
  buyCosmetic,
  equipCosmetic,
  getShopCatalog,
} from "./zero-wallet";

import { gameSfx } from "./zero-game-sfx";
import { getZeroCopy } from "./zero-i18n";

const ITEM_COPY = {
  en: {
    bg_void: ["Deep Void", "Zero's original black"],
    bg_aurora: ["Aurora Room", "moving cyan and violet veils"],
    bg_sunset: ["Sunset Room", "peach sky, pink horizon, soft light"],
    bg_arcade: ["Dream Arcade", "neon grid and slow stars"],
    bg_aquarium: ["Aquarium", "water glow and calm bubbles"],
    bg_cloud: ["Cloud Nine", "floating pastel clouds"],
    eyes_violet: ["Violet Pulse", "electric violet eyes"],
    eyes_cyan: ["Aqua Pulse", "bright cyan eyes"],
    eyes_peach: ["Sunset Glow", "peach and pink eyes"],
    eyes_prism: ["Prism", "soft multicolor reflection"],
    fx_orbit: ["Orbit", "two stars orbit around Zero"],
    fx_stardust: ["Stardust", "floating star dust"],
    fx_echo: ["Echo", "ghost waves around him"],
    fx_fireflies: ["Fireflies", "warm little lights drifting around"],
    fx_glitch: ["Soft Glitch", "small digital shifts now and then"],
    accessory_crown: ["Float Crown", "a floating crown above his eyes"],
    accessory_headphones: ["Zero Phones", "futuristic headphones around him"],
    accessory_horns: ["Little Horns", "two small glowing horns"],
    accessory_visor: ["Visor", "a holographic visor over his eyes"],
    accessory_wings: ["Mini Wings", "small glowing wings on the sides"],
    accessory_shards: ["Shards", "crystal fragments around the Core"],
    boost_core_20: ["Core Rush", "Core ×1.5 for 20 min"],
    boost_coins_3: ["Win Spark", "coins ×2 for your next 3 wins"],
    boost_arcade_60: ["Arcade Key", "all games open for 60 min"],
  },

  id: {
    bg_void: ["Deep Void", "hitam originalnya Zero"],
    bg_aurora: ["Aurora Room", "aurora cyan dan ungu yang bergerak"],
    bg_sunset: ["Sunset Room", "langit peach, horizon pink, cahaya lembut"],
    bg_arcade: ["Dream Arcade", "grid neon dan bintang yang bergerak pelan"],
    bg_aquarium: ["Aquarium", "cahaya air dan gelembung yang tenang"],
    bg_cloud: ["Cloud Nine", "awan pastel yang melayang"],
    eyes_violet: ["Violet Pulse", "mata ungu elektrik"],
    eyes_cyan: ["Aqua Pulse", "mata cyan terang"],
    eyes_peach: ["Sunset Glow", "mata peach dan pink"],
    eyes_prism: ["Prism", "pantulan warna halus"],
    fx_orbit: ["Orbit", "dua bintang mengorbit Zero"],
    fx_stardust: ["Stardust", "debu bintang yang melayang"],
    fx_echo: ["Echo", "gelombang bayangan di sekitar Zero"],
    fx_fireflies: ["Fireflies", "lampu kecil hangat yang beterbangan"],
    fx_glitch: ["Soft Glitch", "glitch digital kecil sesekali"],
    accessory_crown: ["Float Crown", "mahkota melayang di atas matanya"],
    accessory_headphones: ["Zero Phones", "headphone futuristik di sekitar Zero"],
    accessory_horns: ["Little Horns", "dua tanduk kecil bercahaya"],
    accessory_visor: ["Visor", "visor holografik di depan mata"],
    accessory_wings: ["Mini Wings", "sayap kecil bercahaya di samping"],
    accessory_shards: ["Shards", "pecahan kristal di sekitar Core"],
    boost_core_20: ["Core Rush", "Core ×1.5 selama 20 menit"],
    boost_coins_3: ["Win Spark", "koin ×2 untuk 3 kemenangan berikutnya"],
    boost_arcade_60: ["Arcade Key", "semua game terbuka 60 menit"],
  },
};

function localizedItem(item, language) {
  const translated = ITEM_COPY[language]?.[item.id];

  return translated
    ? {
        ...item,
        label: translated[0],
        description: translated[1],
      }
    : item;
}

function Coin({ small = false }) {
  return (
    <span
      className={`zero-coin-icon ${small ? "is-small" : ""}`}
      aria-hidden="true"
    >
      <i />
    </span>
  );
}

function CosmeticPreview({ item, equipped }) {
  return (
    <div
      className={[
        "zero-shop-preview",
        `is-${item.preview || "violet"}`,
        item.id,
        equipped ? "is-equipped" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="zero-shop-preview-eyes">
        <i />
        <i />
      </div>

      {item.type === "effect" ? (
        <div className={`zero-shop-preview-effect ${item.id}`}>
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {item.type === "accessory" ? (
        <div
          className={`zero-shop-preview-accessory ${item.id}`}
        >
          <i />
          <i />
          <i />
        </div>
      ) : null}
    </div>
  );
}

function ShopItem({
  item,
  wallet,
  onWallet,
  onToast,
  copy,
  language,
}) {
  item = localizedItem(item, language);

  const owned = wallet.owned.includes(item.id);
  const equipped =
    wallet.equipped?.[item.type] === item.id;

  const afford =
    Number(wallet.coins || 0) >= Number(item.price || 0);

  const buy = () => {
    if (equipped) {
      gameSfx.soft();
      return;
    }

    if (owned) {
      gameSfx.tap();
      onWallet(equipCosmetic(wallet, item));
      onToast(`${item.label} · ${copy.common.equipped}`);
      return;
    }

    const next = buyCosmetic(wallet, item);

    if (!next) {
      gameSfx.error();
      onToast(copy.shop.notEnough);
      return;
    }

    gameSfx.buy();
    onWallet(next);
    onToast(`${item.label} · ${copy.shop.unlocked}`);
  };

  return (
    <motion.button
      type="button"
      className={[
        "zero-shop-item",
        equipped ? "is-equipped" : "",
        !afford && !owned ? "is-expensive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={buy}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -3 }}
    >
      <CosmeticPreview
        item={item}
        equipped={equipped}
      />

      <div className="zero-shop-item-copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </div>

      <div className="zero-shop-item-price">
        {equipped ? (
          <span>équipé</span>
        ) : owned ? (
          <span>mettre</span>
        ) : (
          <>
            <Coin small />
            <span>{item.price}</span>
          </>
        )}
      </div>
    </motion.button>
  );
}

function BoostItem({
  item,
  wallet,
  onWallet,
  onToast,
  copy,
  language,
}) {
  item = localizedItem(item, language);

  const buy = () => {
    const next = buyBoost(wallet, item);

    if (!next) {
      gameSfx.error();
      onToast(copy.shop.notEnough);
      return;
    }

    gameSfx.buy();
    onWallet(next);
    onToast(`${item.label} · ${copy.shop.activated}`);
  };

  return (
    <motion.button
      type="button"
      className="zero-shop-boost"
      onClick={buy}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
    >
      <span className="zero-shop-boost-icon">
        <i />
      </span>

      <span>
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>

      <span className="zero-shop-boost-price">
        <Coin small />
        {item.price}
      </span>
    </motion.button>
  );
}

export default function ZeroShop({
  open,
  wallet,
  onWallet,
  onClose,
  language = "fr",
}) {
  const [tab, setTab] = useState("cosmetics");
  const copy = getZeroCopy(language);
  const [toast, setToast] = useState("");

  const catalog = useMemo(
    () => getShopCatalog(),
    []
  );

  const showToast = (text) => {
    setToast(text);

    window.setTimeout(() => {
      setToast("");
    }, 1800);
  };

  if (!open) return null;

  return (
    <motion.div
      className="zero-shop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="zero-shop-bg-orb zero-shop-bg-orb-a" />
      <div className="zero-shop-bg-orb zero-shop-bg-orb-b" />

      <header className="zero-shop-head">
        <motion.button
          type="button"
          onClick={() => {
            gameSfx.tap();
            onClose();
          }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>

        <div>
          <small>ZERO STORE</small>
          <strong>{copy.shop.title}</strong>
        </div>

        <div className="zero-wallet-pill">
          <Coin small />
          <strong>{wallet.coins}</strong>
        </div>
      </header>

      <nav className="zero-shop-tabs">
        {[
          ["cosmetics", copy.shop.style],
          ["boosts", copy.shop.boosts],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-active" : ""}
            onClick={() => {
              gameSfx.soft();
              setTab(id);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="zero-shop-content">
        <AnimatePresence mode="wait">
          {tab === "cosmetics" ? (
            <motion.section
              key="cosmetics"
              className="zero-shop-cosmetics"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <div className="zero-shop-intro">
                <small>{copy.shop.yourZero}</small>
                <strong>
                  {copy.shop.changeMood}
                </strong>
              </div>

              {["background", "eyes", "effect", "accessory"].map(
                (type) => {
                  const labels = {
                    background: copy.shop.backgrounds,
                    eyes: copy.shop.eyes,
                    effect: copy.shop.effects,
                    accessory: copy.shop.accessories,
                  };

                  const items = catalog.cosmetics.filter(
                    (item) => item.type === type
                  );

                  return (
                    <div
                      key={type}
                      className="zero-shop-category"
                    >
                      <div className="zero-shop-category-head">
                        <span>{labels[type]}</span>
                        <small>{items.length}</small>
                      </div>

                      <div className="zero-shop-grid">
                        {items.map((item) => (
                          <ShopItem
                            key={item.id}
                            item={item}
                            wallet={wallet}
                            onWallet={onWallet}
                            onToast={showToast}
                            copy={copy}
                            language={language}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </motion.section>
          ) : null}

          {tab === "boosts" ? (
            <motion.section
              key="boosts"
              className="zero-shop-boosts"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <div className="zero-shop-intro">
                <small>{copy.shop.boosts.toUpperCase()}</small>
                <strong>
                  {copy.shop.boostIntro}
                </strong>
              </div>

              <div className="zero-shop-boost-list">
                {catalog.boosts.map((item) => (
                  <BoostItem
                    key={item.id}
                    item={item}
                    wallet={wallet}
                    onWallet={onWallet}
                    onToast={showToast}
                    copy={copy}
                    language={language}
                  />
                ))}
              </div>

              <p className="zero-shop-footnote">
                {copy.shop.noAffection}
              </p>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="zero-shop-toast"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
