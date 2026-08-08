import { motion } from "framer-motion";
import { ZERO_LANGUAGES } from "./zero-language";
import { gameSfx } from "./zero-game-sfx";
import { getZeroCopy } from "./zero-i18n";

export default function ZeroSettings({
  open,
  language,
  onLanguage,
  onClose,
  audioState,
  onToggleMusic,
  onMusicVolume,
  voiceState,
  onToggleVoice,
  onTestVoice,
}) {
  if (!open) return null;

  const copy = getZeroCopy(language);

  const audioCopy = {
    fr: {
      title: "Musique",
      hint: "thème officiel de Zero",
      theme: "Zero Theme",
      on: "ON",
      off: "OFF",
      volume: "Volume",
      missing: "zero-theme.mp3 introuvable",
    },
    en: {
      title: "Music",
      hint: "Zero's official theme",
      theme: "Zero Theme",
      on: "ON",
      off: "OFF",
      volume: "Volume",
      missing: "zero-theme.mp3 not found",
    },
    id: {
      title: "Musik",
      hint: "tema resmi Zero",
      theme: "Zero Theme",
      on: "ON",
      off: "OFF",
      volume: "Volume",
      missing: "zero-theme.mp3 tidak ditemukan",
    },
  }[language] || null;

  const voiceCopy = {
    fr: {
      title: "Voix",
      hint: "prototype local",
      name: "Voix de Zero",
      on: "ON",
      off: "OFF",
      test: "▶ TESTER LA VOIX",
      unsupported: "pas dispo sur ce navigateur",
      ready: "voix système",
    },
    en: {
      title: "Voice",
      hint: "local prototype",
      name: "Zero voice",
      on: "ON",
      off: "OFF",
      test: "▶ TEST VOICE",
      unsupported: "not available in this browser",
      ready: "system voice",
    },
    id: {
      title: "Suara",
      hint: "prototipe lokal",
      name: "Suara Zero",
      on: "ON",
      off: "OFF",
      test: "▶ TES SUARA",
      unsupported: "nggak tersedia di browser ini",
      ready: "suara sistem",
    },
  }[language] || null;

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

        <section className="zero-settings-section zero65-audio-settings">
          <div className="zero-settings-title">
            <span>{audioCopy.title}</span>
            <small>{audioCopy.hint}</small>
          </div>

          <div className="zero65-audio-card">
            <div className="zero65-audio-track">
              <span className="zero65-music-disc" aria-hidden="true">
                <i />
              </span>

              <span>
                <strong>{audioCopy.theme}</strong>
                <small>
                  {audioState?.hasTrack
                    ? "zero-theme.mp3"
                    : audioCopy.missing}
                </small>
              </span>

              <button
                type="button"
                className={[
                  "zero65-audio-switch",
                  audioState?.enabled ? "is-on" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={onToggleMusic}
              >
                {audioState?.enabled
                  ? audioCopy.on
                  : audioCopy.off}
              </button>
            </div>

            <div className="zero65-volume">
              <span>{audioCopy.volume}</span>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioState?.volume ?? 0.42}
                onChange={(event) =>
                  onMusicVolume(
                    Number(event.target.value)
                  )
                }
              />
            </div>
          </div>
        </section>

        <section className="zero-settings-section zero74-voice-settings">
          <div className="zero-settings-title">
            <span>{voiceCopy.title}</span>
            <small>{voiceCopy.hint}</small>
          </div>

          <div className="zero65-audio-card zero74-voice-card">
            <div className="zero65-audio-track">
              <span
                className="zero74-voice-orb"
                aria-hidden="true"
              >
                <i />
                <i />
              </span>

              <span>
                <strong>{voiceCopy.name}</strong>
                <small>
                  {voiceState?.supported
                    ? (
                        voiceState?.voiceName ||
                        voiceCopy.ready
                      )
                    : voiceCopy.unsupported}
                </small>
              </span>

              <button
                type="button"
                className={[
                  "zero65-audio-switch",
                  voiceState?.enabled
                    ? "is-on"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!voiceState?.supported}
                onClick={onToggleVoice}
              >
                {voiceState?.enabled
                  ? voiceCopy.on
                  : voiceCopy.off}
              </button>
            </div>

            <button
              type="button"
              className="zero74-test-voice"
              disabled={!voiceState?.supported}
              onClick={() => {
                gameSfx.soft();
                onTestVoice();
              }}
            >
              {voiceCopy.test}
            </button>
          </div>
        </section>
      </main>
    </motion.div>
  );
}
