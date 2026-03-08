'use strict';

const ChainLabGame = (() => {
  const CONFIG = Object.freeze({
    ARENA: {
      WIDTH: 960,
      HEIGHT: 540,
      BACKGROUND: '#0c1f2b',
      BORDER: '#26465a'
    },
    SHOOTER: {
      X: 100,
      Y: 270,
      RADIUS: 10,
      COLOR: '#9be7ff'
    },
    PROJECTILE: {
      SPEED: 620,
      RADIUS: 7,
      DRAG_PER_SECOND: 0.18,
      MIN_SPEED: 24,
      MAX_LIFETIME: 2.8,
      COLOR: '#ffd75e'
    },
    NODES: {
      RADIUS: 20,
      HIT_SCORE: 100,
      TYPES: {
        bomb: {
          color: '#ff5d73',
          label: 'B'
        },
        pusher: {
          color: '#5cc8ff',
          label: 'P'
        },
        multiplier: {
          color: '#9bff8a',
          label: 'M'
        }
      },
      RESOLVED_COLOR: '#3a4751'
    },
    LEVEL: {
      SHOTS: 1,
      LAYOUT: [
        { id: 'n1', type: 'bomb', x: 560, y: 160 },
        { id: 'n2', type: 'pusher', x: 710, y: 230 },
        { id: 'n3', type: 'multiplier', x: 640, y: 330 },
        { id: 'n4', type: 'bomb', x: 810, y: 320 }
      ]
    },
    TRAJECTORY: {
      STEPS: 36,
      STEP_TIME: 0.05,
      WIDTH: 2,
      DASH_PATTERN: [7, 7],
      COLOR: '#b5f3ff'
    },
    SIMULATION: {
      FIXED_DT: 1 / 120,
      MAX_DT: 0.25,
      MAX_STEPS: 12,
      MS_THRESHOLD: 10
    },
    END_HINT: {
      X: 280,
      Y: 40,
      FONT: 'bold 20px monospace',
      WIN_COLOR: '#8dffba',
      LOSE_COLOR: '#ff9fa9',
      WIN_TEXT: 'Hit confirmed. Retry for next run.',
      LOSE_TEXT: 'No more shots. Retry.'
    },
    LABEL: {
      FONT: 'bold 12px monospace',
      COLOR: '#0c1f2b'
    },
    EPSILON: 0.0001
  });

  const runtime = {
    canvas: null,
    state: null
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y);
    if (length <= CONFIG.EPSILON) {
      return null;
    }

    return { x: x / length, y: y / length };
  }

  function createNodes() {
    return CONFIG.LEVEL.LAYOUT.map((node) => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      radius: CONFIG.NODES.RADIUS,
      resolved: false
    }));
  }

  function createState() {
    return {
      score: 0,
      shotsRemaining: CONFIG.LEVEL.SHOTS,
      phase: 'aim',
      lastShotHit: false,
      projectile: null,
      nodes: createNodes(),
      aim: {
        x: CONFIG.SHOOTER.X + 120,
        y: CONFIG.SHOOTER.Y,
        active: false
      },
      accumulator: 0
    };
  }

  function getState() {
    return runtime.state;
  }

  function getSnapshot() {
    const state = getState();
    if (!state) {
      return null;
    }

    return {
      score: state.score,
      shotsRemaining: state.shotsRemaining,
      phase: state.phase,
      lastShotHit: state.lastShotHit
    };
  }

  function initGame(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('initGame requires a valid canvas element.');
    }

    runtime.canvas = canvas;

    if (!canvas.width) {
      canvas.width = CONFIG.ARENA.WIDTH;
    }

    if (!canvas.height) {
      canvas.height = CONFIG.ARENA.HEIGHT;
    }

    runtime.state = createState();
    return getSnapshot();
  }

  function resetLevel() {
    if (!runtime.canvas) {
      throw new Error('resetLevel called before initGame.');
    }

    runtime.state = createState();
    return getSnapshot();
  }

  function setAim(x, y, active) {
    const state = getState();
    if (!state || state.phase !== 'aim') {
      return;
    }

    state.aim.x = clamp(x, 0, CONFIG.ARENA.WIDTH);
    state.aim.y = clamp(y, 0, CONFIG.ARENA.HEIGHT);
    state.aim.active = Boolean(active);
  }

  function findHitNode(projectile) {
    const state = getState();

    for (let i = 0; i < state.nodes.length; i += 1) {
      const node = state.nodes[i];
      if (node.resolved) {
        continue;
      }

      const hitRadius = node.radius + projectile.radius;
      if (distance(projectile.x, projectile.y, node.x, node.y) <= hitRadius) {
        return node;
      }
    }

    return null;
  }

  function fireShot(targetX, targetY) {
    const state = getState();

    if (!state || state.phase !== 'aim' || state.shotsRemaining <= 0) {
      return false;
    }

    const direction = normalize(targetX - CONFIG.SHOOTER.X, targetY - CONFIG.SHOOTER.Y);
    if (!direction) {
      return false;
    }

    state.projectile = {
      x: CONFIG.SHOOTER.X,
      y: CONFIG.SHOOTER.Y,
      vx: direction.x * CONFIG.PROJECTILE.SPEED,
      vy: direction.y * CONFIG.PROJECTILE.SPEED,
      radius: CONFIG.PROJECTILE.RADIUS,
      age: 0,
      alive: true
    };

    state.shotsRemaining -= 1;
    state.lastShotHit = false;
    state.phase = 'simulate';
    return true;
  }

  function simulateProjectile(dt) {
    const state = getState();
    const projectile = state.projectile;

    if (!projectile || !projectile.alive) {
      state.phase = 'end';
      return;
    }

    projectile.age += dt;

    const drag = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * dt);
    projectile.vx *= drag;
    projectile.vy *= drag;

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const speed = Math.hypot(projectile.vx, projectile.vy);
    const outOfBounds =
      projectile.x < 0 ||
      projectile.x > CONFIG.ARENA.WIDTH ||
      projectile.y < 0 ||
      projectile.y > CONFIG.ARENA.HEIGHT;

    if (
      outOfBounds ||
      projectile.age >= CONFIG.PROJECTILE.MAX_LIFETIME ||
      speed <= CONFIG.PROJECTILE.MIN_SPEED
    ) {
      projectile.alive = false;
      state.lastShotHit = false;
      state.phase = 'end';
      return;
    }

    const hitNode = findHitNode(projectile);
    if (hitNode) {
      hitNode.resolved = true;
      state.score += CONFIG.NODES.HIT_SCORE;
      projectile.alive = false;
      state.lastShotHit = true;
      state.phase = 'end';
    }
  }

  function predictTrajectory(targetX, targetY) {
    const state = getState();
    const direction = normalize(targetX - CONFIG.SHOOTER.X, targetY - CONFIG.SHOOTER.Y);
    if (!direction) {
      return [];
    }

    const points = [{ x: CONFIG.SHOOTER.X, y: CONFIG.SHOOTER.Y }];

    let x = CONFIG.SHOOTER.X;
    let y = CONFIG.SHOOTER.Y;
    let vx = direction.x * CONFIG.PROJECTILE.SPEED;
    let vy = direction.y * CONFIG.PROJECTILE.SPEED;

    for (let i = 0; i < CONFIG.TRAJECTORY.STEPS; i += 1) {
      const drag = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * CONFIG.TRAJECTORY.STEP_TIME);
      vx *= drag;
      vy *= drag;

      x += vx * CONFIG.TRAJECTORY.STEP_TIME;
      y += vy * CONFIG.TRAJECTORY.STEP_TIME;

      if (x < 0 || x > CONFIG.ARENA.WIDTH || y < 0 || y > CONFIG.ARENA.HEIGHT) {
        break;
      }

      points.push({ x, y });

      for (let n = 0; n < state.nodes.length; n += 1) {
        const node = state.nodes[n];
        if (node.resolved) {
          continue;
        }

        if (distance(x, y, node.x, node.y) <= CONFIG.PROJECTILE.RADIUS + node.radius) {
          return points;
        }
      }
    }

    return points;
  }

  function update(dt) {
    const state = getState();
    if (!state || state.phase !== 'simulate') {
      return;
    }

    let delta = Number(dt) || 0;
    if (delta > CONFIG.SIMULATION.MS_THRESHOLD) {
      delta /= 1000;
    }

    delta = clamp(delta, 0, CONFIG.SIMULATION.MAX_DT);
    state.accumulator += delta;

    let steps = 0;
    while (state.accumulator >= CONFIG.SIMULATION.FIXED_DT && steps < CONFIG.SIMULATION.MAX_STEPS) {
      simulateProjectile(CONFIG.SIMULATION.FIXED_DT);
      state.accumulator -= CONFIG.SIMULATION.FIXED_DT;
      steps += 1;
    }
  }

  function drawArena(ctx) {
    ctx.fillStyle = CONFIG.ARENA.BACKGROUND;
    ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

    ctx.lineWidth = 2;
    ctx.strokeStyle = CONFIG.ARENA.BORDER;
    ctx.strokeRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
  }

  function drawShooter(ctx) {
    ctx.beginPath();
    ctx.arc(CONFIG.SHOOTER.X, CONFIG.SHOOTER.Y, CONFIG.SHOOTER.RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.SHOOTER.COLOR;
    ctx.fill();
  }

  function drawNodes(ctx) {
    const state = getState();

    ctx.font = CONFIG.LABEL.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < state.nodes.length; i += 1) {
      const node = state.nodes[i];
      const typeConfig = CONFIG.NODES.TYPES[node.type];

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.resolved ? CONFIG.NODES.RESOLVED_COLOR : typeConfig.color;
      ctx.fill();

      ctx.fillStyle = CONFIG.LABEL.COLOR;
      ctx.fillText(typeConfig.label, node.x, node.y);
    }
  }

  function drawProjectile(ctx) {
    const state = getState();
    if (!state.projectile || !state.projectile.alive) {
      return;
    }

    ctx.beginPath();
    ctx.arc(state.projectile.x, state.projectile.y, state.projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.PROJECTILE.COLOR;
    ctx.fill();
  }

  function drawAimPreview(ctx) {
    const state = getState();
    if (state.phase !== 'aim' || !state.aim.active || state.shotsRemaining <= 0) {
      return;
    }

    const points = predictTrajectory(state.aim.x, state.aim.y);
    if (points.length < 2) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = CONFIG.TRAJECTORY.COLOR;
    ctx.lineWidth = CONFIG.TRAJECTORY.WIDTH;
    ctx.setLineDash(CONFIG.TRAJECTORY.DASH_PATTERN);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawEndHint(ctx) {
    const state = getState();
    if (state.phase !== 'end') {
      return;
    }

    ctx.font = CONFIG.END_HINT.FONT;
    ctx.fillStyle = state.lastShotHit ? CONFIG.END_HINT.WIN_COLOR : CONFIG.END_HINT.LOSE_COLOR;
    ctx.fillText(
      state.lastShotHit ? CONFIG.END_HINT.WIN_TEXT : CONFIG.END_HINT.LOSE_TEXT,
      CONFIG.END_HINT.X,
      CONFIG.END_HINT.Y
    );
  }

  function render(ctx) {
    const state = getState();
    if (!state || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawArena(ctx);
    drawAimPreview(ctx);
    drawShooter(ctx);
    drawNodes(ctx);
    drawProjectile(ctx);
    drawEndHint(ctx);
  }

  return {
    CONFIG,
    initGame,
    resetLevel,
    setAim,
    fireShot,
    update,
    render,
    getSnapshot
  };
})();

if (typeof window !== 'undefined') {
  window.ChainLabGame = ChainLabGame;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChainLabGame;
}


