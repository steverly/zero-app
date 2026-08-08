import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  buyBoost,
  buyCosmetic,
  equipCosmetic,
  getShopCatalog,
  resetCosmetics,
} from "./zero-wallet";

import { gameSfx } from "./zero-game-sfx";
import ZeroWorldBackground from "./ZeroWorldBackground";

const COPY = {
  fr: {
    title: "Shop",
    style: "Style",
    boosts: "Boosts",
    reset: "Remettre par défaut",
    backgrounds: "Décors",
    eyes: "Lueurs",
    effects: "Ambiance",
    accessories: "Accessoires",
    owned: "acheté",
    equipped: "équipé",
    equip: "mettre",
    notEnough: "pas assez de coins",
    unlocked: "débloqué",
    activated: "activé",
    clean: "des petits changements propres, pas un déguisement",
    boostHint: "des boosts utiles, pas obligatoires",
  },

  en: {
    title: "Shop",
    style: "Style",
    boosts: "Boosts",
    reset: "Reset to default",
    backgrounds: "Rooms",
    eyes: "Glow",
    effects: "Atmosphere",
    accessories: "Accessories",
    owned: "owned",
    equipped: "equipped",
    equip: "equip",
    notEnough: "not enough coins",
    unlocked: "unlocked",
    activated: "activated",
    clean: "clean little changes, not a costume",
    boostHint: "useful boosts, never required",
  },

  id: {
    title: "Toko",
    style: "Style",
    boosts: "Boost",
    reset: "Balikin ke default",
    backgrounds: "Ruangan",
    eyes: "Glow",
    effects: "Suasana",
    accessories: "Aksesori",
    owned: "punya",
    equipped: "dipakai",
    equip: "pakai",
    notEnough: "koinnya kurang",
    unlocked: "kebuka",
    activated: "aktif",
    clean: "perubahan kecil yang rapi, bukan kostum rame",
    boostHint: "boost berguna, tapi nggak wajib",
  },
};

const LOCAL_ITEMS = {
  en: {
    bg_void: ["Original", "Zero's original room"],
    bg_sunset: ["Sunset", "a warm, soft sunset"],
    bg_aquarium: ["Blue Room", "calm blue light and water reflections"],
    bg_cloud: ["Cloud Room", "pastel sky with slow clouds"],
    eyes_violet: ["Lavender", "soft violet glow"],
    eyes_cyan: ["Aqua", "soft cyan glow"],
    eyes_peach: ["Warm", "warm pinkish glow"],
    fx_fireflies: ["Fireflies", "a few warm lights around Zero"],
    fx_stardust: ["Soft Stars", "small, quiet stars"],
    accessory_crown: ["Crown", "a clean little floating crown"],
    accessory_headphones: ["Headphones", "simple headphones around Zero"],
    accessory_beanie: ["Beanie", "a soft beanie above his eyes"],
    boost_core_20: ["Core Boost", "Core ×1.5 for 20 min"],
    boost_coins_3: ["Win Bonus", "coins ×2 for your next 3 wins"],
  },

  id: {
    bg_void: ["Original", "ruangan asli Zero"],
    bg_sunset: ["Sunset", "senja yang hangat dan lembut"],
    bg_aquarium: ["Blue Room", "cahaya biru tenang dengan pantulan air"],
    bg_cloud: ["Cloud Room", "langit pastel dengan awan pelan"],
    eyes_violet: ["Lavender", "glow ungu yang lembut"],
    eyes_cyan: ["Aqua", "glow cyan yang lembut"],
    eyes_peach: ["Warm", "glow hangat agak pink"],
    fx_fireflies: ["Fireflies", "beberapa cahaya hangat di sekitar Zero"],
    fx_stardust: ["Soft Stars", "bintang kecil yang tenang"],
    accessory_crown: ["Crown", "mahkota kecil yang melayang"],
    accessory_headphones: ["Headphones", "headphone simpel di sekitar Zero"],
    accessory_beanie: ["Beanie", "beanie lembut di atas matanya"],
    boost_core_20: ["Core Boost", "Core ×1.5 selama 20 menit"],
    boost_coins_3: ["Win Bonus", "koin ×2 untuk 3 kemenangan berikutnya"],
  },
};

function translated(item, language) {
  const local = LOCAL_ITEMS[language]?.[item.id];

  return local
    ? {
        ...item,
        label: local[0],
        description: local[1],
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

function Preview({ item }) {
  const isBackground =
    item.type === "background";

  return (
    <div className={`zero63-shop-preview ${item.id}`}>
      {isBackground ? (
        <ZeroWorldBackground
          background={item.id}
          preview
        />
      ) : null}

      <div className="zero63-preview-eyes">
        <i />
        <i />
      </div>

      {item.id === "accessory_crown" ? (
        <span className="zero63-preview-crown" />
      ) : null}

      {item.id === "accessory_headphones" ? (
        <span className="zero63-preview-headphones" />
      ) : null}

      {item.id === "accessory_beanie" ? (
        <span className="zero63-preview-beanie" />
      ) : null}

      {item.id === "fx_fireflies" ? (
        <span className="zero63-preview-fireflies">
          <i />
          <i />
          <i />
        </span>
      ) : null}

      {item.id === "fx_stardust" ? (
        <span className="zero63-preview-stars">✦ · ✦</span>
      ) : null}
    </div>
  );
}

export default function ZeroShop({
  open,
  wallet,
  onWallet,
  onClose,
  language = "fr",
}) {
  const [tab, setTab] = useState("style");
  const [toast, setToast] = useState("");

  const copy = COPY[language] || COPY.fr;
  const catalog = useMemo(() => getShopCatalog(), []);

  const show = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1600);
  };

  if (!open) return null;

  const categories = [
    ["background", copy.backgrounds],
    ["eyes", copy.eyes],
    ["effect", copy.effects],
    ["accessory", copy.accessories],
  ];

  const handleItem = (rawItem) => {
    const item = translated(rawItem, language);
    const owned = wallet.owned.includes(item.id);
    const equipped =
      wallet.equipped?.[item.type] === item.id;

    if (equipped) {
      gameSfx.soft();
      return;
    }

    if (owned) {
      onWallet(equipCosmetic(wallet, item));
      gameSfx.tap();
      show(`${item.label} · ${copy.equipped}`);
      return;
    }

    const next = buyCosmetic(wallet, item);

    if (!next) {
      gameSfx.error();
      show(copy.notEnough);
      return;
    }

    onWallet(next);
    gameSfx.buy();
    show(`${item.label} · ${copy.unlocked}`);
  };

  const handleBoost = (rawItem) => {
    const item = translated(rawItem, language);
    const next = buyBoost(wallet, item);

    if (!next) {
      gameSfx.error();
      show(copy.notEnough);
      return;
    }

    onWallet(next);
    gameSfx.buy();
    show(`${item.label} · ${copy.activated}`);
  };

  return (
    <motion.div
      className="zero63-shop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="zero63-shop-head">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
        >
          ←
        </motion.button>

        <div>
          <small>ZERO</small>
          <strong>{copy.title}</strong>
        </div>

        <div className="zero63-shop-wallet">
          <Coin small />
          <strong>{wallet.coins}</strong>
        </div>
      </header>

      <nav className="zero63-shop-tabs">
        <button
          type="button"
          className={tab === "style" ? "is-active" : ""}
          onClick={() => setTab("style")}
        >
          {copy.style}
        </button>

        <button
          type="button"
          className={tab === "boosts" ? "is-active" : ""}
          onClick={() => setTab("boosts")}
        >
          {copy.boosts}
        </button>
      </nav>

      <main className="zero63-shop-body">
        <AnimatePresence mode="wait">
          {tab === "style" ? (
            <motion.section
              key="style"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="zero63-shop-intro">
                <strong>{copy.style}</strong>
                <small>{copy.clean}</small>

                <button
                  type="button"
                  onClick={() => {
                    onWallet(resetCosmetics(wallet));
                    gameSfx.soft();
                    show(copy.reset);
                  }}
                >
                  ↺ {copy.reset}
                </button>
              </div>

              {categories.map(([type, label]) => {
                const items = catalog.cosmetics.filter(
                  (item) => item.type === type
                );

                return (
                  <section
                    key={type}
                    className="zero63-shop-category"
                  >
                    <h3>{label}</h3>

                    <div className="zero63-shop-grid">
                      {items.map((rawItem) => {
                        const item = translated(rawItem, language);
                        const owned = wallet.owned.includes(item.id);
                        const equipped =
                          wallet.equipped?.[item.type] === item.id;

                        return (
                          <motion.button
                            key={item.id}
                            type="button"
                            className={[
                              "zero63-shop-card",
                              equipped ? "is-equipped" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleItem(rawItem)}
                          >
                            <Preview item={item} />

                            <span className="zero63-shop-card-copy">
                              <strong>{item.label}</strong>
                              <small>{item.description}</small>
                            </span>

                            <span className="zero63-shop-card-action">
                              {equipped ? (
                                copy.equipped
                              ) : owned ? (
                                copy.equip
                              ) : (
                                <>
                                  <Coin small />
                                  {item.price}
                                </>
                              )}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </motion.section>
          ) : (
            <motion.section
              key="boosts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="zero63-shop-intro">
                <strong>{copy.boosts}</strong>
                <small>{copy.boostHint}</small>
              </div>

              <div className="zero63-boost-list">
                {catalog.boosts.map((rawItem) => {
                  const item = translated(rawItem, language);

                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBoost(rawItem)}
                    >
                      <span className="zero63-boost-mark">
                        {item.effect === "core" ? "♥" : "×2"}
                      </span>

                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>

                      <span className="zero63-boost-price">
                        <Coin small />
                        {item.price}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="zero63-shop-toast"
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
