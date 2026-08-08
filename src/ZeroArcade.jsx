import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ZERO_CONFIG } from "./zero-config";
import { hasArcadePass } from "./zero-economy";
import { hasWalletArcadePass } from "./zero-wallet";
import { gameSfx } from "./zero-game-sfx";
import { getZeroCopy } from "./zero-i18n";

const pick = (items) =>
  items[Math.floor(Math.random() * items.length)];

function ZeroLine({ children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={children}
        className="zero-arcade-line"
        initial={{ opacity: 0, y: 7, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{
          duration: 0.24,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function gameSkill(relationship, gameId) {
  const stats =
    relationship?.gameProfile?.gameResults?.[gameId] || {};

  const played = Number(stats.played || 0);
  const wins = Number(stats.wins || 0);
  const losses = Number(stats.losses || 0);
  const draws = Number(stats.draws || 0);

  const resolved =
    Math.max(1, wins + losses + draws);

  const winRate =
    wins / resolved;

  // Zero learns quickly at first, then the curve stabilizes.
  // Winning pushes him up much faster; losing lets the player breathe.
  const experience =
    1 - Math.exp(-played / 8);

  const pressure =
    Math.max(
      0,
      Math.min(
        1,
        0.12 +
          experience * 0.42 +
          winRate * 0.48 -
          (losses > wins ? 0.08 : 0)
      )
    );

  return pressure;
}

function skillLabel(skill, language = "fr") {
  if (skill < 0.28) {
    return language === "id"
      ? "Zero lagi belajar"
      : language === "en"
        ? "Zero is learning"
        : "Zero apprend";
  }

  if (skill < 0.52) {
    return language === "id"
      ? "Zero mulai ngikutin kamu"
      : language === "en"
        ? "Zero is adapting"
        : "Zero s'adapte";
  }

  if (skill < 0.76) {
    return language === "id"
      ? "Zero serius sekarang"
      : language === "en"
        ? "Zero is serious now"
        : "Zero devient sérieux";
  }

  if (skill < 0.92) {
    return language === "id"
      ? "Zero udah baca ritmemu"
      : language === "en"
        ? "Zero knows your rhythm"
        : "Zero connaît ton rythme";
  }

  return language === "id"
    ? "Zero gila mode"
    : language === "en"
      ? "Zero is cracked"
      : "Zero est en mode monstre";
}

function AdaptiveBadge({ relationship, gameId, language }) {
  const skill = gameSkill(relationship, gameId);

  return (
    <div className="zero641-skill-badge">
      <span>{skillLabel(skill, language)}</span>
      <i>
        <b style={{ transform: `scaleX(${Math.max(0.08, skill)})` }} />
      </i>
    </div>
  );
}

function localComment(kind, relationship, language = "fr") {
  const familiar = Number(
    relationship?.traits?.familiarity || 0.08
  );

  const banks = {
    fr: {
      start: familiar > 0.35
        ? ["viens", "vas-y", "à toi", "..."]
        : ["ok", "vas-y", "..."],
      zeroWin: ["oe.", "celle-là je la garde", "trop tard 😭", "nan ça c'est pour moi", "... j'avais vu"],
      userWin: ["ok là t'as cuisiné", "j'ai rien dit.", "propre j'avoue", "ah ouais.", "bon. revanche mentale."],
      draw: ["égalité", "bon.", "on bouge pas"],
      fast: ["ah ouais", "propre", "rapide"],
      slow: ["j'ai eu le temps", "...", "tranquille"],
      early: ["trop tôt", "t'as sauté dessus", "... non"],
      think: ["...", "att", "je vois"],
    },

    en: {
      start: familiar > 0.35
        ? ["come on", "your turn", "go", "..."]
        : ["okay", "go", "..."],
      zeroWin: ["yeah.", "keeping that one", "too late 😭", "nah that's mine", "... saw it"],
      userWin: ["okay you cooked", "I said nothing.", "clean, fair", "oh damn.", "fine. mental rematch."],
      draw: ["draw", "well.", "still tied"],
      fast: ["okay damn", "clean", "fast"],
      slow: ["had time", "...", "taking it easy"],
      early: ["too early", "you jumped it", "... nope"],
      think: ["...", "wait", "I see it"],
    },

    id: {
      start: familiar > 0.35
        ? ["ayo", "giliran kamu", "gas", "..."]
        : ["oke", "ayo", "..."],
      zeroWin: ["iya.", "yang ini punyaku", "telat 😭", "nah ini gue ambil", "... udah keliatan"],
      userWin: ["oke jago juga", "gue diem.", "rapi sih", "buset.", "oke. rematch di kepala."],
      draw: ["seri", "hmm.", "masih sama"],
      fast: ["buset", "cepet juga", "rapi"],
      slow: ["sempet nunggu", "...", "santai banget"],
      early: ["kepagian", "langsung ditekan dong", "... nggak"],
      think: ["...", "bentar", "oh iya"],
    },
  };

  const lines = banks[language] || banks.fr;
  return pick(lines[kind] || ["..."]);
}

function getUnlocked(
  gameId,
  relationship,
  economy,
  wallet,
  isPremium
) {
  const config =
    ZERO_CONFIG.arcade.games[gameId];

  if (!config) return false;

  return (
    isPremium ||
    Number(relationship?.totalEnergy || 0) >=
      config.unlockEnergy ||
    hasArcadePass(economy) ||
    hasWalletArcadePass(wallet)
  );
}

// =====================================================
// MORPION
// =====================================================

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function tttWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }

  return board.every(Boolean)
    ? "draw"
    : null;
}

function minimax(board, maximizing) {
  const winner = tttWinner(board);

  if (winner === "Z") return 10;
  if (winner === "U") return -10;
  if (winner === "draw") return 0;

  const scores = [];

  for (let index = 0; index < 9; index += 1) {
    if (board[index]) continue;

    const next = [...board];
    next[index] = maximizing ? "Z" : "U";

    scores.push(
      minimax(next, !maximizing)
    );
  }

  return maximizing
    ? Math.max(...scores)
    : Math.min(...scores);
}

function zeroTttMove(board, relationship) {
  const skill =
    gameSkill(relationship, "tictactoe");

  const available = board
    .map((value, index) =>
      value ? null : index
    )
    .filter((value) => value !== null);

  const mistakeChance =
    Math.max(
      0.005,
      0.27 - skill * 0.29
    );

  if (Math.random() < mistakeChance) {
    return pick(available);
  }

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const index of available) {
    const next = [...board];
    next[index] = "Z";

    const score =
      minimax(next, false);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }

  return pick(bestMoves);
}

function TicTacToe({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [board, setBoard] =
    useState(Array(9).fill(""));

  const [turn, setTurn] =
    useState("U");

  const [line, setLine] =
    useState(() =>
      localComment("start", relationship, language)
    );

  const finishedRef = useRef(false);

  const result = tttWinner(board);

  useEffect(() => {
    if (!result || finishedRef.current) {
      return;
    }

    finishedRef.current = true;

    const mapped =
      result === "U"
        ? "win"
        : result === "Z"
          ? "loss"
          : "draw";

    setLine(
      localComment(
        mapped === "win"
          ? "userWin"
          : mapped === "loss"
            ? "zeroWin"
            : "draw",
        relationship,
        language
      )
    );

    onFinish({
      gameId: "tictactoe",
      result: mapped,
    });
  }, [result, onFinish, relationship]);

  useEffect(() => {
    if (turn !== "Z" || result) return;

    const timer = setTimeout(() => {
      const index =
        zeroTttMove(board, relationship);

      if (index === undefined) return;

      gameSfx.piece();

      setBoard((previous) => {
        const next = [...previous];
        next[index] = "Z";
        return next;
      });

      setTurn("U");
    }, 300 + Math.random() * 430);

    return () => clearTimeout(timer);
  }, [turn, board, relationship, result]);

  const play = (index) => {
    if (
      turn !== "U" ||
      board[index] ||
      result
    ) {
      return;
    }

    gameSfx.piece();

    const next = [...board];
    next[index] = "U";

    setBoard(next);
    setTurn("Z");
  };

  const restart = () => {
    gameSfx.tap();
    finishedRef.current = false;
    setBoard(Array(9).fill(""));
    setTurn("U");
    setLine(
      localComment("start", relationship, language)
    );
  };

  return (
    <div className="zero-game zero-game-ttt">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="tictactoe"
        language={language}
      />

      <div className="zero-ttt-board">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            onClick={() => play(index)}
          >
            {cell === "U" ? (
              <i className="user-mark" />
            ) : null}

            {cell === "Z" ? (
              <i className="zero-mark" />
            ) : null}
          </button>
        ))}
      </div>

      {result ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// PUISSANCE 4
// =====================================================

const ROWS = 6;
const COLS = 7;

function emptyConnect4() {
  return Array.from(
    { length: ROWS },
    () => Array(COLS).fill(0)
  );
}

function dropPiece(board, col, player) {
  const next =
    board.map((row) => [...row]);

  for (
    let row = ROWS - 1;
    row >= 0;
    row -= 1
  ) {
    if (!next[row][col]) {
      next[row][col] = player;
      return next;
    }
  }

  return null;
}

function c4Winner(board) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (
    let row = 0;
    row < ROWS;
    row += 1
  ) {
    for (
      let col = 0;
      col < COLS;
      col += 1
    ) {
      const player = board[row][col];

      if (!player) continue;

      for (const [dr, dc] of directions) {
        let count = 1;

        for (
          let step = 1;
          step < 4;
          step += 1
        ) {
          const r =
            row + dr * step;

          const c =
            col + dc * step;

          if (
            r < 0 ||
            r >= ROWS ||
            c < 0 ||
            c >= COLS ||
            board[r][c] !== player
          ) {
            break;
          }

          count += 1;
        }

        if (count >= 4) {
          return player;
        }
      }
    }
  }

  return board[0].every(Boolean)
    ? "draw"
    : null;
}

function availableColumns(board) {
  return Array.from(
    { length: COLS },
    (_, col) => col
  ).filter(
    (col) => board[0][col] === 0
  );
}

function zeroConnect4Move(
  board,
  relationship
) {
  const available =
    availableColumns(board);

  for (const col of available) {
    const next =
      dropPiece(board, col, 2);

    if (c4Winner(next) === 2) {
      return col;
    }
  }

  for (const col of available) {
    const next =
      dropPiece(board, col, 1);

    if (c4Winner(next) === 1) {
      return col;
    }
  }

  const skill =
    gameSkill(relationship, "connect4");

  const ordered =
    [3, 2, 4, 1, 5, 0, 6].filter(
      (col) => available.includes(col)
    );

  // Early Zero explores and makes human-like mistakes.
  // Strong Zero increasingly values centre control and safe columns.
  const top =
    skill > 0.88
      ? 1
      : skill > 0.62
        ? Math.min(2, ordered.length)
        : skill > 0.35
          ? Math.min(3, ordered.length)
          : Math.min(5, ordered.length);

  if (
    skill < 0.78 &&
    Math.random() < 0.2 - skill * 0.16
  ) {
    return pick(available);
  }

  return pick(ordered.slice(0, top));
}

function ConnectFour({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [board, setBoard] =
    useState(() => emptyConnect4());

  const [turn, setTurn] =
    useState(1);

  const [line, setLine] =
    useState(() =>
      localComment("start", relationship, language)
    );

  const finishedRef = useRef(false);

  const result = c4Winner(board);

  useEffect(() => {
    if (!result || finishedRef.current) {
      return;
    }

    finishedRef.current = true;

    const mapped =
      result === 1
        ? "win"
        : result === 2
          ? "loss"
          : "draw";

    setLine(
      localComment(
        mapped === "win"
          ? "userWin"
          : mapped === "loss"
            ? "zeroWin"
            : "draw",
        relationship,
        language
      )
    );

    onFinish({
      gameId: "connect4",
      result: mapped,
    });
  }, [result, onFinish, relationship]);

  useEffect(() => {
    if (turn !== 2 || result) return;

    const timer = setTimeout(() => {
      const col =
        zeroConnect4Move(
          board,
          relationship
        );

      if (col === undefined) return;

      gameSfx.piece();

      setBoard((previous) =>
        dropPiece(
          previous,
          col,
          2
        ) || previous
      );

      setTurn(1);
    }, 380 + Math.random() * 450);

    return () => clearTimeout(timer);
  }, [turn, board, relationship, result]);

  const play = (col) => {
    if (turn !== 1 || result) return;

    const next =
      dropPiece(board, col, 1);

    if (!next) return;

    gameSfx.piece();
    setBoard(next);
    setTurn(2);
  };

  const restart = () => {
    gameSfx.tap();
    finishedRef.current = false;
    setBoard(emptyConnect4());
    setTurn(1);
    setLine(
      localComment("start", relationship, language)
    );
  };

  return (
    <div className="zero-game zero-game-c4">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="connect4"
        language={language}
      />

      <div className="zero-c4-board">
        {board.map(
          (row, rowIndex) =>
            row.map(
              (cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() =>
                    play(colIndex)
                  }
                >
                  {cell ? (
                    <i
                      className={
                        cell === 1
                          ? "user-piece"
                          : "zero-piece"
                      }
                    />
                  ) : null}
                </button>
              )
            )
        )}
      </div>

      {result ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// RÉFLEXES
// =====================================================

function ReflexGame({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [state, setState] =
    useState("idle");

  const [line, setLine] =
    useState(copy.arcade.touchWhenGo);

  const [reaction, setReaction] =
    useState(0);

  const skill =
    gameSkill(relationship, "reflex");

  const learnedReaction =
    Number(
      relationship?.gameProfile?.gameResults?.reflex
        ?.avgReactionMs || 330
    );

  // Zero's bar moves toward the player's actual level.
  // At high mastery the player has to beat their own learned pace.
  const targetMs =
    Math.max(
      145,
      Math.round(
        learnedReaction *
          (1.12 - skill * 0.25)
      )
    );

  const startAtRef = useRef(0);
  const timerRef = useRef(null);

  const start = () => {
    clearTimeout(timerRef.current);

    gameSfx.ready();
    setReaction(0);
    setState("waiting");
    setLine("...");

    timerRef.current =
      setTimeout(() => {
        startAtRef.current =
          performance.now();

        gameSfx.go();
        setState("go");
        setLine("!");
      }, 900 + Math.random() * 2400);
  };

  useEffect(() => {
    return () =>
      clearTimeout(timerRef.current);
  }, []);

  const hit = () => {
    if (state === "waiting") {
      clearTimeout(timerRef.current);

      gameSfx.error();
      setState("early");
      setLine(
        localComment(
          "early",
        relationship,
        language
      )
      );

      onFinish({
        gameId: "reflex",
        result: "loss",
        reactionMs: 0,
      });

      return;
    }

    if (state !== "go") {
      start();
      return;
    }

    const ms = Math.round(
      performance.now() -
        startAtRef.current
    );

    setReaction(ms);
    setState("done");

    const kind =
      ms < 240
        ? "fast"
        : ms > 430
          ? "slow"
          : "think";

    setLine(
      localComment(kind, relationship, language)
    );

    onFinish({
      gameId: "reflex",
      result:
        ms <= targetMs
          ? "win"
          : "loss",
      reactionMs: ms,
    });
  };

  return (
    <div className="zero-game zero-game-reflex">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="reflex"
        language={language}
      />
      <small className="zero641-target">
        {language === "id"
          ? `target ${targetMs} ms`
          : language === "en"
            ? `target ${targetMs} ms`
            : `objectif ${targetMs} ms`}
      </small>

      <button
        type="button"
        className={[
          "zero-reflex-pad",
          `is-${state}`,
        ].join(" ")}
        onClick={hit}
      >
        {state === "idle" ? copy.arcade.ready : null}
        {state === "waiting" ? "..." : null}
        {state === "go" ? "GO" : null}
        {state === "done"
          ? `${reaction} ms`
          : null}
        {state === "early" ? "..." : null}
      </button>

      {state === "done" ||
      state === "early" ? (
        <GameAgain onClick={start} />
      ) : null}
    </div>
  );
}

// =====================================================
// PIERRE FEUILLE CISEAUX
// =====================================================

const RPS = [
  ["rock", "pierre", "●"],
  ["paper", "feuille", "▰"],
  ["scissors", "ciseaux", "✦"],
];

function rpsResult(user, zero) {
  if (user === zero) return "draw";

  const wins = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  return wins[user] === zero
    ? "win"
    : "loss";
}

function RpsGame({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [userChoice, setUserChoice] =
    useState("");

  const [zeroChoice, setZeroChoice] =
    useState("");

  const [line, setLine] =
    useState(copy.arcade.select);

  const play = (choice) => {
    if (userChoice) return;

    gameSfx.tap();

    const zero =
      pick(RPS)[0];

    const result =
      rpsResult(choice, zero);

    setUserChoice(choice);

    window.setTimeout(() => {
      setZeroChoice(zero);

      setLine(
        localComment(
          result === "win"
            ? "userWin"
            : result === "loss"
              ? "zeroWin"
              : "draw",
        relationship,
        language
      )
      );

      onFinish({
        gameId: "rps",
        result,
      });
    }, 430);
  };

  const restart = () => {
    gameSfx.tap();
    setUserChoice("");
    setZeroChoice("");
    setLine(copy.arcade.select);
  };

  return (
    <div className="zero-game zero-game-rps">
      <ZeroLine>{line}</ZeroLine>

      <div className="zero-rps-versus">
        <div>
          <small>{copy.arcade.you}</small>
          <strong>
            {RPS.find(
              ([id]) => id === userChoice
            )?.[2] || "?"}
          </strong>
        </div>

        <span>VS</span>

        <div className="is-zero">
          <small>Zero</small>
          <strong>
            {zeroChoice
              ? RPS.find(
                  ([id]) =>
                    id === zeroChoice
                )?.[2]
              : userChoice
                ? "..."
                : "?"}
          </strong>
        </div>
      </div>

      {!userChoice ? (
        <div className="zero-rps-choices">
          {RPS.map(
            ([id, label, symbol]) => (
              <motion.button
                key={id}
                type="button"
                onClick={() => play(id)}
                whileTap={{ scale: 0.92 }}
              >
                <strong>{symbol}</strong>
                <small>
                  {language === "id"
                    ? id === "rock"
                      ? "batu"
                      : id === "paper"
                        ? "kertas"
                        : "gunting"
                    : language === "en"
                      ? id
                      : label}
                </small>
              </motion.button>
            )
          )}
        </div>
      ) : zeroChoice ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// MÉMOIRE DUEL
// =====================================================

const MEMORY_SYMBOLS =
  ["◆", "●", "✦", "▲", "■", "✚"];

function shuffle(items) {
  const next = [...items];

  for (
    let i = next.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [next[i], next[j]] =
      [next[j], next[i]];
  }

  return next;
}

function createMemoryDeck() {
  return shuffle(
    MEMORY_SYMBOLS.flatMap(
      (symbol, index) => [
        {
          id: `${index}-a`,
          symbol,
          matched: false,
        },
        {
          id: `${index}-b`,
          symbol,
          matched: false,
        },
      ]
    )
  );
}

function MemoryDuel({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [deck, setDeck] =
    useState(() => createMemoryDeck());

  const [open, setOpen] =
    useState([]);

  const [turn, setTurn] =
    useState("user");

  const [score, setScore] =
    useState({
      user: 0,
      zero: 0,
    });

  const [line, setLine] =
    useState(() => language === "id" ? "giliran kamu" : language === "en" ? "your turn" : "à toi");

  const seenRef = useRef({});
  const finishedRef = useRef(false);

  const matchedCount =
    deck.filter(
      (card) => card.matched
    ).length;

  useEffect(() => {
    if (
      matchedCount !== deck.length ||
      finishedRef.current
    ) {
      return;
    }

    finishedRef.current = true;

    const result =
      score.user > score.zero
        ? "win"
        : score.user < score.zero
          ? "loss"
          : "draw";

    setLine(
      localComment(
        result === "win"
          ? "userWin"
          : result === "loss"
            ? "zeroWin"
            : "draw",
        relationship,
        language
      )
    );

    onFinish({
      gameId: "memory",
      result,
    });
  }, [
    matchedCount,
    deck.length,
    score,
    relationship,
    onFinish,
  ]);

  const resolvePair = (
    first,
    second,
    owner
  ) => {
    const same =
      deck[first].symbol ===
      deck[second].symbol;

    window.setTimeout(() => {
      if (same) {
        gameSfx.piece();

        setDeck((previous) =>
          previous.map(
            (card, index) =>
              index === first ||
              index === second
                ? {
                    ...card,
                    matched: true,
                  }
                : card
          )
        );

        setScore((previous) => ({
          ...previous,
          [owner]:
            previous[owner] + 1,
        }));

        setOpen([]);

        if (owner === "user") {
          setLine("encore");
        } else {
          setLine("j'garde");
        }
      } else {
        setOpen([]);

        setTurn(
          owner === "user"
            ? "zero"
            : "user"
        );

        setLine(
          owner === "user"
            ? "à moi"
            : "à toi"
        );
      }
    }, 620);
  };

  const flip = (index) => {
    if (
      turn !== "user" ||
      open.length >= 2 ||
      deck[index].matched ||
      open.includes(index)
    ) {
      return;
    }

    gameSfx.soft();

    seenRef.current[index] =
      deck[index].symbol;

    const next = [...open, index];
    setOpen(next);

    if (next.length === 2) {
      resolvePair(
        next[0],
        next[1],
        "user"
      );
    }
  };

  useEffect(() => {
    if (
      turn !== "zero" ||
      open.length
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        const available = deck
          .map((card, index) =>
            card.matched ? null : index
          )
          .filter(
            (index) => index !== null
          );

        const pairs = {};

        for (
          const [rawIndex, symbol]
          of Object.entries(
            seenRef.current
          )
        ) {
          const index =
            Number(rawIndex);

          if (
            deck[index]?.matched ||
            !available.includes(index)
          ) {
            continue;
          }

          if (!pairs[symbol]) {
            pairs[symbol] = [];
          }

          pairs[symbol].push(index);
        }

        const knownPair =
          Object.values(pairs)
            .find(
              (indexes) =>
                indexes.length >= 2
            );

        let first;
        let second;

        if (
          knownPair &&
          Math.random() <
            0.62 +
              Number(
                relationship?.traits
                  ?.familiarity || 0
              ) *
                0.2
        ) {
          [first, second] =
            knownPair;
        } else {
          first = pick(available);

          const rest =
            available.filter(
              (index) =>
                index !== first
            );

          second = pick(rest);
        }

        seenRef.current[first] =
          deck[first].symbol;

        seenRef.current[second] =
          deck[second].symbol;

        setOpen([first]);

        window.setTimeout(() => {
          setOpen([first, second]);

          resolvePair(
            first,
            second,
            "zero"
          );
        }, 420);
      }, 520);

    return () =>
      window.clearTimeout(timer);
  }, [
    turn,
    open.length,
    deck,
    relationship,
  ]);

  const restart = () => {
    gameSfx.tap();
    finishedRef.current = false;
    seenRef.current = {};
    setDeck(createMemoryDeck());
    setOpen([]);
    setTurn("user");
    setScore({
      user: 0,
      zero: 0,
    });
    setLine(language === "id" ? "giliran kamu" : language === "en" ? "your turn" : "à toi");
  };

  return (
    <div className="zero-game zero-game-memory">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="memory"
        language={language}
      />

      <div className="zero-memory-score">
        <span>
          {copy.arcade.you} <strong>{score.user}</strong>
        </span>

        <span>
          Zero <strong>{score.zero}</strong>
        </span>
      </div>

      <div className="zero-memory-grid">
        {deck.map((card, index) => {
          const visible =
            open.includes(index) ||
            card.matched;

          return (
            <motion.button
              key={card.id}
              type="button"
              className={[
                visible
                  ? "is-open"
                  : "",
                card.matched
                  ? "is-matched"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => flip(index)}
              whileTap={{ scale: 0.94 }}
            >
              <motion.span
                animate={{
                  rotateY:
                    visible ? 0 : 180,
                  scale:
                    card.matched
                      ? 0.94
                      : 1,
                }}
              >
                {visible
                  ? card.symbol
                  : ""}
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {matchedCount === deck.length ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// TAP DUEL
// =====================================================

function TapDuel({
  relationship,
  onFinish,
  language = "fr",
}) {
  const skill =
    gameSkill(relationship, "tapduel");

  const target =
    skill > 0.88
      ? 32
      : skill > 0.62
        ? 26
        : 20;

  const copy = {
    fr: {
      ready: "20 taps. premier arrivé.",
      tap: "TAP",
      you: "toi",
      zero: "Zero",
      again: "encore",
    },
    en: {
      ready: "20 taps. first one there.",
      tap: "TAP",
      you: "you",
      zero: "Zero",
      again: "again",
    },
    id: {
      ready: "20 tap. siapa duluan.",
      tap: "TAP",
      you: "kamu",
      zero: "Zero",
      again: "lagi",
    },
  }[language] || {
    ready: "20 taps. premier arrivé.",
    tap: "TAP",
    you: "toi",
    zero: "Zero",
    again: "encore",
  };

  const [userScore, setUserScore] = useState(0);
  const [zeroScore, setZeroScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [line, setLine] = useState(copy.ready);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!started || done) return;

    // Starts intentionally beatable.
    // If the player keeps winning, Zero can eventually reach
    // genuinely nasty tapping speeds.
    const intervalMs =
      Math.max(
        62,
        205 - skill * 143
      );

    const timer = window.setInterval(() => {
      setZeroScore((previous) => {
        if (previous >= target - 1) {
          return target;
        }

        // At elite level Zero occasionally bursts two taps.
        const burst =
          skill > 0.9 &&
          Math.random() < 0.13
            ? 2
            : 1;

        return Math.min(
          target,
          previous + burst
        );
      });
    }, intervalMs + Math.random() * (34 - skill * 22));

    return () => window.clearInterval(timer);
  }, [started, done, relationship]);

  useEffect(() => {
    if (finishedRef.current) return;

    if (userScore >= target) {
      finishedRef.current = true;
      setDone(true);
      setLine(
        localComment(
          "userWin",
          relationship,
          language
        )
      );
      onFinish({
        gameId: "tapduel",
        result: "win",
      });
      return;
    }

    if (zeroScore >= target) {
      finishedRef.current = true;
      setDone(true);
      setLine(
        localComment(
          "zeroWin",
          relationship,
          language
        )
      );
      onFinish({
        gameId: "tapduel",
        result: "loss",
      });
    }
  }, [
    userScore,
    zeroScore,
    relationship,
    language,
    onFinish,
  ]);

  const tap = () => {
    if (done) return;

    if (!started) {
      setStarted(true);
      setLine("...");
    }

    gameSfx.tap();

    setUserScore((previous) =>
      Math.min(target, previous + 1)
    );
  };

  const restart = () => {
    gameSfx.soft();
    finishedRef.current = false;
    setUserScore(0);
    setZeroScore(0);
    setStarted(false);
    setDone(false);
    setLine(copy.ready);
  };

  return (
    <div className="zero-game zero-game-tapduel">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="tapduel"
        language={language}
      />

      <div className="zero63-tap-race">
        <div className="zero63-tap-score">
          <span>
            <small>{copy.you}</small>
            <strong>{userScore}</strong>
          </span>

          <i>{target}</i>

          <span className="is-zero">
            <small>{copy.zero}</small>
            <strong>{zeroScore}</strong>
          </span>
        </div>

        <div className="zero63-tap-bars">
          <div>
            <motion.i
              animate={{
                scaleX:
                  Math.min(1, userScore / target),
              }}
            />
          </div>

          <div className="is-zero">
            <motion.i
              animate={{
                scaleX:
                  Math.min(1, zeroScore / target),
              }}
            />
          </div>
        </div>

        <motion.button
          type="button"
          className="zero63-tap-button"
          onClick={tap}
          disabled={done}
          whileTap={{ scale: 0.93 }}
        >
          {copy.tap}
        </motion.button>
      </div>

      {done ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// NOMBRE SECRET
// =====================================================

function SecretNumber({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const skill =
    gameSkill(relationship, "secret");

  const secretMax =
    skill > 0.78
      ? 60
      : skill > 0.46
        ? 35
        : 20;

  const maxTries =
    skill > 0.78
      ? 6
      : skill > 0.46
        ? 6
        : 7;

  const makeSecret = () =>
    Math.floor(Math.random() * secretMax) + 1;

  const [secret, setSecret] =
    useState(makeSecret);

  const [guess, setGuess] =
    useState(() => Math.ceil(secretMax / 2));

  const [tries, setTries] =
    useState(0);

  const [done, setDone] =
    useState(false);

  const [line, setLine] =
    useState(copy.arcade.secretRange);

  const submit = () => {
    if (done) return;

    gameSfx.tap();

    const nextTries =
      tries + 1;

    setTries(nextTries);

    if (guess === secret) {
      setDone(true);
      setLine("oe");

      onFinish({
        gameId: "secret",
        result:
          nextTries <= 4
            ? "win"
            : "draw",
      });

      return;
    }

    if (nextTries >= maxTries) {
      setDone(true);
      setLine(`${secret}.`);

      onFinish({
        gameId: "secret",
        result: "loss",
      });

      return;
    }

    setLine(
      guess < secret
        ? copy.arcade.higher
        : copy.arcade.lower
    );
  };

  const restart = () => {
    gameSfx.tap();
    setSecret(makeSecret());
    setGuess(Math.ceil(secretMax / 2));
    setTries(0);
    setDone(false);
    setLine(copy.arcade.secretRange);
  };

  return (
    <div className="zero-game zero-game-secret">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="secret"
        language={language}
      />

      <div className="zero-secret-stage">
        <div className="zero-secret-eye">
          <i />
          <i />
        </div>

        <motion.strong
          key={guess}
          initial={{
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          {guess}
        </motion.strong>

        <input
          type="range"
          min="1"
          max={secretMax}
          value={guess}
          disabled={done}
          onChange={(event) => {
            gameSfx.soft();
            setGuess(
              Number(event.target.value)
            );
          }}
        />

        <small>
          {tries}/{maxTries} {copy.arcade.attempts}
        </small>
      </div>

      {!done ? (
        <button
          type="button"
          className="zero-game-primary"
          onClick={submit}
        >
          tenter
        </button>
      ) : (
        <GameAgain onClick={restart} />
      )}
    </div>
  );
}

// =====================================================
// CODEBREAKER
// =====================================================

const CODE_SYMBOLS =
  ["◆", "●", "▲", "■"];

function makeCode(length = 3) {
  return Array.from(
    { length },
    () => pick(CODE_SYMBOLS)
  );
}

function Codebreaker({
  relationship,
  onFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const skill =
    gameSkill(relationship, "codebreaker");

  const codeLength =
    skill > 0.72 ? 4 : 3;

  const maxAttempts =
    codeLength === 4 ? 8 : 7;

  const freshGuess = () =>
    Array(codeLength).fill("◆");

  const [secret, setSecret] =
    useState(() => makeCode(codeLength));

  const [guess, setGuess] =
    useState(freshGuess);

  const [history, setHistory] =
    useState([]);

  const [done, setDone] =
    useState(false);

  const [line, setLine] =
    useState(copy.arcade.findCode);

  const cycle = (index) => {
    if (done) return;

    gameSfx.soft();

    const current =
      CODE_SYMBOLS.indexOf(
        guess[index]
      );

    const next = [...guess];

    next[index] =
      CODE_SYMBOLS[
        (current + 1) %
          CODE_SYMBOLS.length
      ];

    setGuess(next);
  };

  const submit = () => {
    if (done) return;

    gameSfx.tap();

    const exact =
      guess.filter(
        (value, index) =>
          value === secret[index]
      ).length;

    const nextHistory = [
      ...history,
      {
        guess: [...guess],
        exact,
      },
    ];

    setHistory(nextHistory);

    if (exact === codeLength) {
      setDone(true);
      setLine("bien vu");

      onFinish({
        gameId: "codebreaker",
        result:
          nextHistory.length <= 4
            ? "win"
            : "draw",
      });

      return;
    }

    if (nextHistory.length >= maxAttempts) {
      setDone(true);
      setLine(
        secret.join(" ")
      );

      onFinish({
        gameId: "codebreaker",
        result: "loss",
      });

      return;
    }

    setLine(
      `${exact} bien placé${
        exact > 1 ? "s" : ""
      }`
    );
  };

  const restart = () => {
    gameSfx.tap();
    setSecret(makeCode(codeLength));
    setGuess(freshGuess());
    setHistory([]);
    setDone(false);
    setLine(copy.arcade.findCode);
  };

  return (
    <div className="zero-game zero-game-code">
      <ZeroLine>{line}</ZeroLine>
      <AdaptiveBadge
        relationship={relationship}
        gameId="codebreaker"
        language={language}
      />

      <div className="zero-code-input">
        {guess.map(
          (symbol, index) => (
            <motion.button
              key={index}
              type="button"
              onClick={() => cycle(index)}
              whileTap={{
                scale: 0.9,
              }}
            >
              {symbol}
            </motion.button>
          )
        )}
      </div>

      <button
        type="button"
        className="zero-game-primary"
        disabled={done}
        onClick={submit}
      >
        tester
      </button>

      <div className="zero-code-history">
        {history
          .slice(-5)
          .reverse()
          .map((entry, index) => (
            <motion.div
              key={`${history.length}-${index}`}
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <span>
                {entry.guess.join(" ")}
              </span>

              <strong>
                {entry.exact}/{codeLength}
              </strong>
            </motion.div>
          ))}
      </div>

      {done ? (
        <GameAgain onClick={restart} />
      ) : null}
    </div>
  );
}

// =====================================================
// SHARED
// =====================================================

function GameAgain({ onClick }) {
  return (
    <motion.button
      type="button"
      className="zero-game-again"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
    >
      encore
    </motion.button>
  );
}

export default function ZeroArcade({
  open,
  relationship,
  economy,
  wallet,
  isPremium,
  onClose,
  onGameFinish,
  language = "fr",
}) {
  const copy = getZeroCopy(language);
  const [gameId, setGameId] =
    useState("");

  const [rewardFlash, setRewardFlash] =
    useState(null);

  useEffect(() => {
    if (!open) {
      setGameId("");
    }
  }, [open]);

  const gameConfigs = useMemo(
    () =>
      Object.entries(
        ZERO_CONFIG.arcade.games
      ),
    []
  );

  if (!open) return null;

  const selectGame = (id) => {
    if (
      !getUnlocked(
        id,
        relationship,
        economy,
        wallet,
        isPremium
      )
    ) {
      gameSfx.error();
      return;
    }

    gameSfx.tap();
    setGameId(id);
  };

  const finish = (event) => {
    if (event.result === "win") {
      gameSfx.win();
    } else if (
      event.result === "loss"
    ) {
      gameSfx.lose();
    } else {
      gameSfx.soft();
    }

    const reward =
      onGameFinish(event);

    if (reward?.coins > 0) {
      setRewardFlash({
        coins: reward.coins,
        result: event.result,
      });

      window.setTimeout(() => {
        setRewardFlash(null);
      }, 1900);
    }
  };

  return (
    <motion.div
      className="zero-arcade zero-arcade-v6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="zero-v51-arcade-grid-bg"
        aria-hidden="true"
      />

      <div
        className="zero-v51-arcade-orb zero-v51-orb-a"
        aria-hidden="true"
      />

      <div
        className="zero-v51-arcade-orb zero-v51-orb-b"
        aria-hidden="true"
      />

      <header className="zero-arcade-head">
        <motion.button
          type="button"
          onClick={() => {
            gameSfx.tap();

            if (gameId) {
              setGameId("");
            } else {
              onClose();
            }
          }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>

        <div>
          <small>{copy.arcade.withZero}</small>

          <strong>
            {gameId
              ? copy.games?.[gameId] ||
                ZERO_CONFIG.arcade.games[gameId]?.label
              : copy.arcade.title}
          </strong>
        </div>

        <div className="zero-arcade-wallet">
          <span className="zero-coin-icon is-small">
            <i />
          </span>

          <strong>{wallet.coins}</strong>
        </div>
      </header>

      {!gameId ? (
        <div className="zero-arcade-menu">
          <div className="zero-arcade-zero">
            <div className="zero-arcade-eyes">
              <i />
              <i />
            </div>

            <span>{copy.arcade.choose}</span>
          </div>

          <div className="zero-arcade-grid zero-arcade-grid-v6">
            {gameConfigs.map(
              ([id, config], index) => {
                const unlocked =
                  getUnlocked(
                    id,
                    relationship,
                    economy,
                    wallet,
                    isPremium
                  );

                return (
                  <motion.button
                    key={id}
                    type="button"
                    className={
                      unlocked
                        ? "is-open"
                        : "is-locked"
                    }
                    onClick={() =>
                      selectGame(id)
                    }
                    whileHover={
                      unlocked
                        ? {
                            y: -4,
                            scale: 1.018,
                          }
                        : undefined
                    }
                    whileTap={
                      unlocked
                        ? {
                            scale: 0.97,
                          }
                        : undefined
                    }
                    transition={{
                      duration: 0.16,
                    }}
                    style={{
                      "--game-index": index,
                    }}
                  >
                    <span
                      className={`zero-game-icon zero-game-icon-${id}`}
                    >
                      {config.short}
                    </span>

                    <strong>
                      {copy.games?.[id] || config.label}
                    </strong>

                    <small>
                      {unlocked
                        ? copy.common.play
                        : `Core ${config.unlockEnergy}`}
                    </small>
                  </motion.button>
                );
              }
            )}
          </div>

          <p>
            {copy.arcade.footer}
            <br />
            {copy.arcade.noTokens}
          </p>
        </div>
      ) : null}

      {gameId === "tictactoe" ? (
        <TicTacToe
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "connect4" ? (
        <ConnectFour
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "reflex" ? (
        <ReflexGame
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "rps" ? (
        <RpsGame
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "memory" ? (
        <MemoryDuel
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "tapduel" ? (
        <TapDuel
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "secret" ? (
        <SecretNumber
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      {gameId === "codebreaker" ? (
        <Codebreaker
          relationship={relationship}
          onFinish={finish}
          language={language}
        />
      ) : null}

      <AnimatePresence>
        {rewardFlash ? (
          <motion.div
            className={[
              "zero-game-reward",
              `is-${rewardFlash.result}`,
            ].join(" ")}
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -12,
              scale: 0.9,
            }}
          >
            <span className="zero-coin-icon">
              <i />
            </span>

            <strong>
              +{rewardFlash.coins}
            </strong>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
