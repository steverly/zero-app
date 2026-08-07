import { useCallback, useEffect, useRef, useState } from "react";
import "./zero-challenge.css";

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 560;
const FLOOR_Y = 455;
const PLAYER_W = 34;
const PLAYER_H = 48;
const PLAYER_SLIDE_H = 24;
const GRAVITY = 3800;
const JUMP_FORCE = 1080;
const BASE_SPEED = 455;
const RUN_DURATION = 31;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function createObstacle(type, x, difficulty) {
  if (type === "spikes") {
    return {
      id: crypto.randomUUID(),
      type,
      x,
      y: FLOOR_Y - 30,
      width: 72 + difficulty * 18,
      height: 30,
      passed: false,
    };
  }

  if (type === "wall") {
    return {
      id: crypto.randomUUID(),
      type,
      x,
      y: FLOOR_Y - 74,
      width: 34,
      height: 74,
      passed: false,
    };
  }

  if (type === "laserHigh") {
    return {
      id: crypto.randomUUID(),
      type,
      x,
      y: FLOOR_Y - 76,
      width: 110,
      height: 10,
      passed: false,
    };
  }

  if (type === "laserLow") {
    return {
      id: crypto.randomUUID(),
      type,
      x,
      y: FLOOR_Y - 24,
      width: 105,
      height: 9,
      passed: false,
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "fallingBlock",
    x,
    y: 60,
    targetY: FLOOR_Y - 52,
    width: 48,
    height: 52,
    vy: 0,
    active: false,
    passed: false,
  };
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function ZeroBossFace({ expression, fx }) {
  const eyeClass = `zero-boss-eye zero-boss-eye--${expression}`;

  return (
    <div className="zero-boss-face" aria-hidden="true">
      <div className="zero-boss-eyes">
        <span className={eyeClass}>
          <i />
          <b />
        </span>
        <span className={eyeClass}>
          <i />
          <b />
        </span>
      </div>

      {fx !== "none" && (
        <div className={`zero-boss-fx zero-boss-fx--${fx}`}>
          {fx === "dots" && (
            <>
              <i />
              <i />
              <i />
            </>
          )}
          {fx === "anger" && <span />}
          {fx === "alert" && <strong>!!</strong>}
          {fx === "confused" && <strong>??</strong>}
        </div>
      )}
    </div>
  );
}

export default function ZeroChallenge({
  language = "fr",
  onExit,
  onComplete,
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const keysRef = useRef(new Set());
  const touchRef = useRef({ left: false, right: false, slide: false });
  const stateRef = useRef(null);

  const [phase, setPhase] = useState("intro");
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [comment, setComment] = useState("");
  const [expression, setExpression] = useState("calm");
  const [fx, setFx] = useState("none");
  const [result, setResult] = useState(null);

  const copy = {
    fr: {
      intro: "va jusqu’au bout",
      ready: "prêt",
      go: "GO",
      retry: "recommencer",
      exit: "quitter",
      win: "... ok t’as gagné cette fois",
      lose: "je t’avais prévenu",
      hit: ["j’t’ai eu", "c’était gratuit ça", "t’es trop lent", "reste concentré"],
      dodge: ["hm", "ok j’ai vu", "t’as eu chaud", "ça passera pas deux fois"],
      final: "bon là j’arrête de jouer",
    },
    en: {
      intro: "make it to the end",
      ready: "ready",
      go: "GO",
      retry: "again",
      exit: "leave",
      win: "... ok you got me this time",
      lose: "told you",
      hit: ["got you", "that was free", "too slow", "lock in"],
      dodge: ["hm", "ok i saw that", "that was close", "won’t work twice"],
      final: "alright i’m done playing",
    },
    id: {
      intro: "sampai ke ujung",
      ready: "siap",
      go: "GO",
      retry: "lagi",
      exit: "keluar",
      win: "... iya deh kali ini kamu menang",
      lose: "udah kubilang",
      hit: ["kena", "gratis banget itu", "kurang cepet", "fokus dikit"],
      dodge: ["hm", "iya aku lihat", "hampir kena tuh", "gak bakal dua kali"],
      final: "oke sekarang aku serius",
    },
  }[language] || null;

  const showBossMoment = useCallback((nextExpression, nextFx, nextComment = "", duration = 900) => {
    setExpression(nextExpression);
    setFx(nextFx);

    if (nextComment) {
      setComment(nextComment);
    }

    window.setTimeout(() => {
      setFx("none");
      if (nextExpression !== "angry") setExpression("calm");
      if (nextComment) setComment("");
    }, duration);
  }, []);

  const resetGameState = useCallback(() => {
    stateRef.current = {
      player: {
        x: 180,
        y: FLOOR_Y - PLAYER_H,
        width: PLAYER_W,
        height: PLAYER_H,
        vy: 0,
        grounded: true,
        sliding: false,
        invulnerable: 0,
        trail: [],
      },
      obstacles: [],
      particles: [],
      elapsed: 0,
      nextSpawnAt: 1.45,
      speed: BASE_SPEED,
      distance: 0,
      finishDistance: BASE_SPEED * RUN_DURATION,
      lives: 3,
      score: 0,
      finalRushTriggered: false,
      shake: 0,
      flash: 0,
      finished: false,
    };
  }, []);

  const startGame = useCallback(() => {
    resetGameState();
    setLives(3);
    setProgress(0);
    setResult(null);
    setComment(copy.intro);
    setExpression("calm");
    setFx("dots");
    setPhase("countdown");
    setCountdown(3);

    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;

      if (value <= 0) {
        window.clearInterval(timer);
        setCountdown(0);
        setComment(copy.go);
        setExpression("angry");
        setFx("alert");
        setPhase("playing");

        window.setTimeout(() => {
          setComment("");
          setFx("none");
          setExpression("calm");
        }, 700);
      } else {
        setCountdown(value);
      }
    }, 700);
  }, [copy, resetGameState]);

  useEffect(() => {
    if (phase !== "intro") return;

    const timer = window.setTimeout(() => {
      startGame();
    }, 1150);

    return () => window.clearTimeout(timer);
  }, [phase, startGame]);

  const jump = useCallback(() => {
    const game = stateRef.current;
    if (!game || phase !== "playing") return;

    const player = game.player;
    if (!player.grounded || player.sliding) return;

    player.vy = -JUMP_FORCE;
    player.grounded = false;
  }, [phase]);

  const setTouch = useCallback((name, value) => {
    touchRef.current[name] = value;
  }, []);

  useEffect(() => {
    const down = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);

      if (
        key === " " ||
        key === "arrowup" ||
        key === "w"
      ) {
        event.preventDefault();
        jump();
      }
    };

    const up = (event) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [jump]);

  useEffect(() => {
    if (phase !== "playing") return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const scaleCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(
        (rect.width / GAME_WIDTH) * ratio,
        0,
        0,
        (rect.height / GAME_HEIGHT) * ratio,
        0,
        0
      );
    };

    scaleCanvas();
    window.addEventListener("resize", scaleCanvas);

    const spawnObstacle = (game) => {
      const difficulty = clamp(game.elapsed / RUN_DURATION, 0, 1);
      const options =
        difficulty < 0.3
          ? ["spikes", "wall", "laserHigh"]
          : ["spikes", "wall", "laserHigh", "laserLow", "fallingBlock"];

      const type = options[Math.floor(Math.random() * options.length)];
      const obstacle = createObstacle(type, GAME_WIDTH + 80, difficulty);
      game.obstacles.push(obstacle);

      const progressNow = clamp(game.distance / game.finishDistance, 0, 1);
      if (progressNow > 0.82 && Math.random() < 0.38) {
        const followType = type === "spikes" ? "laserHigh" : "spikes";
        game.obstacles.push(
          createObstacle(followType, GAME_WIDTH + randomBetween(285, 360), difficulty)
        );
      }

      if (type === "fallingBlock") {
        showBossMoment("focused", "dots", "", 700);
      } else if (type === "laserHigh" || type === "laserLow") {
        showBossMoment("wide", "alert", "", 650);
      } else {
        showBossMoment("angry", "anger", "", 700);
      }

      const spawnProgress = clamp(game.distance / game.finishDistance, 0, 1);
      const inFinalRush = spawnProgress > 0.7;

      const minGap = inFinalRush
        ? 0.52
        : 0.88 - difficulty * 0.18;

      const maxGap = inFinalRush
        ? 0.92
        : 1.48 - difficulty * 0.28;

      game.nextSpawnAt = game.elapsed + randomBetween(minGap, maxGap);
    };

    const addParticles = (game, x, y, count, fast = false) => {
      for (let index = 0; index < count; index += 1) {
        game.particles.push({
          x,
          y,
          vx: randomBetween(-100, 100) * (fast ? 1.7 : 1),
          vy: randomBetween(-160, -40) * (fast ? 1.35 : 1),
          life: randomBetween(0.3, 0.65),
          maxLife: 0.65,
          size: randomBetween(2, 5),
        });
      }
    };

    const hitPlayer = (game) => {
      const player = game.player;
      if (player.invulnerable > 0) return;

      game.lives -= 1;
      player.invulnerable = 1.25;
      player.vy = -420;
      player.grounded = false;
      game.shake = 0.28;
      game.flash = 0.18;
      addParticles(game, player.x + player.width / 2, player.y + player.height / 2, 14, true);

      setLives(game.lives);
      showBossMoment(
        "happy",
        "anger",
        copy.hit[Math.floor(Math.random() * copy.hit.length)],
        950
      );

      if (game.lives <= 0) {
        game.finished = true;
        setExpression("happy");
        setFx("none");
        setComment(copy.lose);
        setResult("lose");
        setPhase("result");
      }
    };

    const update = (delta) => {
      const game = stateRef.current;
      if (!game || game.finished) return;

      game.elapsed += delta;
      const difficulty = clamp(game.elapsed / RUN_DURATION, 0, 1);
      const runProgress = clamp(game.distance / game.finishDistance, 0, 1);
      const finalBoost = runProgress > 0.7
        ? 160 + ((runProgress - 0.7) / 0.3) * 150
        : 0;

      game.speed = BASE_SPEED + difficulty * 120 + finalBoost;
      game.distance += game.speed * delta;
      game.shake = Math.max(0, game.shake - delta);
      game.flash = Math.max(0, game.flash - delta);

      const player = game.player;
      player.invulnerable = Math.max(0, player.invulnerable - delta);

      const left =
        keysRef.current.has("arrowleft") ||
        keysRef.current.has("a") ||
        touchRef.current.left;
      const right =
        keysRef.current.has("arrowright") ||
        keysRef.current.has("d") ||
        touchRef.current.right;
      const slide =
        keysRef.current.has("arrowdown") ||
        keysRef.current.has("s") ||
        keysRef.current.has("shift") ||
        touchRef.current.slide;

      const moveSpeed = 410;
      if (left) player.x -= moveSpeed * delta;
      if (right) player.x += moveSpeed * delta;
      player.x = clamp(player.x, 70, 430);

      player.sliding = slide && player.grounded;
      player.height = player.sliding ? PLAYER_SLIDE_H : PLAYER_H;

      if (slide && !player.grounded && player.vy > -120) {
        player.vy += 1550 * delta;
      }

      player.vy += GRAVITY * delta;
      player.y += player.vy * delta;

      if (player.y + player.height >= FLOOR_Y) {
        player.y = FLOOR_Y - player.height;
        player.vy = 0;
        player.grounded = true;
      }

      player.trail.unshift({
        x: player.x,
        y: player.y,
        opacity: 0.22,
      });
      player.trail = player.trail.slice(0, 5);
      player.trail.forEach((point) => {
        point.opacity *= 0.78;
      });

      if (game.elapsed >= game.nextSpawnAt) {
        spawnObstacle(game);
      }

      if (!game.finalRushTriggered && game.distance / game.finishDistance > 0.7) {
        game.finalRushTriggered = true;
        setComment(copy.final);
        setExpression("wide");
        setFx("anger");

        window.setTimeout(() => {
          setComment("");
          setExpression("angry");
          setFx("none");
        }, 850);
      }

      for (const obstacle of game.obstacles) {
        obstacle.x -= game.speed * delta;

        if (obstacle.type === "fallingBlock") {
          if (!obstacle.active && obstacle.x < player.x + 280) {
            obstacle.active = true;
          }

          if (obstacle.active) {
            obstacle.vy += 1800 * delta;
            obstacle.y += obstacle.vy * delta;
            if (obstacle.y >= obstacle.targetY) {
              obstacle.y = obstacle.targetY;
              obstacle.vy = 0;
            }
          }
        }

        const playerBox = {
          x: player.x + 5,
          y: player.y + 3,
          width: player.width - 10,
          height: player.height - 5,
        };

        const obstacleBox = {
          x: obstacle.x + 3,
          y: obstacle.y + 2,
          width: obstacle.width - 6,
          height: obstacle.height - 2,
        };

        if (overlaps(playerBox, obstacleBox)) {
          hitPlayer(game);
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
          obstacle.passed = true;
          game.score += 1;

          if (game.score % 4 === 0) {
            showBossMoment(
              "surprised",
              "confused",
              copy.dodge[Math.floor(Math.random() * copy.dodge.length)],
              850
            );
          }
        }
      }

      game.obstacles = game.obstacles.filter((obstacle) => obstacle.x > -180);

      for (const particle of game.particles) {
        particle.life -= delta;
        particle.vy += 680 * delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
      }
      game.particles = game.particles.filter((particle) => particle.life > 0);

      const nextProgress = clamp(game.distance / game.finishDistance, 0, 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        game.finished = true;
        setExpression("surprised");
        setFx("dots");
        setComment(copy.win);
        setResult("win");
        setPhase("result");
        onComplete?.({
          result: "win",
          lives: game.lives,
          score: game.score,
        });
      }
    };

    const drawBackground = () => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      gradient.addColorStop(0, "#080808");
      gradient.addColorStop(1, "#030303");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;

      for (let x = 0; x < GAME_WIDTH; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }

      for (let y = 0; y < GAME_HEIGHT; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }
    };

    const drawWorld = () => {
      const game = stateRef.current;
      if (!game) return;

      const shakeX = game.shake > 0 ? randomBetween(-7, 7) : 0;
      const shakeY = game.shake > 0 ? randomBetween(-4, 4) : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      ctx.fillStyle = "rgba(244,240,232,0.12)";
      ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 2);

      const floorGradient = ctx.createLinearGradient(0, FLOOR_Y, 0, GAME_HEIGHT);
      floorGradient.addColorStop(0, "rgba(255,255,255,0.035)");
      floorGradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, FLOOR_Y + 2, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);

      const finishX = GAME_WIDTH - ((game.finishDistance - game.distance) / game.speed) * 260;
      if (finishX < GAME_WIDTH + 200) {
        ctx.strokeStyle = "rgba(244,240,232,0.9)";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(finishX, FLOOR_Y - 170);
        ctx.lineTo(finishX, FLOOR_Y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const obstacle of game.obstacles) {
        ctx.save();

        if (obstacle.type === "spikes") {
          ctx.fillStyle = "#ff4f58";
          const count = Math.max(2, Math.round(obstacle.width / 24));
          const spikeWidth = obstacle.width / count;

          for (let index = 0; index < count; index += 1) {
            const x = obstacle.x + index * spikeWidth;
            ctx.beginPath();
            ctx.moveTo(x, FLOOR_Y);
            ctx.lineTo(x + spikeWidth / 2, obstacle.y);
            ctx.lineTo(x + spikeWidth, FLOOR_Y);
            ctx.closePath();
            ctx.fill();
          }
        }

        if (obstacle.type === "wall") {
          ctx.fillStyle = "#ff4f58";
          roundedRect(
            ctx,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height,
            6
          );
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(obstacle.x + 7, obstacle.y + 8, 3, obstacle.height - 16);
        }

        if (obstacle.type === "laserHigh" || obstacle.type === "laserLow") {
          ctx.shadowColor = "#ff4f58";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#ff4f58";
          roundedRect(
            ctx,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height,
            999
          );
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (obstacle.type === "fallingBlock") {
          ctx.fillStyle = "#ff4f58";
          roundedRect(
            ctx,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height,
            7
          );
          ctx.fill();

          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            obstacle.x + 8,
            obstacle.y + 8,
            obstacle.width - 16,
            obstacle.height - 16
          );
        }

        ctx.restore();
      }

      const player = game.player;

      for (const point of player.trail) {
        ctx.fillStyle = `rgba(244,240,232,${point.opacity})`;
        roundedRect(
          ctx,
          point.x,
          point.y,
          player.width,
          player.height,
          7
        );
        ctx.fill();
      }

      ctx.save();

      if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
        ctx.globalAlpha = 0.25;
      }

      ctx.fillStyle = "#f4f0e8";
      roundedRect(
        ctx,
        player.x,
        player.y,
        player.width,
        player.height,
        player.sliding ? 12 : 8
      );
      ctx.fill();

      ctx.fillStyle = "#090909";
      ctx.fillRect(
        player.x + player.width - 10,
        player.y + 10,
        4,
        4
      );

      ctx.restore();

      for (const particle of game.particles) {
        ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = "#f4f0e8";
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;

      if (game.flash > 0) {
        ctx.fillStyle = `rgba(255,79,88,${game.flash * 1.8})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      ctx.restore();
    };

    const loop = (time) => {
      const previous = lastTimeRef.current || time;
      const delta = Math.min((time - previous) / 1000, 0.034);
      lastTimeRef.current = time;

      update(delta);
      drawBackground();
      drawWorld();

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", scaleCanvas);
      lastTimeRef.current = 0;
    };
  }, [copy, onComplete, phase, showBossMoment]);

  const retry = () => {
    setPhase("intro");
    setResult(null);
    setComment("");
    setExpression("calm");
    setFx("none");
  };

  return (
    <div className="zero-challenge">
      <div className="zero-challenge-noise" />

      <ZeroBossFace expression={expression} fx={fx} />

      <header className="zero-challenge-hud">
        <button
          className="zero-challenge-close"
          type="button"
          onClick={onExit}
          aria-label={copy.exit}
        >
          ×
        </button>

        <div className="zero-challenge-progress">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div className="zero-challenge-lives" aria-label={`${lives} lives`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <i
              key={index}
              className={index < lives ? "is-active" : ""}
            />
          ))}
        </div>
      </header>

      <div className="zero-challenge-comment" aria-live="polite">
        {comment}
      </div>

      <canvas
        ref={canvasRef}
        className="zero-challenge-canvas"
        aria-label="Zero Challenge"
      />

      {phase === "countdown" && (
        <div className="zero-challenge-countdown">
          <small>{copy.ready}</small>
          <strong key={countdown}>{countdown}</strong>
        </div>
      )}

      {phase === "result" && (
        <div className={`zero-challenge-result zero-challenge-result--${result}`}>
          <p>{comment}</p>

          <div>
            <button type="button" onClick={retry}>
              {copy.retry}
            </button>
            <button type="button" onClick={onExit}>
              {copy.exit}
            </button>
          </div>
        </div>
      )}

      <div className="zero-challenge-controls">
        <div className="zero-challenge-controls-left">
          <button
            type="button"
            onPointerDown={() => setTouch("left", true)}
            onPointerUp={() => setTouch("left", false)}
            onPointerCancel={() => setTouch("left", false)}
            onPointerLeave={() => setTouch("left", false)}
            aria-label="Left"
          >
            ←
          </button>

          <button
            type="button"
            onPointerDown={() => setTouch("right", true)}
            onPointerUp={() => setTouch("right", false)}
            onPointerCancel={() => setTouch("right", false)}
            onPointerLeave={() => setTouch("right", false)}
            aria-label="Right"
          >
            →
          </button>
        </div>

        <div className="zero-challenge-controls-right">
          <button
            type="button"
            className="zero-challenge-control-slide"
            onPointerDown={() => setTouch("slide", true)}
            onPointerUp={() => setTouch("slide", false)}
            onPointerCancel={() => setTouch("slide", false)}
            onPointerLeave={() => setTouch("slide", false)}
          >
            SLIDE
          </button>

          <button
            type="button"
            className="zero-challenge-control-jump"
            onPointerDown={jump}
          >
            JUMP
          </button>
        </div>
      </div>

      <div className="zero-challenge-keyboard-hint">
        A D / ← → · espace pour sauter · S ou Shift pour slide
      </div>
    </div>
  );
}