const KEY = "zero_voice_enabled_v1";

const state = {
  enabled:
    localStorage.getItem(KEY) === "1",
  supported:
    typeof window !== "undefined" &&
    "speechSynthesis" in window,
  voicesReady: false,
  voiceName: "",
};

const listeners = new Set();
let voices = [];
let lastText = "";
let lastSpokenAt = 0;

const SETTINGS = {
  idle: { rate: 1.00, pitch: 0.94 },
  replying: { rate: 1.03, pitch: 0.95 },
  warm: { rate: 0.98, pitch: 0.98 },
  funny: { rate: 1.07, pitch: 1.01 },
  hyped: { rate: 1.12, pitch: 1.03 },
  annoyed: { rate: 0.96, pitch: 0.89 },
  sharp: { rate: 1.00, pitch: 0.88 },
  calm: { rate: 0.95, pitch: 0.92 },
  curious: { rate: 1.02, pitch: 0.97 },
};

function emit() {
  const snapshot = { ...state };
  listeners.forEach((fn) => fn(snapshot));
}

function langCode(language) {
  if (language === "en") return "en-US";
  if (language === "id") return "id-ID";
  return "fr-FR";
}

function refreshVoices() {
  if (!state.supported) return [];

  voices =
    window.speechSynthesis.getVoices() || [];

  state.voicesReady = voices.length > 0;
  emit();

  return voices;
}

function bestVoice(language) {
  const all =
    voices.length
      ? voices
      : refreshVoices();

  const exact =
    langCode(language).toLowerCase();

  const base =
    exact.split("-")[0];

  // Prefer voices from the requested language.
  // Names vary by Windows/iOS/Android, so don't hardcode one vendor.
  const candidates =
    all.filter((voice) =>
      String(voice.lang || "")
        .toLowerCase()
        .startsWith(base)
    );

  const exactMatch =
    candidates.find((voice) =>
      String(voice.lang || "")
        .toLowerCase() === exact
    );

  const picked =
    exactMatch ||
    candidates[0] ||
    all[0] ||
    null;

  state.voiceName =
    picked?.name || "";

  emit();

  return picked;
}

function cleanText(text = "") {
  return String(text)
    .replace(
      /[\u{1F300}-\u{1FAFF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function speakInternal(
  text,
  {
    language = "fr",
    mood = "replying",
    force = false,
  } = {}
) {
  if (!state.supported) {
    return {
      ok: false,
      reason: "unsupported",
    };
  }

  if (!force && !state.enabled) {
    return {
      ok: false,
      reason: "disabled",
    };
  }

  const clean =
    cleanText(text);

  if (!clean) {
    return {
      ok: false,
      reason: "empty",
    };
  }

  // Prevent React rerenders from speaking the exact same reply twice.
  if (
    !force &&
    clean === lastText &&
    Date.now() - lastSpokenAt < 5000
  ) {
    return {
      ok: false,
      reason: "duplicate",
    };
  }

  refreshVoices();

  const utterance =
    new SpeechSynthesisUtterance(clean);

  const settings =
    SETTINGS[mood] ||
    SETTINGS.replying;

  const voice =
    bestVoice(language);

  utterance.lang =
    langCode(language);

  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate =
    settings.rate;

  utterance.pitch =
    settings.pitch;

  utterance.volume = 0.92;

  window.speechSynthesis.cancel();

  lastText = clean;
  lastSpokenAt = Date.now();

  return await new Promise((resolve) => {
    let finished = false;

    const done = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    utterance.onstart = () => {
      console.log("ZERO_VOICE_START", {
        text: clean,
        language,
        mood,
        voice:
          utterance.voice?.name ||
          "system-default",
      });
    };

    utterance.onend = () =>
      done({ ok: true });

    utterance.onerror = (event) => {
      console.warn(
        "ZERO_VOICE_ERROR",
        event?.error || event
      );

      done({
        ok: false,
        reason:
          event?.error || "speech-error",
      });
    };

    window.speechSynthesis.speak(
      utterance
    );

    // Some browsers are flaky with callbacks.
    window.setTimeout(
      () => done({ ok: true }),
      Math.max(
        3000,
        clean.length * 95
      )
    );
  });
}

if (state.supported) {
  refreshVoices();

  window.speechSynthesis.addEventListener?.(
    "voiceschanged",
    refreshVoices
  );

  // Chromium sometimes only exposes voices later.
  window.setTimeout(
    refreshVoices,
    300
  );

  window.setTimeout(
    refreshVoices,
    1200
  );
}

export const zeroVoice = {
  getState() {
    return { ...state };
  },

  subscribe(listener) {
    listeners.add(listener);
    listener({ ...state });

    return () =>
      listeners.delete(listener);
  },

  setEnabled(value) {
    state.enabled =
      Boolean(value);

    localStorage.setItem(
      KEY,
      state.enabled ? "1" : "0"
    );

    if (!state.enabled) {
      window.speechSynthesis?.cancel?.();
    }

    refreshVoices();
    emit();
  },

  toggle() {
    this.setEnabled(
      !state.enabled
    );

    return state.enabled;
  },

  stop() {
    if (!state.supported) return;
    window.speechSynthesis.cancel();
  },

  speak(text, options) {
    return speakInternal(
      text,
      options
    );
  },

  test(language = "fr") {
    const lines = {
      fr: "eh. ouais là tu m'entends.",
      en: "yeah. you can hear me now.",
      id: "eh. sekarang kedengeran kan.",
    };

    // TEST is always allowed because it comes directly from a user click.
    return speakInternal(
      lines[language] || lines.fr,
      {
        language,
        mood: "idle",
        force: true,
      }
    );
  },
};
