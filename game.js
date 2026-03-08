'use strict';

const CONFIG = Object.freeze({
  CANVAS_ID: 'gameCanvas',
  WORLD_WIDTH: 960,
  WORLD_HEIGHT: 540,
  EPSILON: 0.0001,
  LEVEL: {
    DEFAULT: 1,
    INITIAL_SHOTS: 5,
    LAYOUTS: {
      1: [
        { id: 'n1', type: 'bomb', x: 560, y: 160 },
        { id: 'n2', type: 'pusher', x: 700, y: 210 },
        { id: 'n3', type: 'multiplier', x: 640, y: 300 },
        { id: 'n4', type: 'bomb', x: 790, y: 330 },
        { id: 'n5', type: 'pusher', x: 500, y: 320 },
        { id: 'n6', type: 'multiplier', x: 780, y: 150 }
      ]
    }
  },
  SHOOTER: {
    X: 120,
    Y: 270,
    RADIUS: 12
  },
  PROJECTILE: {
    RADIUS: 7,
    SPEED: 620,
    DRAG_PER_SECOND: 0.22,
    MAX_LIFETIME: 3.0,
    MIN_SPEED: 24
  },
  NODE: {
    RADIUS: 20,
    OUTLINE_WIDTH: 2,
    LABEL_FONT: 'bold 12px monospace'
  },
  CHAIN: {
    BOMB_RADIUS: 130,
    PUSHER_RADIUS: 120,
    PUSHER_DISTANCE: 36,
    MULTIPLIER_STEP: 1,
    MAX_MULTIPLIER: 8,
    MAX_QUEUE_SIZE: 256,
    MAX_EVENTS_PER_TURN: 128,
    RESOLVE_BATCH_PER_UPDATE: 8
  },
  SCORE: {
    BASE_REACTION: 100
  },
  TURN: {
    END_DELAY: 0.08
  },
  SIMULATION: {
    FIXED_DT: 1 / 120,
    MAX_STEPS_PER_UPDATE: 12,
    MAX_DT: 0.25,
    MS_TO_SECONDS_THRESHOLD: 10
  },
  TRAJECTORY: {
    STEPS: 36,
    STEP_TIME: 0.05,
    DASH_PATTERN: [6, 6],
    WIDTH: 2
  },
  UI: {
    HUD_FONT: '16px monospace',
    SMALL_FONT: '13px monospace',
    MESSAGE_FONT: 'bold 20px monospace',
    HUD_LEFT: 16,
    HUD_TOP: 26,
    HUD_LINE_HEIGHT: 22,
    MESSAGE_X: 320,
    MESSAGE_Y: 40
  },
  COLORS: {
    BACKGROUND: '#070f17',
    ARENA: '#0c1f2b',
    ARENA_BORDER: '#26465a',
    SHOOTER: '#9be7ff',
    TRAJECTORY: '#b5f3ff',
    PROJECTILE: '#ffd75e',
    NODE_BOMB: '#ff5d73',
    NODE_PUSHER: '#5cc8ff',
    NODE_MULTIPLIER: '#9bff8a',
    NODE_RESOLVED: '#33424c',
    TEXT: '#d7ecff',
    TEXT_DIM: '#8cb2c7',
    MESSAGE_COMPLETE: '#8dffba',
    MESSAGE_FAILED: '#ff9fa9'
  }
});

let state = null;

const runtime = {
  canvas: null,
  handlers: null
};

function createLevelNodes(level) {
  const layout = CONFIG.LEVEL.LAYOUTS[level] || CONFIG.LEVEL.LAYOUTS[CONFIG.LEVEL.DEFAULT] || [];

  return layout.map((entry, index) => ({
    id: entry.id || `node_${index}`,
    type: entry.type,
    x: entry.x,
    y: entry.y,
    radius: CONFIG.NODE.RADIUS,
    resolved: false
  }));
}

function createInitialState(level) {
  return {
    score: 0,
    shotsRemaining: CONFIG.LEVEL.INITIAL_SHOTS,
    level,
    chainMultiplier: 1,
    projectile: null,
    nodes: createLevelNodes(level),
    phase: 'aim',
    turnTimer: 0,
    accumulator: 0,
    queue: [],
    triggeredIds: new Set(),
    eventsResolvedThisTurn: 0,
    aim: {
      x: CONFIG.SHOOTER.X + 100,
      y: CONFIG.SHOOTER.Y,
      active: false
    }
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length <= CONFIG.EPSILON) {
    return null;
  }

  return {
    x: x / length,
    y: y / length
  };
}

function getNodeById(nodeId) {
  return state.nodes.find((node) => node.id === nodeId);
}

function getNodeFillColor(type) {
  if (type === 'bomb') {
    return CONFIG.COLORS.NODE_BOMB;
  }

  if (type === 'pusher') {
    return CONFIG.COLORS.NODE_PUSHER;
  }

  return CONFIG.COLORS.NODE_MULTIPLIER;
}

function getCanvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);

  return {
    x: clamp((clientX - rect.left) * scaleX, 0, CONFIG.WORLD_WIDTH),
    y: clamp((clientY - rect.top) * scaleY, 0, CONFIG.WORLD_HEIGHT)
  };
}

function unbindInput() {
  if (!runtime.canvas || !runtime.handlers) {
    return;
  }

  runtime.canvas.removeEventListener('mousemove', runtime.handlers.mousemove);
  runtime.canvas.removeEventListener('mouseleave', runtime.handlers.mouseleave);
  runtime.canvas.removeEventListener('click', runtime.handlers.click);

  runtime.handlers = null;
}

function bindInput(canvas) {
  if (!canvas) {
    return;
  }

  if (runtime.canvas && runtime.canvas !== canvas) {
    unbindInput();
  }

  runtime.canvas = canvas;

  if (runtime.handlers) {
    return;
  }

  runtime.handlers = {
    mousemove(event) {
      if (!state) {
        return;
      }

      const point = getCanvasPoint(canvas, event.clientX, event.clientY);
      state.aim.x = point.x;
      state.aim.y = point.y;
      state.aim.active = true;
    },
    mouseleave() {
      if (!state) {
        return;
      }

      state.aim.active = false;
    },
    click(event) {
      const point = getCanvasPoint(canvas, event.clientX, event.clientY);
      fireShot(point.x, point.y);
    }
  };

  canvas.addEventListener('mousemove', runtime.handlers.mousemove);
  canvas.addEventListener('mouseleave', runtime.handlers.mouseleave);
  canvas.addEventListener('click', runtime.handlers.click);
}

function enqueueTrigger(nodeId, depth, reason) {
  if (!state || state.queue.length >= CONFIG.CHAIN.MAX_QUEUE_SIZE) {
    return false;
  }

  if (state.triggeredIds.has(nodeId)) {
    return false;
  }

  state.queue.push({ nodeId, depth, reason });
  state.triggeredIds.add(nodeId);
  return true;
}

function findProjectileCollision(projectile) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (node.resolved) {
      continue;
    }

    const distance = getDistance(projectile.x, projectile.y, node.x, node.y);
    const hitRadius = projectile.radius + node.radius;

    if (distance <= hitRadius) {
      return node;
    }
  }

  return null;
}

function triggerBomb(originNode, depth) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.resolved || target.id === originNode.id) {
      continue;
    }

    if (getDistance(originNode.x, originNode.y, target.x, target.y) <= CONFIG.CHAIN.BOMB_RADIUS) {
      enqueueTrigger(target.id, depth + 1, 'bomb_explosion');
    }
  }
}

function triggerPusher(originNode, depth) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.resolved || target.id === originNode.id) {
      continue;
    }

    const distance = getDistance(originNode.x, originNode.y, target.x, target.y);
    if (distance > CONFIG.CHAIN.PUSHER_RADIUS) {
      continue;
    }

    const direction = normalize(target.x - originNode.x, target.y - originNode.y) || { x: 1, y: 0 };

    target.x = clamp(
      target.x + direction.x * CONFIG.CHAIN.PUSHER_DISTANCE,
      target.radius,
      CONFIG.WORLD_WIDTH - target.radius
    );

    target.y = clamp(
      target.y + direction.y * CONFIG.CHAIN.PUSHER_DISTANCE,
      target.radius,
      CONFIG.WORLD_HEIGHT - target.radius
    );

    enqueueTrigger(target.id, depth + 1, 'pusher_wave');
  }
}

function resolveNodeReaction(node, depth) {
  node.resolved = true;

  if (node.type === 'multiplier') {
    state.chainMultiplier = Math.min(
      CONFIG.CHAIN.MAX_MULTIPLIER,
      state.chainMultiplier + CONFIG.CHAIN.MULTIPLIER_STEP
    );
  }

  const scoreGained = CONFIG.SCORE.BASE_REACTION * state.chainMultiplier;
  state.score += scoreGained;

  if (node.type === 'bomb') {
    triggerBomb(node, depth);
    return;
  }

  if (node.type === 'pusher') {
    triggerPusher(node, depth);
  }
}

function simulateProjectile(dt) {
  const projectile = state.projectile;

  if (!projectile || !projectile.alive) {
    state.phase = 'resolve';
    return;
  }

  projectile.age += dt;

  const dragFactor = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * dt);
  projectile.vx *= dragFactor;
  projectile.vy *= dragFactor;

  projectile.x += projectile.vx * dt;
  projectile.y += projectile.vy * dt;

  const projectileSpeed = Math.hypot(projectile.vx, projectile.vy);
  const outOfBounds =
    projectile.x < 0 ||
    projectile.x > CONFIG.WORLD_WIDTH ||
    projectile.y < 0 ||
    projectile.y > CONFIG.WORLD_HEIGHT;

  if (
    outOfBounds ||
    projectile.age >= CONFIG.PROJECTILE.MAX_LIFETIME ||
    projectileSpeed <= CONFIG.PROJECTILE.MIN_SPEED
  ) {
    projectile.alive = false;
    state.phase = 'resolve';
    return;
  }

  const hitNode = findProjectileCollision(projectile);
  if (hitNode) {
    projectile.alive = false;
    enqueueTrigger(hitNode.id, 0, 'projectile_hit');
    state.phase = 'resolve';
  }
}

function resolveChain() {
  if (state.queue.length === 0) {
    state.phase = 'turn_end';
    state.turnTimer = 0;
    return;
  }

  let processedInBatch = 0;
  while (
    state.queue.length > 0 &&
    processedInBatch < CONFIG.CHAIN.RESOLVE_BATCH_PER_UPDATE
  ) {
    if (state.eventsResolvedThisTurn >= CONFIG.CHAIN.MAX_EVENTS_PER_TURN) {
      state.queue.length = 0;
      break;
    }

    const trigger = state.queue.shift();
    const node = getNodeById(trigger.nodeId);

    if (!node || node.resolved) {
      processedInBatch += 1;
      continue;
    }

    resolveNodeReaction(node, trigger.depth);
    state.eventsResolvedThisTurn += 1;
    processedInBatch += 1;
  }

  if (state.queue.length === 0) {
    state.phase = 'turn_end';
    state.turnTimer = 0;
  }
}

function allNodesResolved() {
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (!state.nodes[i].resolved) {
      return false;
    }
  }

  return true;
}

function endTurn() {
  state.projectile = null;
  state.queue.length = 0;
  state.triggeredIds.clear();
  state.eventsResolvedThisTurn = 0;
  state.chainMultiplier = 1;

  if (allNodesResolved()) {
    state.phase = 'complete';
    return;
  }

  if (state.shotsRemaining <= 0) {
    state.phase = 'failed';
    return;
  }

  state.phase = 'aim';
}

function predictTrajectory(targetX, targetY) {
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
    const dragFactor = Math.max(0, 1 - CONFIG.PROJECTILE.DRAG_PER_SECOND * CONFIG.TRAJECTORY.STEP_TIME);
    vx *= dragFactor;
    vy *= dragFactor;

    x += vx * CONFIG.TRAJECTORY.STEP_TIME;
    y += vy * CONFIG.TRAJECTORY.STEP_TIME;

    if (x < 0 || x > CONFIG.WORLD_WIDTH || y < 0 || y > CONFIG.WORLD_HEIGHT) {
      break;
    }

    points.push({ x, y });

    for (let n = 0; n < state.nodes.length; n += 1) {
      const node = state.nodes[n];
      if (node.resolved) {
        continue;
      }

      if (getDistance(x, y, node.x, node.y) <= CONFIG.PROJECTILE.RADIUS + node.radius) {
        return points;
      }
    }
  }

  return points;
}

function drawTrajectory(ctx) {
  const points = predictTrajectory(state.aim.x, state.aim.y);
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = CONFIG.COLORS.TRAJECTORY;
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

function drawNodes(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = CONFIG.NODE.LABEL_FONT;

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.resolved ? CONFIG.COLORS.NODE_RESOLVED : getNodeFillColor(node.type);
    ctx.fill();

    ctx.lineWidth = CONFIG.NODE.OUTLINE_WIDTH;
    ctx.strokeStyle = CONFIG.COLORS.ARENA_BORDER;
    ctx.stroke();

    const label = node.type === 'bomb' ? 'B' : node.type === 'pusher' ? 'P' : 'M';
    ctx.fillStyle = CONFIG.COLORS.ARENA;
    ctx.fillText(label, node.x, node.y);
  }
}

function drawProjectile(ctx) {
  if (!state.projectile || !state.projectile.alive) {
    return;
  }

  ctx.beginPath();
  ctx.arc(state.projectile.x, state.projectile.y, state.projectile.radius, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
  ctx.fill();
}

function drawShooter(ctx) {
  ctx.beginPath();
  ctx.arc(CONFIG.SHOOTER.X, CONFIG.SHOOTER.Y, CONFIG.SHOOTER.RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.SHOOTER;
  ctx.fill();
}

function drawHUD(ctx) {
  const x = CONFIG.UI.HUD_LEFT;
  const y = CONFIG.UI.HUD_TOP;
  const line = CONFIG.UI.HUD_LINE_HEIGHT;

  ctx.fillStyle = CONFIG.COLORS.TEXT;
  ctx.font = CONFIG.UI.HUD_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillText(`Score: ${state.score}`, x, y);
  ctx.fillText(`Shots: ${state.shotsRemaining}`, x, y + line);
  ctx.fillText(`Level: ${state.level}`, x, y + line * 2);
  ctx.fillText(`Chain x${state.chainMultiplier}`, x, y + line * 3);

  ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
  ctx.font = CONFIG.UI.SMALL_FONT;
  ctx.fillText(`Phase: ${state.phase}`, x, y + line * 4.2);

  if (state.phase === 'complete' || state.phase === 'failed') {
    ctx.font = CONFIG.UI.MESSAGE_FONT;
    ctx.fillStyle =
      state.phase === 'complete' ? CONFIG.COLORS.MESSAGE_COMPLETE : CONFIG.COLORS.MESSAGE_FAILED;

    const message = state.phase === 'complete' ? 'LEVEL COMPLETE' : 'OUT OF SHOTS';
    ctx.fillText(message, CONFIG.UI.MESSAGE_X, CONFIG.UI.MESSAGE_Y);
  }
}

function tick(dt) {
  if (state.phase === 'simulate') {
    simulateProjectile(dt);
    return;
  }

  if (state.phase === 'resolve') {
    resolveChain();
    return;
  }

  if (state.phase === 'turn_end') {
    state.turnTimer += dt;
    if (state.turnTimer >= CONFIG.TURN.END_DELAY) {
      endTurn();
    }
  }
}

function initGame(options = {}) {
  const level = Number.isInteger(options.level) ? options.level : CONFIG.LEVEL.DEFAULT;
  state = createInitialState(level);

  const canvas = options.canvas || (typeof document !== 'undefined' ? document.getElementById(CONFIG.CANVAS_ID) : null);
  if (canvas) {
    if (!canvas.width) {
      canvas.width = CONFIG.WORLD_WIDTH;
    }

    if (!canvas.height) {
      canvas.height = CONFIG.WORLD_HEIGHT;
    }

    bindInput(canvas);
  }

  return state;
}

function resetLevel() {
  if (!state) {
    return initGame();
  }

  const activeLevel = state.level;
  state = createInitialState(activeLevel);
  return state;
}

function fireShot(targetX, targetY) {
  if (!state) {
    initGame();
  }

  if (state.phase !== 'aim' || state.shotsRemaining <= 0) {
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
  state.chainMultiplier = 1;
  state.queue.length = 0;
  state.triggeredIds.clear();
  state.eventsResolvedThisTurn = 0;
  state.phase = 'simulate';

  return true;
}

function update(dt) {
  if (!state) {
    initGame();
  }

  let deltaSeconds = Number(dt) || 0;
  if (deltaSeconds > CONFIG.SIMULATION.MS_TO_SECONDS_THRESHOLD) {
    deltaSeconds /= 1000;
  }

  deltaSeconds = clamp(deltaSeconds, 0, CONFIG.SIMULATION.MAX_DT);
  state.accumulator += deltaSeconds;

  let steps = 0;
  while (
    state.accumulator >= CONFIG.SIMULATION.FIXED_DT &&
    steps < CONFIG.SIMULATION.MAX_STEPS_PER_UPDATE
  ) {
    tick(CONFIG.SIMULATION.FIXED_DT);
    state.accumulator -= CONFIG.SIMULATION.FIXED_DT;
    steps += 1;
  }
}

function render(ctx) {
  if (!state || !ctx) {
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
  ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

  ctx.fillStyle = CONFIG.COLORS.ARENA;
  ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

  ctx.strokeStyle = CONFIG.COLORS.ARENA_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

  if (state.phase === 'aim' && state.aim.active && state.shotsRemaining > 0) {
    drawTrajectory(ctx);
  }

  drawShooter(ctx);
  drawNodes(ctx);
  drawProjectile(ctx);
  drawHUD(ctx);
}

const OneShotLabGame = {
  CONFIG,
  initGame,
  resetLevel,
  fireShot,
  update,
  render
};

if (typeof window !== 'undefined') {
  window.OneShotLabGame = OneShotLabGame;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OneShotLabGame;
}
