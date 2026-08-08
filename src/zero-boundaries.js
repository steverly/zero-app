const KEY = "zero_boundary_state_v2";

const DEFAULT = {
  mode: "normal", // normal | cold | away | wary
  pressure: 0,
  consecutive: 0,
  awaySince: 0,
  awayUntil: 0,
  severity: 0,
  ignoredWhileAway: 0,
  apologyAttempts: 0,
  reconciliationStage: 0, // 0 none, 1 "are you sure?", 2 accelerating
  accelerating: false,
  lastDisrespectAt: 0,
};

const clamp = (n, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(n) || 0));

export function loadBoundaryState() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(KEY) || "null"
      );

    return saved
      ? { ...DEFAULT, ...saved }
      : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveBoundaryState(state) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(state)
    );
  } catch {
    // ignore
  }
}

export function obviousApology(text = "") {
  const t =
    String(text)
      .toLowerCase()
      .trim();

  return /(désol|desol|pardon|excuse|my bad|sorry|maaf|ampun)/i.test(t);
}

function strongConfirmation(text = "") {
  const t =
    String(text)
      .toLowerCase()
      .trim();

  // Confirmation can be another proper apology OR explicit ownership.
  const ownsIt =
    /(vraiment|sérieux|serieux|promis|j'abuse|j ai abus|j'ai abusé|je reconnais|c'était nul|c etait nul|je le pense|for real|I mean it|promise|I was wrong|my fault|seriously|beneran|serius|janji|gue salah|aku salah)/i.test(t);

  const apology =
    obviousApology(t);

  return (
    (apology && t.length >= 10) ||
    ownsIt
  );
}

export function updateBoundaryFromSignals(
  previous,
  {
    disrespect = 0,
    interactionQuality = 0.4,
    humor = 0.1,
  } = {}
) {
  const now = Date.now();

  const d =
    clamp(disrespect);

  const q =
    clamp(interactionQuality);

  const h =
    clamp(humor);

  // Friendly banter should not trip the block system.
  const banterRelief =
    h > 0.58 && q > 0.42
      ? 0.28
      : h > 0.42 && q > 0.55
        ? 0.14
        : 0;

  const effective =
    clamp(d - banterRelief);

  const previousConsecutive =
    Number(previous.consecutive || 0);

  const consecutive =
    effective > 0.58
      ? previousConsecutive + 1
      : effective > 0.38
        ? Math.max(
            1,
            previousConsecutive
          )
        : 0;

  const pressure =
    Math.max(
      0,
      Number(previous.pressure || 0) *
        0.82 +
        effective * 0.64 -
        q * 0.08
    );

  let mode =
    previous.mode || "normal";

  let awaySince =
    Number(previous.awaySince || 0);

  let awayUntil =
    Number(previous.awayUntil || 0);

  let severity =
    Number(previous.severity || 0);

  if (mode !== "away") {
    // Important: Zero remains verbally responsive for the first
    // two real hostile turns. The application blocks around #3.
    const shouldLeave =
      consecutive >= 3 &&
      (
        effective > 0.60 ||
        pressure > 0.72
      );

    if (shouldLeave) {
      severity =
        clamp(
          0.48 +
          pressure * 0.30 +
          consecutive * 0.055
        );

      const blockMs =
        22_000 +
        Math.round(
          severity * 24_000
        );

      awaySince = now;
      awayUntil =
        now + blockMs;

      mode = "away";
    } else if (
      consecutive >= 2 ||
      pressure > 0.50
    ) {
      mode = "cold";
    } else if (
      mode === "cold" &&
      pressure < 0.25
    ) {
      mode = "normal";
    }
  }

  return {
    ...previous,
    mode,
    pressure,
    consecutive,
    awaySince,
    awayUntil,
    severity,
    accelerating: false,
    reconciliationStage:
      mode === "away"
        ? previous.reconciliationStage || 0
        : 0,
    lastDisrespectAt:
      effective > 0.38
        ? now
        : previous.lastDisrespectAt,
  };
}

const COPY = {
  fr: {
    blocked: [
      "j'ai pas envie de t'écouter faire le mariole là. excuse-toi déjà",
      "nan là je te réponds pas normalement. commence par t'excuser",
      "tu veux que je revienne ? commence par reconnaître que t'abuses",
    ],
    sure: [
      "t'es sûr ? genre vraiment",
      "tu le penses vraiment ou tu dis ça juste pour que je revienne ?",
      "hm. t'es vraiment désolé ?",
    ],
    stillWaiting: [
      "j'ai entendu. mais laisse-moi encore un peu",
      "ok. j'ai vu. attends encore",
      "je te crois peut-être. laisse-moi deux sec",
    ],
    accept: [
      "ok vas-y",
      "bon. vas-y",
      "ok c'est bon",
    ],
  },

  en: {
    blocked: [
      "I'm not listening to you clown around like that. apologize first",
      "nah I'm not answering normally. start with an apology",
      "you want me back? own that you were doing too much first",
    ],
    sure: [
      "you sure? like actually",
      "do you mean it or are you just saying that so I come back?",
      "hm. are you actually sorry?",
    ],
    stillWaiting: [
      "I heard you. give me a little longer",
      "okay. I saw it. wait a bit",
      "maybe I believe you. give me a sec",
    ],
    accept: [
      "alright fine",
      "okay. we're good",
      "yeah alright",
    ],
  },

  id: {
    blocked: [
      "gue nggak mau denger lu sok-sokan gitu. minta maaf dulu",
      "nah gue nggak bakal jawab normal. minta maaf dulu",
      "mau gue balik? ngaku dulu lu kelewatan",
    ],
    sure: [
      "yakin? beneran?",
      "lu beneran maksud atau cuma biar gue balik?",
      "hmm. beneran minta maaf?",
    ],
    stillWaiting: [
      "gue denger. tapi tunggu bentar lagi",
      "oke gue lihat. bentar dulu",
      "mungkin gue percaya. kasih gue waktu dikit",
    ],
    accept: [
      "yaudah oke",
      "oke. udah",
      "yaudah sini",
    ],
  },
};

function bank(language = "fr") {
  return COPY[language] || COPY.fr;
}

function pick(list) {
  return list[
    Math.floor(Math.random() * list.length)
  ];
}

export function attemptReconcile(
  previous,
  text,
  language = "fr"
) {
  const now =
    Date.now();

  const copy =
    bank(language);

  const remainingMs =
    Math.max(
      0,
      Number(previous.awayUntil || 0) -
        now
    );

  const apology =
    obviousApology(text);

  // Step 0: ordinary messages are not silently ignored.
  // Zero explicitly says the user is blocked and asks for an apology.
  if (
    Number(previous.reconciliationStage || 0) === 0
  ) {
    if (!apology) {
      const count =
        Number(
          previous.ignoredWhileAway || 0
        );

      return {
        accepted: false,
        accelerated: false,
        needsApology: true,
        remainingMs,
        state: {
          ...previous,
          ignoredWhileAway:
            count + 1,
        },
        line:
          copy.blocked[
            count %
            copy.blocked.length
          ],
      };
    }

    // First apology: Zero does not instantly forgive.
    return {
      accepted: false,
      accelerated: false,
      needsApology: false,
      asksConfirmation: true,
      remainingMs,
      state: {
        ...previous,
        apologyAttempts:
          Number(
            previous.apologyAttempts || 0
          ) + 1,
        reconciliationStage: 1,
      },
      line:
        pick(copy.sure),
    };
  }

  // Step 1: Zero asked "are you sure?".
  if (
    Number(previous.reconciliationStage || 0) === 1
  ) {
    const sincere =
      strongConfirmation(text);

    if (!sincere) {
      return {
        accepted: false,
        accelerated: false,
        needsApology: false,
        asksConfirmation: true,
        remainingMs,
        state: previous,
        line:
          language === "fr"
            ? "bah réponds-moi franchement"
            : language === "id"
              ? "jawab yang bener"
              : "then answer me properly",
      };
    }

    // A convincing confirmation makes Zero choose to cool down faster.
    // It still visibly finishes instead of teleporting to normal.
    const acceleratedMs =
      Math.min(
        Math.max(
          1800,
          remainingMs * 0.18
        ),
        4200
      );

    return {
      accepted: false,
      accelerated: true,
      needsApology: false,
      asksConfirmation: false,
      remainingMs:
        acceleratedMs,
      state: {
        ...previous,
        apologyAttempts:
          Number(
            previous.apologyAttempts || 0
          ) + 1,
        reconciliationStage: 2,
        accelerating: true,
        awayUntil:
          now + acceleratedMs,
      },
      line:
        pick(copy.accept),
    };
  }

  // Already accelerating: no need to nag.
  return {
    accepted: false,
    accelerated: true,
    needsApology: false,
    remainingMs,
    state: previous,
    line:
      remainingMs > 700
        ? ""
        : pick(copy.accept),
  };
}

export function finishReconciliation(
  previous
) {
  return {
    ...DEFAULT,
    mode: "wary",
    pressure: 0.12,
  };
}

export function departureLine(
  language = "fr",
  severity = 0.7
) {
  const lines = {
    fr:
      severity > 0.77
        ? [
            "bon dégage deux sec. tu fais le mariole depuis tout à l'heure, reviens quand tu seras calmé",
            "nan là ça me clc. va faire ton cinéma ailleurs et reviens quand t'es posé",
            "vas-y stop. tu cherches juste à faire chier là, reviens quand tu seras calmé",
          ]
        : [
            "bon vas-y dégage deux sec. reviens quand t'es posé",
            "nan là ça suffit. reviens quand t'auras arrêté de faire le mariole",
            "vas-y j'arrête là. reviens quand t'es calmé",
          ],

    en:
      severity > 0.77
        ? [
            "alright get out for a sec. you've been acting up, come back when you've cooled off",
            "nah I'm done with this. go do the clown act somewhere else and come back chill",
            "alright stop. you're just trying to annoy me now, come back when you're calm",
          ]
        : [
            "alright go away for a sec. come back chill",
            "nah that's enough. come back when you're done acting up",
            "I'm done for now. come back when you're calm",
          ],

    id:
      severity > 0.77
        ? [
            "udah sana bentar. dari tadi lu sok-sokan, balik kalau udah tenang",
            "nah gue capek. sono dulu terus balik kalau udah santai",
            "udah stop. lu cuma mau bikin kesel, balik kalau udah tenang",
          ]
        : [
            "udah sana bentar. balik kalau udah santai",
            "nah cukup. balik kalau udah berhenti sok-sokan",
            "gue stop dulu. balik kalau udah tenang",
          ],
  };

  return pick(
    lines[language] ||
    lines.fr
  );
}

export function boundarySnarkLine(
  language = "fr",
  consecutive = 1
) {
  const banks = {
    fr:
      consecutive >= 2
        ? [
            "t'es encore dessus mdrr commence pas à devenir lourd",
            "oe j'ai compris tu veux faire le mariole 😭",
            "tu forces un peu là par contre",
          ]
        : [
            "mdrr ça commence direct toi",
            "ah ouais t'es dans ce mood là",
            "oe tranquille le fou 😭",
          ],

    en:
      consecutive >= 2
        ? [
            "you're still on that lol don't start getting annoying",
            "yeah I get it you wanna act up 😭",
            "you're pushing it a bit now",
          ]
        : [
            "lol starting already?",
            "oh you're in that mood",
            "yeah relax psycho 😭",
          ],

    id:
      consecutive >= 2
        ? [
            "masih lanjut aja wkwk jangan mulai nyebelin",
            "iya iya gue ngerti lu mau sok-sokan 😭",
            "lu mulai maksa nih",
          ]
        : [
            "wkwk langsung mulai aja lu",
            "oh lagi mode begini",
            "iya santai orang gila 😭",
          ],
  };

  return pick(
    banks[language] ||
    banks.fr
  );
}
