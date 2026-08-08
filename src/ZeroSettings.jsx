import { motion } from "framer-motion";
import { ZERO_LANGUAGES } from "./zero-language";
import { gameSfx } from "./zero-game-sfx";
import { getZeroCopy } from "./zero-i18n";

export default function ZeroSettings({
  open,
  language,
  onLanguage,
  onClose,
}) {
  if (!open) return null;

  const copy = getZeroCopy(language);

  return (
    <motion.div
      className="zero-settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="zero-settings-head">
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
          <small>ZERO</small>
          <strong>{copy.settings.title}</strong>
        </div>

        <i />
      </header>

      <main className="zero-settings-content">
        <section className="zero-settings-section">
          <div className="zero-settings-title">
            <span>{copy.settings.language}</span>
            <small>
              {copy.settings.languageHint}
            </small>
          </div>

          <div className="zero-language-list">
            {ZERO_LANGUAGES.map(
              (item) => {
                const active =
                  language === item.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    className={
                      active
                        ? "is-active"
                        : ""
                    }
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() => {
                      gameSfx.soft();
                      onLanguage(item.id);
                    }}
                  >
                    <span
                      className={`zero-language-orb is-${item.id}`}
                    >
                      <i />
                    </span>

                    <span>
                      <strong>
                        {item.native}
                      </strong>
                      <small>
                        {item.hint}
                      </small>
                    </span>

                    <i className="zero-language-check" />
                  </motion.button>
                );
              }
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
