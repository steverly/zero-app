const SETTINGS_KEY = "zero_audio_settings_v2";
const HOME_PLAYLIST = [
  { url: "/audio/zero-theme.mp3", name: "Zero Theme" },
  { url: "/audio/home-02.mp3", name: "Home 02" },
  { url: "/audio/home-03.mp3", name: "Home 03" },
  { url: "/audio/home-04.mp3", name: "Home 04" },
];

const ARCADE_PLAYLIST = [
  { url: "/audio/arcade-01.mp3", name: "Arcade 01" },
  { url: "/audio/arcade-02.mp3", name: "Arcade 02" },
  { url: "/audio/arcade-03.mp3", name: "Arcade 03" },
  { url: "/audio/arcade-04.mp3", name: "Arcade 04" },
];

const PLAYLISTS = { home: HOME_PLAYLIST, arcade: ARCADE_PLAYLIST };

let audioContext = null;
let musicElement = null;
let musicSource = null;
let musicGain = null;
let musicFilter = null;
let initialized = false;

let state = {
  enabled: true,
  volume: 0.42,
  hasTrack: true,
  trackName: "Zero Theme",
  muffled: false,
  speaking: false,
  mode: "home",
};

const listeners = new Set();
let currentTrack = null;
let previousByMode = { home: "", arcade: "" };
let failedByMode = {
  home: new Set(),
  arcade: new Set(),
};
let transitionTimer = null;

function playlistFor(mode = state.mode) {
  return PLAYLISTS[mode] || PLAYLISTS.home;
}

function shuffledCandidate(mode = state.mode) {
  const playlist = playlistFor(mode);

  const usable = playlist.filter(
    (track) =>
      !failedByMode[mode]?.has(track.url)
  );

  const base =
    usable.length
      ? usable
      : playlist;

  const candidates = base.filter(
    (track) =>
      track.url !== currentTrack?.url &&
      track.url !== previousByMode[mode]
  );

  const pool =
    candidates.length
      ? candidates
      : base.filter(
          (track) =>
            track.url !== currentTrack?.url
        );

  const finalPool =
    pool.length ? pool : base;

  return finalPool[
    Math.floor(Math.random() * finalPool.length)
  ];
}

function setTrack(track, { autoplay = true } = {}) {
  if (!musicElement || !track) return;
  if (currentTrack?.url) previousByMode[state.mode] = currentTrack.url;
  currentTrack = track;
  state.trackName = track.name;
  state.hasTrack = true;
  musicElement.src = track.url;
  musicElement.load();
  emit();
  if (autoplay && state.enabled) tryPlay();
}

function nextTrack() {
  setTrack(shuffledCandidate(state.mode));
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch {
      // ignore
    }
  });
}

function saveSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        enabled: state.enabled,
        volume: state.volume,
      })
    );
  } catch {
    // ignore
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);

    state.enabled = saved?.enabled !== false;
    state.volume = Math.max(
      0,
      Math.min(
        1,
        Number(saved?.volume ?? 0.42)
      )
    );
  } catch {
    // ignore
  }
}

function context() {
  if (audioContext) return audioContext;

  try {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    return audioContext;
  } catch {
    return null;
  }
}

function ensureGraph() {
  if (musicElement && musicSource) {
    return true;
  }

  const ctx = context();
  if (!ctx) return false;

  musicElement = document.createElement("audio");
  musicElement.loop = false;
  musicElement.preload = "auto";
  musicElement.playsInline = true;

  musicElement.addEventListener("ended", () => nextTrack());

  musicElement.addEventListener("error", () => {
    const mode = state.mode;

    if (currentTrack?.url) {
      failedByMode[mode]?.add(
        currentTrack.url
      );
    }

    const playlist =
      playlistFor(mode);

    const remaining =
      playlist.filter(
        (track) =>
          !failedByMode[mode]?.has(
            track.url
          )
      );

    if (remaining.length) {
      setTrack(
        shuffledCandidate(mode)
      );
      return;
    }

    // If every declared Arcade file is missing,
    // only then return to the official Home theme.
    const fallback =
      HOME_PLAYLIST[0];

    if (
      currentTrack?.url !==
      fallback.url
    ) {
      state.mode = "home";
      setTrack(fallback);
      return;
    }

    state.hasTrack = false;
    emit();
  });

  musicElement.addEventListener("canplay", () => {
    if (currentTrack?.url) {
      failedByMode[state.mode]?.delete(
        currentTrack.url
      );
    }

    state.hasTrack = true;
    emit();
  });

  musicSource =
    ctx.createMediaElementSource(
      musicElement
    );

  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.Q.value = 0.7;

  musicGain = ctx.createGain();

  musicSource.connect(musicFilter);
  musicFilter.connect(musicGain);
  musicGain.connect(ctx.destination);

  applyMix(true);
  setTrack(shuffledCandidate("home"), { autoplay: false });
  return true;
}

function targetCutoff() {
  if (state.muffled) return 720;
  if (state.speaking) return 4200;
  return 18000;
}

function targetGain() {
  if (!state.enabled || !state.hasTrack) {
    return 0.0001;
  }

  let gain = state.volume;

  if (state.muffled) {
    gain *= 0.42;
  }

  if (state.speaking) {
    gain *= 0.70;
  }

  return Math.max(0.0001, gain);
}

function applyMix(immediate = false) {
  const ctx = context();

  if (
    !ctx ||
    !musicGain ||
    !musicFilter
  ) {
    return;
  }

  const now = ctx.currentTime;
  const ramp = immediate ? 0.01 : 0.32;

  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setTargetAtTime(
    targetGain(),
    now,
    ramp / 3
  );

  musicFilter.frequency.cancelScheduledValues(now);
  musicFilter.frequency.setTargetAtTime(
    targetCutoff(),
    now,
    ramp / 3
  );
}

async function resumeContext() {
  const ctx = context();

  if (
    ctx &&
    ctx.state === "suspended"
  ) {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

async function tryPlay() {
  if (
    !state.enabled ||
    !musicElement
  ) {
    return false;
  }

  await resumeContext();

  try {
    await musicElement.play();
    state.hasTrack = true;
    emit();
    return true;
  } catch {
    return false;
  }
}

function voiceTone({
  frequency = 300,
  duration = 0.035,
  volume = 0.016,
  type = "triangle",
}) {
  const ctx = context();
  if (!ctx) return;

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(
    frequency,
    now
  );

  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(
      70,
      frequency * 0.94
    ),
    now + duration
  );

  gain.gain.setValueAtTime(
    0.0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    volume,
    now + 0.006
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(
    now + duration + 0.01
  );
}

function blipPreset(expression) {
  switch (expression) {
    case "hype":
      return {
        base: 425,
        spread: 80,
        duration: 0.027,
        volume: 0.018,
        type: "triangle",
      };

    case "sharp":
      return {
        base: 245,
        spread: 32,
        duration: 0.026,
        volume: 0.015,
        type: "square",
      };

    case "soft":
      return {
        base: 305,
        spread: 35,
        duration: 0.043,
        volume: 0.012,
        type: "sine",
      };

    case "laugh":
      return {
        base: 365,
        spread: 75,
        duration: 0.029,
        volume: 0.017,
        type: "triangle",
      };

    case "dry":
      return {
        base: 265,
        spread: 22,
        duration: 0.03,
        volume: 0.012,
        type: "triangle",
      };

    default:
      return {
        base: 330,
        spread: 48,
        duration: 0.032,
        volume: 0.014,
        type: "triangle",
      };
  }
}

loadSettings();

export const zeroAudio = {
  subscribe(listener) {
    listeners.add(listener);
    listener({ ...state });

    return () => {
      listeners.delete(listener);
    };
  },

  getState() {
    return { ...state };
  },

  getThemeUrl() {
    return HOME_PLAYLIST[0].url;
  },

  getMode() {
    return state.mode;
  },

  async setMode(mode = "home") {
    const nextMode = mode === "arcade" ? "arcade" : "home";
    if (state.mode === nextMode && currentTrack) return;

    state.mode = nextMode;
    emit();
    if (!ensureGraph()) return;

    const ctx = context();
    const now = ctx?.currentTime || 0;
    if (musicGain && ctx) {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setTargetAtTime(0.0001, now, 0.12);
    }

    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(async () => {
      setTrack(shuffledCandidate(nextMode), { autoplay: false });
      applyMix();
      if (state.enabled) await tryPlay();
    }, 420);
  },

  next() {
    if (!ensureGraph()) return;
    nextTrack();
  },

  async init() {
    if (initialized) {
      return { ...state };
    }

    initialized = true;
    ensureGraph();
    emit();

    return { ...state };
  },

  async unlock() {
    ensureGraph();
    await resumeContext();

    if (state.enabled) {
      await tryPlay();
    }
  },

  async toggle() {
    state.enabled = !state.enabled;

    saveSettings();
    applyMix();
    emit();

    if (state.enabled) {
      await this.unlock();
    } else if (musicElement) {
      musicElement.pause();
    }

    return state.enabled;
  },

  async setEnabled(enabled) {
    state.enabled = Boolean(enabled);

    saveSettings();
    applyMix();
    emit();

    if (state.enabled) {
      await this.unlock();
    } else if (musicElement) {
      musicElement.pause();
    }
  },

  setVolume(volume) {
    state.volume = Math.max(
      0,
      Math.min(
        1,
        Number(volume || 0)
      )
    );

    saveSettings();
    applyMix();
    emit();
  },

  setMuffled(muffled) {
    state.muffled = Boolean(muffled);
    applyMix();
    emit();
  },

  setSpeaking(speaking) {
    state.speaking = Boolean(speaking);
    applyMix();
    emit();
  },

  voiceBlip(
    expression = "normal",
    character = ""
  ) {
    if (
      !character ||
      /\s/.test(character) ||
      /[.,!?;:'"()\-]/.test(character)
    ) {
      return;
    }

    const preset =
      blipPreset(expression);

    const frequency =
      preset.base +
      (Math.random() - 0.5) *
        preset.spread;

    voiceTone({
      frequency,
      duration: preset.duration,
      volume: preset.volume,
      type: preset.type,
    });
  },
};
