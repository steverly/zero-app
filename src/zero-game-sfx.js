let sharedContext = null;

function ctx() {
  if (sharedContext) return sharedContext;

  try {
    sharedContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    return sharedContext;
  } catch {
    return null;
  }
}

function tone({
  frequency = 440,
  endFrequency = frequency,
  duration = 0.08,
  volume = 0.05,
  type = "sine",
  delay = 0,
}) {
  const audio = ctx();
  if (!audio) return;

  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(20, endFrequency),
    start + duration
  );

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.001, volume),
    start + 0.008
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const gameSfx = {
  tap() {
    tone({
      frequency: 480,
      endFrequency: 620,
      duration: 0.045,
      volume: 0.028,
      type: "triangle",
    });
  },

  soft() {
    tone({
      frequency: 360,
      endFrequency: 440,
      duration: 0.08,
      volume: 0.022,
      type: "sine",
    });
  },

  piece() {
    tone({
      frequency: 560,
      endFrequency: 780,
      duration: 0.075,
      volume: 0.035,
      type: "sine",
    });
  },

  coin() {
    tone({
      frequency: 820,
      endFrequency: 1180,
      duration: 0.075,
      volume: 0.04,
      type: "sine",
    });

    tone({
      frequency: 1180,
      endFrequency: 1500,
      duration: 0.09,
      volume: 0.025,
      type: "triangle",
      delay: 0.055,
    });
  },

  win() {
    tone({
      frequency: 520,
      endFrequency: 720,
      duration: 0.12,
      volume: 0.038,
      type: "triangle",
    });

    tone({
      frequency: 720,
      endFrequency: 980,
      duration: 0.16,
      volume: 0.034,
      type: "triangle",
      delay: 0.09,
    });

    tone({
      frequency: 980,
      endFrequency: 1280,
      duration: 0.2,
      volume: 0.028,
      type: "sine",
      delay: 0.19,
    });
  },

  lose() {
    tone({
      frequency: 430,
      endFrequency: 260,
      duration: 0.17,
      volume: 0.025,
      type: "triangle",
    });
  },

  unlock() {
    tone({
      frequency: 420,
      endFrequency: 900,
      duration: 0.2,
      volume: 0.035,
      type: "sine",
    });

    tone({
      frequency: 900,
      endFrequency: 1260,
      duration: 0.18,
      volume: 0.025,
      type: "triangle",
      delay: 0.11,
    });
  },

  buy() {
    this.coin();

    tone({
      frequency: 620,
      endFrequency: 850,
      duration: 0.11,
      volume: 0.025,
      type: "sine",
      delay: 0.13,
    });
  },

  error() {
    tone({
      frequency: 190,
      endFrequency: 160,
      duration: 0.09,
      volume: 0.024,
      type: "square",
    });
  },

  ready() {
    tone({
      frequency: 320,
      endFrequency: 420,
      duration: 0.08,
      volume: 0.022,
      type: "triangle",
    });
  },

  go() {
    tone({
      frequency: 680,
      endFrequency: 1060,
      duration: 0.11,
      volume: 0.042,
      type: "triangle",
    });
  },
};
