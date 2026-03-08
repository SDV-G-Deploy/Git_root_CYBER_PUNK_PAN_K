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
      RESOLVED_COLOR: '#3a4751',
      TYPES: {
        bomb: {
          color: '#ff5d73',
          label: 'B',
          score: 110
        },
        pusher: {
          color: '#5cc8ff',
          label: 'P',
          score: 100
        },
        multiplier: {
          color: '#9bff8a',
          label: 'M',
          score: 95
        }
      }
    },
    DEFAULT_LEVEL: {
      id: 'L01',
      shotsLimit: 1,
      targetScore: 120,
      difficultyTag: 'light',
      nodes: [
        { id: 'n1', type: 'bomb', x: 560, y: 180 },
        { id: 'n2', type: 'multiplier', x: 680, y: 260 },
        { id: 'n3', type: 'pusher', x: 760, y: 320 }
      ]
    },
    TRAJECTORY: {
      STEPS: 36,
      STEP_TIME: 0.05,
      WIDTH: 2,
      DASH_PATTERN: [7, 7],
      COLOR: '#b5f3ff'
    },
    CHAIN: {
      MAX_QUEUE_SIZE: 256,
      MAX_STEPS: 96,
      RESOLVE_BATCH_SIZE: 10,
      BOMB_RADIUS: 150,
      PUSHER_RADIUS: 130,
      PUSHER_FORCE: 42,
      MULTIPLIER_STEP: 1,
      MAX_MULTIPLIER: 6,
      DEPTH_BONUS: 12,
      START_MULTIPLIER: 1
    },
    RUN: {
      WIN_TEXT: 'Target reached. Continue to next level.',
      LOSE_TEXT: 'Shots depleted. Retry current level.',
      WIN_COLOR: '#8dffba',
      LOSE_COLOR: '#ff9fa9',
      LABEL_X: 245,
      LABEL_Y: 40,
      LABEL_FONT: 'bold 20px monospace'
    },
    REWARD: {
      CREDIT_PER_SCORE: 0.12,
      WIN_BONUS_CREDITS: 25,
      SCORE_PER_PART: 140,
      BASE_MODULE_CHANCE: 0.05,
      DEPTH_MODULE_STEP: 0.05,
      MAX_MODULE_CHANCE: 0.8
    },
    MODIFIERS: {
      SCORE_BONUS_MIN: 0,
      SCORE_BONUS_MAX: 0.5,
      CHAIN_GROWTH_MIN: 0,
      CHAIN_GROWTH_MAX: 0.25
    },
    VISUAL: {
      MAX_CHAIN_LINKS: 16,
      CHAIN_LINK_TTL: 0.7,
      CHAIN_LINK_WIDTH: 2,
      CHAIN_LINK_COLOR: '#ffe082',
      HIT_FLASH_TTL: 0.22,
      HIT_FLASH_MAX_ALPHA: 0.42,
      SCREEN_SHAKE_TTL: 0.18,
      SCREEN_SHAKE_POWER: 7,
      PARTICLE_TTL: 0.55,
      PARTICLE_DRAG_PER_SECOND: 1.7,
      PARTICLE_SPEED_MIN: 65,
      PARTICLE_SPEED_MAX: 210,
      PARTICLE_RADIUS: 2.5,
      PARTICLE_COUNT_MIN: 8,
      PARTICLE_COUNT_MAX: 14,
      CHAIN_CUE_TTL: 0.75,
      CHAIN_CUE_FONT: 'bold 14px monospace',
      CHAIN_CUE_COLOR: '#fff4bc',
      TRAJECTORY_UNDERLAY_WIDTH: 5,
      TRAJECTORY_UNDERLAY_COLOR: 'rgba(181, 243, 255, 0.26)',
      TRAJECTORY_DOT_RADIUS: 2,
      TRAJECTORY_DOT_STEP: 4,
      AIM_END_RADIUS: 8,
      AIM_END_COLOR: '#d8f6ff'
    },
    LABEL: {
      FONT: 'bold 12px monospace',
      COLOR: '#0c1f2b'
    },
    SIMULATION: {
      FIXED_DT: 1 / 120,
      MAX_DT: 0.25,
      MAX_STEPS: 12,
      MS_THRESHOLD: 10
    },
    EPSILON: 0.0001
  });

  const runtime = {
    canvas: null,
    state: null,
    levels: [],
    levelIndex: 0,
    telemetryLog: [],
    modifiers: {
      scoreBonus: 0,
      chainGrowthBonus: 0
    },
    callbacks: {
      onRunEnd: onRunEndStub
    }
  };

  function onRunEndStub() {
    return null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
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

  function normalizeModifiers(modifiers) {
    const source = modifiers || {};

    return {
      scoreBonus: clamp(
        Number(source.scoreBonus) || 0,
        CONFIG.MODIFIERS.SCORE_BONUS_MIN,
        CONFIG.MODIFIERS.SCORE_BONUS_MAX
      ),
      chainGrowthBonus: clamp(
        Number(source.chainGrowthBonus) || 0,
        CONFIG.MODIFIERS.CHAIN_GROWTH_MIN,
        CONFIG.MODIFIERS.CHAIN_GROWTH_MAX
      )
    };
  }

  function createRunId() {
    const now = Date.now().toString(36);
    const random = Math.floor(Math.random() * 0xffffff).toString(36);
    return `run_${now}_${random}`;
  }

  function normalizeLevelNode(node, idx) {
    const type = Object.prototype.hasOwnProperty.call(CONFIG.NODES.TYPES, node.type)
      ? node.type
      : 'bomb';

    return {
      id: String(node.id || `n${idx + 1}`),
      type,
      x: Number(node.x) || 500,
      y: Number(node.y) || 250
    };
  }

  function normalizeLevel(level, idx) {
    const fallbackId = `L${String(idx + 1).padStart(2, '0')}`;
    const rawNodes = Array.isArray(level.nodes) ? level.nodes : [];

    return {
      id: String(level.id || fallbackId),
      shotsLimit: Math.max(1, Number(level.shotsLimit) || 1),
      targetScore: Math.max(0, Number(level.targetScore) || 0),
      difficultyTag: String(level.difficultyTag || 'light'),
      nodes: rawNodes.map((node, nodeIdx) => normalizeLevelNode(node, nodeIdx))
    };
  }

  function getGlobalLevels() {
    if (typeof window !== 'undefined' && Array.isArray(window.CHAIN_LAB_LEVELS)) {
      return window.CHAIN_LAB_LEVELS;
    }

    return [CONFIG.DEFAULT_LEVEL];
  }

  function setLevels(levels) {
    const source = Array.isArray(levels) && levels.length > 0 ? levels : getGlobalLevels();
    runtime.levels = source.map((level, index) => normalizeLevel(level, index));

    if (runtime.levels.length === 0) {
      runtime.levels = [normalizeLevel(CONFIG.DEFAULT_LEVEL, 0)];
    }

    runtime.levelIndex = clamp(runtime.levelIndex, 0, runtime.levels.length - 1);
  }

  function getCurrentLevel() {
    return runtime.levels[runtime.levelIndex] || runtime.levels[0] || normalizeLevel(CONFIG.DEFAULT_LEVEL, 0);
  }

  function createNodes(level) {
    return level.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      radius: CONFIG.NODES.RADIUS,
      resolved: false
    }));
  }

  function createChainState() {
    return {
      queue: [],
      queuedIds: new Set(),
      visitedIds: new Set(),
      steps: 0,
      maxDepth: 0,
      multiplier: CONFIG.CHAIN.START_MULTIPLIER,
      capped: false
    };
  }

  function createState(level) {
    return {
      runId: createRunId(),
      levelId: level.id,
      levelIndex: runtime.levelIndex,
      levelCount: runtime.levels.length,
      targetScore: level.targetScore,
      difficultyTag: level.difficultyTag,
      score: 0,
      shotsRemaining: level.shotsLimit,
      shotsFired: 0,
      shotsHit: 0,
      phase: 'aim',
      result: 'in_progress',
      ended: false,
      lastShotHit: false,
      projectile: null,
      nodes: createNodes(level),
      aim: {
        x: CONFIG.SHOOTER.X + 120,
        y: CONFIG.SHOOTER.Y,
        active: false
      },
      chain: createChainState(),
      rewardPacket: null,
      telemetry: [],
      visualLinks: [],
      particles: [],
      chainCues: [],
      hitFlashTtl: 0,
      screenShakeTtl: 0,
      accumulator: 0
    };
  }

  function getState() {
    return runtime.state;
  }

  function emitTelemetry(eventType, payload) {
    const state = getState();
    if (!state) {
      return;
    }

    const entry = {
      timestamp: Date.now(),
      runId: state.runId,
      eventType,
      payload: payload || {}
    };

    state.telemetry.push(entry);
    runtime.telemetryLog.push(entry);
  }

  function trackEvent(eventType, payload) {
    emitTelemetry(eventType, payload);
  }

  function exportTelemetry(format) {
    const mode = format || 'json';

    if (mode === 'jsonl') {
      return runtime.telemetryLog.map((entry) => JSON.stringify(entry)).join('\n');
    }

    return JSON.stringify(runtime.telemetryLog, null, 2);
  }

  function getAccuracy(state) {
    const runState = state || getState();
    if (!runState || runState.shotsFired <= 0) {
      return 0;
    }

    return runState.shotsHit / runState.shotsFired;
  }

  function buildRewardPacket(sourceState) {
    const state = sourceState || getState();

    const creditsBase = Math.floor(state.score * CONFIG.REWARD.CREDIT_PER_SCORE);
    const credits = creditsBase + (state.result === 'win' ? CONFIG.REWARD.WIN_BONUS_CREDITS : 0);

    const techParts = Math.max(0, Math.floor(state.score / CONFIG.REWARD.SCORE_PER_PART));

    const moduleChanceRaw =
      CONFIG.REWARD.BASE_MODULE_CHANCE + state.chain.maxDepth * CONFIG.REWARD.DEPTH_MODULE_STEP;
    const moduleChance = clamp(moduleChanceRaw, 0, CONFIG.REWARD.MAX_MODULE_CHANCE);

    const tags = [];
    if (state.result === 'win') {
      tags.push('run_complete');
    }
    if (state.chain.maxDepth >= 2) {
      tags.push('deep_chain');
    }
    if (getAccuracy(state) >= 1) {
      tags.push('accurate');
    }

    return {
      credits,
      tech_parts: techParts,
      tech_module_chance: Number(moduleChance.toFixed(3)),
      performance_tags: tags
    };
  }

  function getRunSummary() {
    const state = getState();
    if (!state) {
      return null;
    }

    return {
      runId: state.runId,
      levelId: state.levelId,
      levelIndex: state.levelIndex,
      levelCount: state.levelCount,
      targetScore: state.targetScore,
      difficultyTag: state.difficultyTag,
      result: state.result,
      phase: state.phase,
      score: state.score,
      shotsRemaining: state.shotsRemaining,
      shotsFired: state.shotsFired,
      shotsHit: state.shotsHit,
      chainDepth: state.chain.maxDepth,
      chainSteps: state.chain.steps,
      accuracy: Number((getAccuracy(state) * 100).toFixed(1)),
      rewardPacket: state.rewardPacket
    };
  }

  function getSnapshot() {
    const state = getState();
    if (!state) {
      return null;
    }

    return {
      levelId: state.levelId,
      levelIndex: state.levelIndex,
      levelCount: state.levelCount,
      targetScore: state.targetScore,
      difficultyTag: state.difficultyTag,
      score: state.score,
      shotsRemaining: state.shotsRemaining,
      phase: state.phase,
      lastShotHit: state.lastShotHit,
      chainDepth: state.chain.maxDepth,
      chainSteps: state.chain.steps,
      result: state.result
    };
  }

  function getLevelList() {
    return runtime.levels.map((level, index) => ({
      index,
      id: level.id,
      shotsLimit: level.shotsLimit,
      targetScore: level.targetScore,
      difficultyTag: level.difficultyTag
    }));
  }

  function getCurrentLevelIndex() {
    return runtime.levelIndex;
  }

  function evaluateRunOutcome() {
    const state = getState();

    if (state.score >= state.targetScore) {
      finalizeRun('win');
      return;
    }

    if (state.shotsRemaining <= 0) {
      finalizeRun('lose');
      return;
    }

    state.projectile = null;
    state.phase = 'aim';
  }

  function finalizeRun(result) {
    const state = getState();

    if (state.ended) {
      return;
    }

    state.ended = true;
    state.result = result;
    state.phase = 'end';
    state.rewardPacket = buildRewardPacket(state);

    emitTelemetry('run_end', {
      levelId: state.levelId,
      result,
      score: state.score,
      targetScore: state.targetScore,
      chainDepth: state.chain.maxDepth,
      accuracy: Number((getAccuracy(state) * 100).toFixed(1))
    });

    emitTelemetry('reward_generated', {
      levelId: state.levelId,
      rewardPacket: state.rewardPacket
    });

    try {
      runtime.callbacks.onRunEnd(result, state.rewardPacket, getRunSummary());
    } catch (error) {
      // No-op in MVP: callback failures must not break local run.
    }
  }

  function startLevel(levelIndex) {
    runtime.levelIndex = clamp(levelIndex, 0, runtime.levels.length - 1);
    const level = getCurrentLevel();
    runtime.state = createState(level);

    emitTelemetry('run_start', {
      levelId: level.id,
      levelIndex: runtime.levelIndex,
      shotsLimit: level.shotsLimit,
      targetScore: level.targetScore,
      difficultyTag: level.difficultyTag
    });

    return getSnapshot();
  }

  function initGame(canvas, options) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('initGame requires a valid canvas element.');
    }

    const config = options || {};
    runtime.callbacks.onRunEnd =
      typeof config.onRunEnd === 'function' ? config.onRunEnd : onRunEndStub;

    runtime.canvas = canvas;

    if (!canvas.width) {
      canvas.width = CONFIG.ARENA.WIDTH;
    }

    if (!canvas.height) {
      canvas.height = CONFIG.ARENA.HEIGHT;
    }

    setLevels(config.levels);
    runtime.modifiers = normalizeModifiers(config.modifiers);

    const startIndex = Number.isInteger(config.startLevelIndex) ? config.startLevelIndex : 0;
    return startLevel(startIndex);
  }

  function resetLevel() {
    if (!runtime.canvas) {
      throw new Error('resetLevel called before initGame.');
    }

    return startLevel(runtime.levelIndex);
  }

  function setLevel(levelIndex) {
    if (!runtime.canvas) {
      throw new Error('setLevel called before initGame.');
    }

    return startLevel(levelIndex);
  }

  function nextLevel() {
    if (!runtime.canvas) {
      throw new Error('nextLevel called before initGame.');
    }

    if (runtime.levelIndex >= runtime.levels.length - 1) {
      return false;
    }

    startLevel(runtime.levelIndex + 1);
    return true;
  }

  function setModifiers(modifiers) {
    runtime.modifiers = normalizeModifiers(modifiers);
    return { ...runtime.modifiers };
  }

  function getModifiers() {
    return { ...runtime.modifiers };
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

  function getNodeById(nodeId) {
    const state = getState();
    for (let i = 0; i < state.nodes.length; i += 1) {
      if (state.nodes[i].id === nodeId) {
        return state.nodes[i];
      }
    }

    return null;
  }

  function findSourcePosition(sourceId) {
    if (sourceId === 'projectile') {
      return {
        x: CONFIG.SHOOTER.X,
        y: CONFIG.SHOOTER.Y
      };
    }

    const sourceNode = getNodeById(sourceId);
    if (!sourceNode) {
      return null;
    }

    return {
      x: sourceNode.x,
      y: sourceNode.y
    };
  }

  function addVisualLink(sourceId, targetNode) {
    const state = getState();
    const source = findSourcePosition(sourceId);
    if (!source || !targetNode) {
      return;
    }

    state.visualLinks.push({
      x1: source.x,
      y1: source.y,
      x2: targetNode.x,
      y2: targetNode.y,
      ttl: CONFIG.VISUAL.CHAIN_LINK_TTL
    });

    if (state.visualLinks.length > CONFIG.VISUAL.MAX_CHAIN_LINKS) {
      state.visualLinks.splice(0, state.visualLinks.length - CONFIG.VISUAL.MAX_CHAIN_LINKS);
    }
  }

  function updateVisualLinks(dt) {
    const state = getState();

    for (let i = state.visualLinks.length - 1; i >= 0; i -= 1) {
      state.visualLinks[i].ttl -= dt;
      if (state.visualLinks[i].ttl <= 0) {
        state.visualLinks.splice(i, 1);
      }
    }
  }

  function spawnHitParticles(x, y) {
    const state = getState();
    const rawCount = randomRange(CONFIG.VISUAL.PARTICLE_COUNT_MIN, CONFIG.VISUAL.PARTICLE_COUNT_MAX + 1);
    const count = Math.floor(rawCount);

    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(CONFIG.VISUAL.PARTICLE_SPEED_MIN, CONFIG.VISUAL.PARTICLE_SPEED_MAX);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl: CONFIG.VISUAL.PARTICLE_TTL
      });
    }
  }

  function createHitFeedback(node, stepIndex) {
    const state = getState();

    state.hitFlashTtl = CONFIG.VISUAL.HIT_FLASH_TTL;
    state.screenShakeTtl = CONFIG.VISUAL.SCREEN_SHAKE_TTL;

    state.chainCues.push({
      x: node.x,
      y: node.y - node.radius - 14,
      ttl: CONFIG.VISUAL.CHAIN_CUE_TTL,
      step: stepIndex
    });

    spawnHitParticles(node.x, node.y);
  }

  function updateParticles(dt) {
    const state = getState();

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      const drag = Math.max(0, 1 - CONFIG.VISUAL.PARTICLE_DRAG_PER_SECOND * dt);
      particle.vx *= drag;
      particle.vy *= drag;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.ttl -= dt;

      if (particle.ttl <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  function updateChainCues(dt) {
    const state = getState();

    for (let i = state.chainCues.length - 1; i >= 0; i -= 1) {
      const cue = state.chainCues[i];
      cue.ttl -= dt;
      cue.y -= dt * 20;

      if (cue.ttl <= 0) {
        state.chainCues.splice(i, 1);
      }
    }
  }

  function updateFeedbackTimers(dt) {
    const state = getState();

    state.hitFlashTtl = Math.max(0, state.hitFlashTtl - dt);
    state.screenShakeTtl = Math.max(0, state.screenShakeTtl - dt);
  }

  function enqueueChainNode(nodeId, depth, reason, sourceId) {
    const state = getState();
    if (state.chain.queue.length >= CONFIG.CHAIN.MAX_QUEUE_SIZE) {
      return false;
    }

    if (state.chain.queuedIds.has(nodeId) || state.chain.visitedIds.has(nodeId)) {
      return false;
    }

    state.chain.queue.push({ nodeId, depth, reason, sourceId });
    state.chain.queuedIds.add(nodeId);
    return true;
  }

  function startChainFrom(nodeId) {
    const state = getState();
    state.chain = createChainState();
    enqueueChainNode(nodeId, 0, 'direct_hit', 'projectile');
    state.phase = 'resolve';
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
    state.shotsFired += 1;
    state.lastShotHit = false;
    state.phase = 'simulate';

    emitTelemetry('shot_fired', {
      levelId: state.levelId,
      shotsRemaining: state.shotsRemaining,
      targetX,
      targetY,
      speed: CONFIG.PROJECTILE.SPEED
    });

    return true;
  }

  function pushNode(origin, target) {
    const direction = normalize(target.x - origin.x, target.y - origin.y) || { x: 1, y: 0 };

    target.x = clamp(
      target.x + direction.x * CONFIG.CHAIN.PUSHER_FORCE,
      target.radius,
      CONFIG.ARENA.WIDTH - target.radius
    );
    target.y = clamp(
      target.y + direction.y * CONFIG.CHAIN.PUSHER_FORCE,
      target.radius,
      CONFIG.ARENA.HEIGHT - target.radius
    );
  }

  function resolveBomb(node, depth) {
    const state = getState();

    for (let i = 0; i < state.nodes.length; i += 1) {
      const target = state.nodes[i];
      if (target.id === node.id || target.resolved) {
        continue;
      }

      if (distance(node.x, node.y, target.x, target.y) <= CONFIG.CHAIN.BOMB_RADIUS) {
        enqueueChainNode(target.id, depth + 1, 'bomb_aoe', node.id);
      }
    }
  }

  function resolvePusher(node, depth) {
    const state = getState();

    for (let i = 0; i < state.nodes.length; i += 1) {
      const target = state.nodes[i];
      if (target.id === node.id || target.resolved) {
        continue;
      }

      if (distance(node.x, node.y, target.x, target.y) <= CONFIG.CHAIN.PUSHER_RADIUS) {
        pushNode(node, target);
        enqueueChainNode(target.id, depth + 1, 'pusher_impulse', node.id);
      }
    }
  }

  function applyNodeScore(nodeType, depth) {
    const state = getState();
    const typeConfig = CONFIG.NODES.TYPES[nodeType];
    const depthBonus = depth * CONFIG.CHAIN.DEPTH_BONUS;
    const basePoints = typeConfig.score + depthBonus;
    const scoreFactor = 1 + runtime.modifiers.scoreBonus;
    const points = Math.round(basePoints * state.chain.multiplier * scoreFactor);

    state.score += points;
    return points;
  }

  function resolveNode(event) {
    const state = getState();
    const node = getNodeById(event.nodeId);
    if (!node || node.resolved) {
      return;
    }

    node.resolved = true;
    state.lastShotHit = true;
    state.chain.maxDepth = Math.max(state.chain.maxDepth, event.depth);

    if (node.type === 'multiplier') {
      const growthStep = CONFIG.CHAIN.MULTIPLIER_STEP * (1 + runtime.modifiers.chainGrowthBonus);
      state.chain.multiplier = clamp(
        state.chain.multiplier + growthStep,
        CONFIG.CHAIN.START_MULTIPLIER,
        CONFIG.CHAIN.MAX_MULTIPLIER
      );
    }

    const points = applyNodeScore(node.type, event.depth);

    addVisualLink(event.sourceId, node);
    createHitFeedback(node, state.chain.steps);

    emitTelemetry('chain_step', {
      levelId: state.levelId,
      nodeId: node.id,
      nodeType: node.type,
      sourceId: event.sourceId,
      reason: event.reason,
      depth: event.depth,
      points,
      chainMultiplier: state.chain.multiplier
    });

    if (node.type === 'bomb') {
      resolveBomb(node, event.depth);
      return;
    }

    if (node.type === 'pusher') {
      resolvePusher(node, event.depth);
    }
  }

  function resolveChain() {
    const state = getState();

    let processed = 0;
    while (state.chain.queue.length > 0 && processed < CONFIG.CHAIN.RESOLVE_BATCH_SIZE) {
      if (state.chain.steps >= CONFIG.CHAIN.MAX_STEPS) {
        state.chain.capped = true;
        state.chain.queue.length = 0;
        break;
      }

      const event = state.chain.queue.shift();
      state.chain.queuedIds.delete(event.nodeId);

      if (state.chain.visitedIds.has(event.nodeId)) {
        processed += 1;
        continue;
      }

      state.chain.visitedIds.add(event.nodeId);
      state.chain.steps += 1;

      resolveNode(event);
      processed += 1;
    }

    if (state.chain.queue.length === 0) {
      emitTelemetry('chain_resolved', {
        levelId: state.levelId,
        steps: state.chain.steps,
        maxDepth: state.chain.maxDepth,
        capped: state.chain.capped
      });

      evaluateRunOutcome();
    }
  }

  function simulateProjectile(dt) {
    const state = getState();
    const projectile = state.projectile;

    if (!projectile || !projectile.alive) {
      state.lastShotHit = false;
      evaluateRunOutcome();
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
      evaluateRunOutcome();
      return;
    }

    const hitNode = findHitNode(projectile);
    if (hitNode) {
      projectile.alive = false;
      state.shotsHit += 1;
      startChainFrom(hitNode.id);
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
    if (!state) {
      return;
    }

    let delta = Number(dt) || 0;
    if (delta > CONFIG.SIMULATION.MS_THRESHOLD) {
      delta /= 1000;
    }

    delta = clamp(delta, 0, CONFIG.SIMULATION.MAX_DT);
    updateVisualLinks(delta);
    updateParticles(delta);
    updateChainCues(delta);
    updateFeedbackTimers(delta);

    if (state.phase === 'end') {
      return;
    }

    if (state.phase === 'resolve') {
      resolveChain();
      return;
    }

    if (state.phase !== 'simulate') {
      return;
    }

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

    ctx.strokeStyle = CONFIG.VISUAL.TRAJECTORY_UNDERLAY_COLOR;
    ctx.lineWidth = CONFIG.VISUAL.TRAJECTORY_UNDERLAY_WIDTH;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = CONFIG.TRAJECTORY.COLOR;
    ctx.lineWidth = CONFIG.TRAJECTORY.WIDTH;
    ctx.setLineDash(CONFIG.TRAJECTORY.DASH_PATTERN);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = CONFIG.TRAJECTORY.COLOR;
    for (let i = 0; i < points.length; i += CONFIG.VISUAL.TRAJECTORY_DOT_STEP) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, CONFIG.VISUAL.TRAJECTORY_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    const endPoint = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, CONFIG.VISUAL.AIM_END_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = CONFIG.VISUAL.AIM_END_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.restore();
  }

  function drawChainLinks(ctx) {
    const state = getState();
    if (state.visualLinks.length === 0) {
      return;
    }

    ctx.save();
    ctx.lineWidth = CONFIG.VISUAL.CHAIN_LINK_WIDTH;

    for (let i = 0; i < state.visualLinks.length; i += 1) {
      const link = state.visualLinks[i];
      const alpha = clamp(link.ttl / CONFIG.VISUAL.CHAIN_LINK_TTL, 0, 1);
      ctx.strokeStyle = `rgba(255, 224, 130, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      ctx.lineTo(link.x2, link.y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles(ctx) {
    const state = getState();
    if (state.particles.length === 0) {
      return;
    }

    ctx.save();
    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      const alpha = clamp(particle.ttl / CONFIG.VISUAL.PARTICLE_TTL, 0, 1);
      ctx.fillStyle = `rgba(255, 226, 150, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, CONFIG.VISUAL.PARTICLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChainCues(ctx) {
    const state = getState();
    if (state.chainCues.length === 0) {
      return;
    }

    ctx.save();
    ctx.font = CONFIG.VISUAL.CHAIN_CUE_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < state.chainCues.length; i += 1) {
      const cue = state.chainCues[i];
      const alpha = clamp(cue.ttl / CONFIG.VISUAL.CHAIN_CUE_TTL, 0, 1);
      ctx.fillStyle = `rgba(255, 244, 188, ${alpha.toFixed(3)})`;
      ctx.fillText(`#${cue.step}`, cue.x, cue.y);
    }

    ctx.restore();
  }

  function drawHitFlash(ctx) {
    const state = getState();
    if (state.hitFlashTtl <= 0) {
      return;
    }

    const alphaBase = clamp(state.hitFlashTtl / CONFIG.VISUAL.HIT_FLASH_TTL, 0, 1);
    const alpha = alphaBase * CONFIG.VISUAL.HIT_FLASH_MAX_ALPHA;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
    ctx.restore();
  }

  function drawEndHint(ctx) {
    const state = getState();
    if (state.phase !== 'end') {
      return;
    }

    ctx.font = CONFIG.RUN.LABEL_FONT;
    ctx.fillStyle = state.result === 'win' ? CONFIG.RUN.WIN_COLOR : CONFIG.RUN.LOSE_COLOR;
    ctx.fillText(
      state.result === 'win' ? CONFIG.RUN.WIN_TEXT : CONFIG.RUN.LOSE_TEXT,
      CONFIG.RUN.LABEL_X,
      CONFIG.RUN.LABEL_Y
    );
  }

  function render(ctx) {
    const state = getState();
    if (!state || !ctx) {
      return;
    }

    const shakeIntensity = clamp(state.screenShakeTtl / CONFIG.VISUAL.SCREEN_SHAKE_TTL, 0, 1);
    const shakePower = CONFIG.VISUAL.SCREEN_SHAKE_POWER * shakeIntensity;
    const offsetX = (Math.random() * 2 - 1) * shakePower;
    const offsetY = (Math.random() * 2 - 1) * shakePower;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    drawArena(ctx);
    drawAimPreview(ctx);
    drawChainLinks(ctx);
    drawParticles(ctx);
    drawShooter(ctx);
    drawNodes(ctx);
    drawProjectile(ctx);
    drawChainCues(ctx);
    ctx.restore();

    drawHitFlash(ctx);
    drawEndHint(ctx);
  }

  return {
    CONFIG,
    initGame,
    resetLevel,
    setLevel,
    nextLevel,
    setModifiers,
    getModifiers,
    setAim,
    fireShot,
    update,
    render,
    getSnapshot,
    getRunSummary,
    getLevelList,
    getCurrentLevelIndex,
    buildRewardPacket,
    trackEvent,
    exportTelemetry
  };
})();

if (typeof window !== 'undefined') {
  window.ChainLabGame = ChainLabGame;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChainLabGame;
}
