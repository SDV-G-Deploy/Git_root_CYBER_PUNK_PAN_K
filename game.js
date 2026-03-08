'use strict';

const CONFIG = Object.freeze({
  CANVAS_ID: 'chainLabCanvas',
  ARENA: Object.freeze({
    WIDTH: 960,
    HEIGHT: 540,
    NODE_JITTER: 8
  }),
  SHOOTER: Object.freeze({
    X: 120,
    Y: 270,
    RADIUS: 12
  }),
  PROJECTILE: Object.freeze({
    SPEED: 640,
    RADIUS: 7,
    DRAG_PER_SECOND: 0.22,
    MIN_SPEED: 28,
    MAX_LIFETIME: 3.1
  }),
  RUN: Object.freeze({
    INITIAL_SHOTS: 5,
    TURN_END_DELAY: 0.08
  }),
  CHAIN: Object.freeze({
    MAX_QUEUE_SIZE: 256,
    MAX_CHAIN_STEPS: 96,
    RESOLVE_BATCH_SIZE: 10,
    DEFAULT_MULTIPLIER: 1,
    MAX_MULTIPLIER: 8
  }),
  NODE_TYPES: Object.freeze({
    bomb: Object.freeze({
      RADIUS: 20,
      SCORE_VALUE: 120,
      AOE_RADIUS: 132,
      COLOR: '#ff5d73',
      LABEL: 'B'
    }),
    pusher: Object.freeze({
      RADIUS: 20,
      SCORE_VALUE: 110,
      IMPULSE_RADIUS: 124,
      IMPULSE_POWER: 40,
      COLOR: '#64d2ff',
      LABEL: 'P'
    }),
    multiplier: Object.freeze({
      RADIUS: 20,
      SCORE_VALUE: 95,
      MULTIPLIER_BOOST: 1,
      COLOR: '#9bff8a',
      LABEL: 'M'
    })
  }),
  LEVEL: Object.freeze({
    DEFAULT_LAYOUT: Object.freeze([
      Object.freeze({ id: 'n1', type: 'bomb', x: 560, y: 160 }),
      Object.freeze({ id: 'n2', type: 'pusher', x: 700, y: 210 }),
      Object.freeze({ id: 'n3', type: 'multiplier', x: 640, y: 300 }),
      Object.freeze({ id: 'n4', type: 'bomb', x: 800, y: 320 }),
      Object.freeze({ id: 'n5', type: 'pusher', x: 505, y: 330 }),
      Object.freeze({ id: 'n6', type: 'multiplier', x: 790, y: 145 })
    ]),
    WIN_CLEAR_BONUS: 320
  }),
  SCORING: Object.freeze({
    DEPTH_BONUS: 16,
    COMBO_BONUS: 14,
    MAX_COMBO: 10,
    SHOTS_REMAINING_BONUS: 40
  }),
  REWARD: Object.freeze({
    CREDITS_PER_SCORE: 0.12,
    WIN_CREDITS_BONUS: 70,
    SCORE_PER_TECH_PART: 180,
    BASE_TECH_MODULE_CHANCE: 0.05,
    CHAIN_DEPTH_CHANCE_STEP: 0.03,
    WIN_CHANCE_BONUS: 0.06,
    MAX_TECH_MODULE_CHANCE: 0.85
  }),
  TRAJECTORY: Object.freeze({
    STEPS: 36,
    STEP_TIME: 0.05,
    WIDTH: 2,
    DASH_PATTERN: Object.freeze([6, 6])
  }),
  SIMULATION: Object.freeze({
    FIXED_DT: 1 / 120,
    MAX_DT: 0.25,
    MAX_STEPS_PER_UPDATE: 12,
    MS_TO_SECONDS_THRESHOLD: 10
  }),
  COLORS: Object.freeze({
    BACKGROUND: '#070f17',
    ARENA: '#0c1f2b',
    ARENA_BORDER: '#24485f',
    SHOOTER: '#9be7ff',
    PROJECTILE: '#ffd75e',
    TRAJECTORY: '#b8f5ff',
    NODE_RESOLVED: '#33424c',
    HUD_TEXT: '#d7ecff',
    HUD_DIM: '#8cb2c7',
    END_WIN: '#8dffba',
    END_LOSE: '#ff9fa9'
  }),
  UI: Object.freeze({
    HUD_FONT: '16px monospace',
    SMALL_FONT: '13px monospace',
    MESSAGE_FONT: 'bold 20px monospace',
    HUD_LEFT: 16,
    HUD_TOP: 26,
    HUD_LINE_HEIGHT: 22,
    MESSAGE_X: 312,
    MESSAGE_Y: 42
  }),
  EPSILON: 0.0001
});

let state = null;

const runtime = {
  canvas: null,
  handlers: null,
  callbacks: {
    onRunEnd: onRunEndStub
  },
  options: {
    metaModifiers: {
      extraShots: 0,
      chainMultiplierBonus: 0,
      rewardBonusChance: 0
    }
  }
};

function onRunEndStub() {
  // Integration hook: meta layer can replace this callback.
  return { claimed: true };
}

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

function createRunId() {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `run_${now}_${random}`;
}

function createRng(seedValue) {
  let seed = Number(seedValue);
  if (!Number.isFinite(seed)) {
    seed = Date.now();
  }

  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let m = Math.imul(t ^ (t >>> 15), t | 1);
    m ^= m + Math.imul(m ^ (m >>> 7), m | 61);
    return ((m ^ (m >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(rng, min, max) {
  return min + (max - min) * rng();
}

function getNodeTypeConfig(type) {
  return CONFIG.NODE_TYPES[type] || CONFIG.NODE_TYPES.multiplier;
}

function deepCopyRewardPacket(packet) {
  if (!packet) {
    return null;
  }

  return {
    credits: packet.credits,
    tech_parts: packet.tech_parts,
    tech_module_chance: packet.tech_module_chance,
    performance_tags: Array.isArray(packet.performance_tags)
      ? packet.performance_tags.slice()
      : []
  };
}

function getMetaModifiers() {
  const defaults = runtime.options.metaModifiers || {};

  return {
    extraShots: Number(defaults.extraShots) || 0,
    chainMultiplierBonus: Number(defaults.chainMultiplierBonus) || 0,
    rewardBonusChance: Number(defaults.rewardBonusChance) || 0
  };
}

function getInitialShots() {
  const meta = getMetaModifiers();
  return Math.max(1, CONFIG.RUN.INITIAL_SHOTS + Math.floor(meta.extraShots));
}

function getBaseMultiplier() {
  const meta = getMetaModifiers();
  return clamp(
    CONFIG.CHAIN.DEFAULT_MULTIPLIER + Math.floor(meta.chainMultiplierBonus),
    CONFIG.CHAIN.DEFAULT_MULTIPLIER,
    CONFIG.CHAIN.MAX_MULTIPLIER
  );
}

function createNodes(seed) {
  const rng = createRng(seed);
  const jitter = CONFIG.ARENA.NODE_JITTER;

  return CONFIG.LEVEL.DEFAULT_LAYOUT.map((base, index) => {
    const nodeConfig = getNodeTypeConfig(base.type);

    const x = clamp(
      base.x + randomRange(rng, -jitter, jitter),
      nodeConfig.RADIUS,
      CONFIG.ARENA.WIDTH - nodeConfig.RADIUS
    );

    const y = clamp(
      base.y + randomRange(rng, -jitter, jitter),
      nodeConfig.RADIUS,
      CONFIG.ARENA.HEIGHT - nodeConfig.RADIUS
    );

    return {
      id: base.id || `node_${index}`,
      type: base.type,
      x,
      y,
      radius: nodeConfig.RADIUS,
      resolved: false
    };
  });
}

function emitTelemetry(event, payload) {
  if (!state) {
    return;
  }

  const entry = {
    event,
    ts: Date.now(),
    runId: state.runId,
    payload: payload || {}
  };

  state.telemetry.push(entry);

  if (runtime.options.debugTelemetry) {
    console.log('[ChainLab telemetry]', entry);
  }
}

function createInitialState(seed) {
  const baseMultiplier = getBaseMultiplier();

  return {
    runId: createRunId(),
    score: 0,
    shotsRemaining: getInitialShots(),
    chainMultiplier: baseMultiplier,
    chainDepth: 0,
    rewardPacket: null,
    rewardClaimed: false,
    result: null,
    seed,
    phase: 'aim',
    projectile: null,
    nodes: createNodes(seed),
    aim: {
      x: CONFIG.SHOOTER.X + 100,
      y: CONFIG.SHOOTER.Y,
      active: false
    },
    chainQueue: [],
    queuedNodeIds: new Set(),
    visitedNodeIds: new Set(),
    chainStepCount: 0,
    combo: 0,
    turnTimer: 0,
    accumulator: 0,
    turnContext: null,
    telemetry: []
  };
}

function getNodeById(nodeId) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].id === nodeId) {
      return state.nodes[i];
    }
  }

  return null;
}

function getCanvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);

  return {
    x: clamp((clientX - rect.left) * scaleX, 0, CONFIG.ARENA.WIDTH),
    y: clamp((clientY - rect.top) * scaleY, 0, CONFIG.ARENA.HEIGHT)
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
      if (!state || state.phase === 'end') {
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
      if (!state || state.phase === 'end') {
        return;
      }

      const point = getCanvasPoint(canvas, event.clientX, event.clientY);
      fireShot(point.x, point.y);
    }
  };

  canvas.addEventListener('mousemove', runtime.handlers.mousemove);
  canvas.addEventListener('mouseleave', runtime.handlers.mouseleave);
  canvas.addEventListener('click', runtime.handlers.click);
}

function enqueueTrigger(targetId, depth, reason, sourceId) {
  if (!state) {
    return false;
  }

  if (state.chainQueue.length >= CONFIG.CHAIN.MAX_QUEUE_SIZE) {
    return false;
  }

  if (state.visitedNodeIds.has(targetId) || state.queuedNodeIds.has(targetId)) {
    return false;
  }

  state.chainQueue.push({
    targetId,
    depth,
    reason,
    sourceId: sourceId || 'unknown'
  });

  state.queuedNodeIds.add(targetId);
  return true;
}

function findProjectileCollision(projectile) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (node.resolved) {
      continue;
    }

    const hitDistance = projectile.radius + node.radius;
    if (distance(projectile.x, projectile.y, node.x, node.y) <= hitDistance) {
      return node;
    }
  }

  return null;
}

function pushNodeAway(originNode, targetNode, impulsePower) {
  const direction = normalize(targetNode.x - originNode.x, targetNode.y - originNode.y) || {
    x: 1,
    y: 0
  };

  targetNode.x = clamp(
    targetNode.x + direction.x * impulsePower,
    targetNode.radius,
    CONFIG.ARENA.WIDTH - targetNode.radius
  );

  targetNode.y = clamp(
    targetNode.y + direction.y * impulsePower,
    targetNode.radius,
    CONFIG.ARENA.HEIGHT - targetNode.radius
  );
}

function scoreNodeReaction(nodeType, depth) {
  const nodeConfig = getNodeTypeConfig(nodeType);
  const comboBonus = Math.min(state.combo, CONFIG.SCORING.MAX_COMBO) * CONFIG.SCORING.COMBO_BONUS;
  const depthBonus = depth * CONFIG.SCORING.DEPTH_BONUS;
  const rawPoints = (nodeConfig.SCORE_VALUE + comboBonus + depthBonus) * state.chainMultiplier;
  return Math.round(rawPoints);
}

function resolveBomb(node, depth) {
  const bombConfig = getNodeTypeConfig('bomb');

  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.resolved || target.id === node.id) {
      continue;
    }

    if (distance(node.x, node.y, target.x, target.y) <= bombConfig.AOE_RADIUS) {
      enqueueTrigger(target.id, depth + 1, 'bomb_aoe', node.id);
    }
  }
}

function resolvePusher(node, depth) {
  const pusherConfig = getNodeTypeConfig('pusher');

  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.resolved || target.id === node.id) {
      continue;
    }

    if (distance(node.x, node.y, target.x, target.y) <= pusherConfig.IMPULSE_RADIUS) {
      pushNodeAway(node, target, pusherConfig.IMPULSE_POWER);
      enqueueTrigger(target.id, depth + 1, 'pusher_impulse', node.id);
    }
  }
}

function applyNodeReaction(node, event) {
  node.resolved = true;

  if (node.type === 'multiplier') {
    const boost = getNodeTypeConfig('multiplier').MULTIPLIER_BOOST;
    state.chainMultiplier = clamp(
      state.chainMultiplier + boost,
      CONFIG.CHAIN.DEFAULT_MULTIPLIER,
      CONFIG.CHAIN.MAX_MULTIPLIER
    );
  }

  const points = scoreNodeReaction(node.type, event.depth);
  state.score += points;
  state.combo = Math.min(state.combo + 1, CONFIG.SCORING.MAX_COMBO);

  state.chainDepth = Math.max(state.chainDepth, event.depth);

  if (state.turnContext) {
    state.turnContext.steps += 1;
    state.turnContext.maxDepth = Math.max(state.turnContext.maxDepth, event.depth);
  }

  emitTelemetry('chain_step', {
    nodeId: node.id,
    nodeType: node.type,
    sourceId: event.sourceId,
    reason: event.reason,
    depth: event.depth,
    scoreAfterStep: state.score,
    chainMultiplier: state.chainMultiplier
  });

  if (node.type === 'bomb') {
    resolveBomb(node, event.depth);
    return;
  }

  if (node.type === 'pusher') {
    resolvePusher(node, event.depth);
  }
}

function finalizeChainResolution(capped) {
  if (!state.turnContext || state.turnContext.resolved) {
    state.phase = 'turn_end';
    state.turnTimer = 0;
    return;
  }

  state.turnContext.resolved = true;

  emitTelemetry('chain_resolved', {
    steps: state.turnContext.steps,
    maxDepth: state.turnContext.maxDepth,
    scoreDelta: state.score - state.turnContext.scoreBefore,
    capped: Boolean(capped)
  });

  state.phase = 'turn_end';
  state.turnTimer = 0;
}

function resolveChainBatch() {
  if (!state.turnContext) {
    state.turnContext = {
      steps: 0,
      maxDepth: 0,
      scoreBefore: state.score,
      resolved: false
    };
  }

  if (state.chainQueue.length === 0) {
    finalizeChainResolution(false);
    return;
  }

  let processed = 0;
  let wasCapped = false;

  while (state.chainQueue.length > 0 && processed < CONFIG.CHAIN.RESOLVE_BATCH_SIZE) {
    if (state.chainStepCount >= CONFIG.CHAIN.MAX_CHAIN_STEPS) {
      wasCapped = true;
      state.chainQueue.length = 0;
      break;
    }

    const event = state.chainQueue.shift();
    state.queuedNodeIds.delete(event.targetId);

    if (state.visitedNodeIds.has(event.targetId)) {
      processed += 1;
      continue;
    }

    const node = getNodeById(event.targetId);
    if (!node || node.resolved) {
      processed += 1;
      continue;
    }

    state.visitedNodeIds.add(event.targetId);
    state.chainStepCount += 1;

    applyNodeReaction(node, event);
    processed += 1;
  }

  if (state.chainQueue.length === 0 || wasCapped) {
    finalizeChainResolution(wasCapped);
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

  const speed = Math.hypot(projectile.vx, projectile.vy);
  const outOfBounds =
    projectile.x < 0 ||
    projectile.x > CONFIG.ARENA.WIDTH ||
    projectile.y < 0 ||
    projectile.y > CONFIG.ARENA.HEIGHT;

  if (
    outOfBounds ||
    speed <= CONFIG.PROJECTILE.MIN_SPEED ||
    projectile.age >= CONFIG.PROJECTILE.MAX_LIFETIME
  ) {
    projectile.alive = false;
    state.phase = 'resolve';
    return;
  }

  const hitNode = findProjectileCollision(projectile);
  if (hitNode) {
    projectile.alive = false;
    enqueueTrigger(hitNode.id, 0, 'direct_hit', 'projectile');
    state.phase = 'resolve';
  }
}

function areAllNodesResolved() {
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (!state.nodes[i].resolved) {
      return false;
    }
  }

  return true;
}

function buildRewardPacket(sourceState) {
  const runState = sourceState || state;
  const meta = getMetaModifiers();

  const score = Math.max(0, runState.score || 0);
  const chainDepth = Math.max(0, runState.chainDepth || 0);
  const result = runState.result || 'lose';

  let credits = Math.floor(score * CONFIG.REWARD.CREDITS_PER_SCORE);
  if (result === 'win') {
    credits += CONFIG.REWARD.WIN_CREDITS_BONUS;
  }

  const techParts = Math.max(0, Math.floor(score / CONFIG.REWARD.SCORE_PER_TECH_PART));

  let moduleChance =
    CONFIG.REWARD.BASE_TECH_MODULE_CHANCE +
    chainDepth * CONFIG.REWARD.CHAIN_DEPTH_CHANCE_STEP +
    (result === 'win' ? CONFIG.REWARD.WIN_CHANCE_BONUS : 0) +
    meta.rewardBonusChance;

  moduleChance = clamp(moduleChance, 0, CONFIG.REWARD.MAX_TECH_MODULE_CHANCE);

  const tags = [];
  if (result === 'win') {
    tags.push('run_complete');
  }
  if (chainDepth >= 3) {
    tags.push('deep_chain');
  }
  if (runState.shotsRemaining >= 2) {
    tags.push('efficient_shooter');
  }
  if (score >= 1000) {
    tags.push('high_score');
  }

  return {
    credits,
    tech_parts: techParts,
    tech_module_chance: Number(moduleChance.toFixed(3)),
    performance_tags: tags
  };
}

function finalizeRun(result) {
  if (state.phase === 'end') {
    return;
  }

  state.result = result;
  state.phase = 'end';

  if (result === 'win') {
    state.score += CONFIG.LEVEL.WIN_CLEAR_BONUS;
    state.score += state.shotsRemaining * CONFIG.SCORING.SHOTS_REMAINING_BONUS;
  }

  state.rewardPacket = buildRewardPacket(state);

  emitTelemetry('run_end', {
    result,
    score: state.score,
    shotsRemaining: state.shotsRemaining,
    chainDepth: state.chainDepth
  });

  emitTelemetry('reward_generated', deepCopyRewardPacket(state.rewardPacket));

  let hookResponse = null;
  try {
    hookResponse = runtime.callbacks.onRunEnd(
      result,
      deepCopyRewardPacket(state.rewardPacket),
      getRunSummary()
    );
  } catch (error) {
    hookResponse = { claimed: false, error: String(error) };
  }

  if (hookResponse && hookResponse.claimed) {
    state.rewardClaimed = true;
    emitTelemetry('reward_claimed', {
      result,
      rewardPacket: deepCopyRewardPacket(state.rewardPacket)
    });
  }
}

function finalizeTurn() {
  state.projectile = null;
  state.chainQueue.length = 0;
  state.queuedNodeIds.clear();
  state.visitedNodeIds.clear();
  state.chainStepCount = 0;
  state.combo = 0;
  state.turnContext = null;
  state.chainMultiplier = getBaseMultiplier();

  if (areAllNodesResolved()) {
    finalizeRun('win');
    return;
  }

  if (state.shotsRemaining <= 0) {
    finalizeRun('lose');
    return;
  }

  state.phase = 'aim';
}

function predictTrajectory(targetX, targetY) {
  if (!state) {
    return [];
  }

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

function drawShooter(ctx) {
  ctx.beginPath();
  ctx.arc(CONFIG.SHOOTER.X, CONFIG.SHOOTER.Y, CONFIG.SHOOTER.RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.COLORS.SHOOTER;
  ctx.fill();
}

function drawNodes(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px monospace';

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    const nodeConfig = getNodeTypeConfig(node.type);

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = node.resolved ? CONFIG.COLORS.NODE_RESOLVED : nodeConfig.COLOR;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = CONFIG.COLORS.ARENA_BORDER;
    ctx.stroke();

    ctx.fillStyle = CONFIG.COLORS.ARENA;
    ctx.fillText(nodeConfig.LABEL, node.x, node.y);
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

function drawHud(ctx) {
  const x = CONFIG.UI.HUD_LEFT;
  const y = CONFIG.UI.HUD_TOP;
  const line = CONFIG.UI.HUD_LINE_HEIGHT;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = CONFIG.UI.HUD_FONT;
  ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;

  ctx.fillText(`Score: ${state.score}`, x, y);
  ctx.fillText(`Shots: ${state.shotsRemaining}`, x, y + line);
  ctx.fillText(`Chain x${state.chainMultiplier}`, x, y + line * 2);
  ctx.fillText(`Depth: ${state.chainDepth}`, x, y + line * 3);

  ctx.font = CONFIG.UI.SMALL_FONT;
  ctx.fillStyle = CONFIG.COLORS.HUD_DIM;
  ctx.fillText(`Run: ${state.runId}`, x, y + line * 4.2);
  ctx.fillText(`Phase: ${state.phase}`, x, y + line * 5.1);

  if (state.phase === 'end') {
    ctx.font = CONFIG.UI.MESSAGE_FONT;
    ctx.fillStyle = state.result === 'win' ? CONFIG.COLORS.END_WIN : CONFIG.COLORS.END_LOSE;

    const message = state.result === 'win' ? 'CHAIN LAB COMPLETE' : 'RUN FAILED';
    ctx.fillText(message, CONFIG.UI.MESSAGE_X, CONFIG.UI.MESSAGE_Y);
  }
}

function tick(dt) {
  if (state.phase === 'simulate') {
    simulateProjectile(dt);
    return;
  }

  if (state.phase === 'resolve') {
    resolveChainBatch();
    return;
  }

  if (state.phase === 'turn_end') {
    state.turnTimer += dt;
    if (state.turnTimer >= CONFIG.RUN.TURN_END_DELAY) {
      finalizeTurn();
    }
  }
}

function initGame(canvas, options) {
  let resolvedCanvas = canvas;
  let resolvedOptions = options || {};

  if (resolvedCanvas && typeof resolvedCanvas.getContext !== 'function') {
    resolvedOptions = resolvedCanvas || {};
    resolvedCanvas = resolvedOptions.canvas || null;
  }

  runtime.options = {
    debugTelemetry: Boolean(resolvedOptions.debugTelemetry),
    metaModifiers: Object.assign(
      {
        extraShots: 0,
        chainMultiplierBonus: 0,
        rewardBonusChance: 0
      },
      resolvedOptions.metaModifiers || {}
    )
  };

  runtime.callbacks.onRunEnd =
    typeof resolvedOptions.onRunEnd === 'function' ? resolvedOptions.onRunEnd : onRunEndStub;

  if (!resolvedCanvas && typeof document !== 'undefined') {
    resolvedCanvas = document.getElementById(CONFIG.CANVAS_ID);
  }

  if (resolvedCanvas) {
    if (!resolvedCanvas.width) {
      resolvedCanvas.width = CONFIG.ARENA.WIDTH;
    }

    if (!resolvedCanvas.height) {
      resolvedCanvas.height = CONFIG.ARENA.HEIGHT;
    }

    bindInput(resolvedCanvas);
  }

  return resetLevel(resolvedOptions.seed);
}

function resetLevel(seed) {
  const resolvedSeed = Number.isFinite(Number(seed)) ? Number(seed) : Date.now();
  state = createInitialState(resolvedSeed);

  emitTelemetry('run_start', {
    seed: resolvedSeed,
    shotsRemaining: state.shotsRemaining,
    chainMultiplier: state.chainMultiplier
  });

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
  state.phase = 'simulate';

  state.chainQueue.length = 0;
  state.queuedNodeIds.clear();
  state.visitedNodeIds.clear();
  state.chainStepCount = 0;
  state.combo = 0;
  state.turnContext = {
    steps: 0,
    maxDepth: 0,
    scoreBefore: state.score,
    resolved: false
  };
  state.chainMultiplier = getBaseMultiplier();

  emitTelemetry('shot_fired', {
    targetX,
    targetY,
    shotsRemaining: state.shotsRemaining,
    projectileSpeed: CONFIG.PROJECTILE.SPEED
  });

  return true;
}

function update(dt) {
  if (!state) {
    initGame();
  }

  if (state.phase === 'end') {
    return;
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
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  ctx.fillStyle = CONFIG.COLORS.ARENA;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  ctx.strokeStyle = CONFIG.COLORS.ARENA_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  if (state.phase === 'aim' && state.aim.active && state.shotsRemaining > 0) {
    drawTrajectory(ctx);
  }

  drawShooter(ctx);
  drawNodes(ctx);
  drawProjectile(ctx);
  drawHud(ctx);
}

function getRunSummary() {
  if (!state) {
    return null;
  }

  return {
    runId: state.runId,
    result: state.result || 'in_progress',
    phase: state.phase,
    score: state.score,
    shotsRemaining: state.shotsRemaining,
    chainMultiplier: state.chainMultiplier,
    chainDepth: state.chainDepth,
    rewardClaimed: state.rewardClaimed,
    rewardPacket: deepCopyRewardPacket(state.rewardPacket),
    telemetry: state.telemetry.slice()
  };
}

const ChainLabGame = {
  CONFIG,
  initGame,
  resetLevel,
  fireShot,
  update,
  render,
  getRunSummary,
  buildRewardPacket
};

if (typeof window !== 'undefined') {
  window.ChainLabGame = ChainLabGame;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChainLabGame;
}
