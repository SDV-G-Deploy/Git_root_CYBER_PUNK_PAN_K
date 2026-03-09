import { CONFIG } from './config.js';
import {
  bumpRevision,
  createLastShotReport,
  createState,
  getChainTrace,
  getLastShotReport,
  getRunSummary,
  getSnapshot
} from './gameState.js';
import { loadLevels, clampLevelIndex } from './levels.js';
import {
  clamp,
  distance,
  integrateProjectile,
  findHitNodeAt,
  findHitNodeSwept,
  randomRange
} from './physicsLite.js';
import { createProjectile } from './projectile.js';
import { createTelemetryStore } from './telemetry.js';
import { buildRewardPacket, finalizeLastShotReport, getAccuracy } from './scoring.js';
import { enqueueChainNode, resolveChainStep, resetChainForShot, startChainFrom } from './energySystem.js';
import { resolveNodeEvent } from './node.js';
import { renderState } from './render.js';

function onRunEndStub() {
  return null;
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

export function createChainLabEngine() {
  const runtime = {
    canvas: null,
    state: null,
    levels: [],
    levelIndex: 0,
    modifiers: {
      scoreBonus: 0,
      chainGrowthBonus: 0
    },
    callbacks: {
      onRunEnd: onRunEndStub
    },
    telemetry: createTelemetryStore(CONFIG.TELEMETRY.MAX_LOG_ENTRIES)
  };

  function getState() {
    return runtime.state;
  }

  function emitTelemetry(eventType, payload) {
    return runtime.telemetry.emit(getState(), eventType, payload);
  }

  function markDirty() {
    const state = getState();
    if (state) {
      bumpRevision(state);
    }
  }

  function setLevels(levels) {
    runtime.levels = loadLevels(levels);
    runtime.levelIndex = clampLevelIndex(runtime.levelIndex, runtime.levels);
  }

  function getCurrentLevel() {
    return runtime.levels[runtime.levelIndex] || runtime.levels[0];
  }

  function getNodeById(nodeId) {
    const state = getState();
    if (!state) {
      return null;
    }

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

  function updateVisualLinks(dt) {
    const state = getState();

    for (let i = state.visualLinks.length - 1; i >= 0; i -= 1) {
      state.visualLinks[i].ttl -= dt;
      if (state.visualLinks[i].ttl <= 0) {
        state.visualLinks.splice(i, 1);
      }
    }
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

  function getSummaryInternal() {
    const state = getState();
    if (!state) {
      return null;
    }

    return getRunSummary(state, Number((getAccuracy(state) * 100).toFixed(1)));
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
    markDirty();

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
      runtime.callbacks.onRunEnd(result, state.rewardPacket, getSummaryInternal());
    } catch (error) {
      // Callback failures must not break local run.
    }
  }

  function evaluateRunOutcome() {
    const state = getState();

    if (state.score >= state.targetScore) {
      finalizeLastShotReport(state, 'win');
      finalizeRun('win');
      return;
    }

    if (state.shotsRemaining <= 0) {
      finalizeLastShotReport(
        state,
        state.lastShotReport && state.lastShotReport.hit
          ? 'lose_hit_not_enough_score'
          : 'lose_miss'
      );
      finalizeRun('lose');
      return;
    }

    finalizeLastShotReport(
      state,
      state.lastShotReport && state.lastShotReport.hit ? 'continue_hit' : 'continue_miss'
    );

    state.projectile = null;
    state.phase = 'aim';
    markDirty();
  }

  function startLevel(levelIndex) {
    runtime.levelIndex = clampLevelIndex(levelIndex, runtime.levels);
    const level = getCurrentLevel();
    runtime.state = createState(level, runtime.levelIndex, runtime.levels.length);

    emitTelemetry('run_start', {
      levelId: level.id,
      levelIndex: runtime.levelIndex,
      shotsLimit: level.shotsLimit,
      targetScore: level.targetScore,
      difficultyTag: level.difficultyTag
    });

    return getSnapshot(runtime.state);
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
    markDirty();
  }

  function fireShot(targetX, targetY) {
    const state = getState();

    if (!state || state.phase !== 'aim' || state.shotsRemaining <= 0) {
      return false;
    }

    const projectile = createProjectile(targetX, targetY);
    if (!projectile) {
      return false;
    }

    resetChainForShot(state);
    state.lastShotReport = createLastShotReport(state.score);
    state.lastShotReport.fired = true;
    state.lastShotReport.resolution = 'in_flight';

    state.projectile = projectile;
    state.shotsRemaining -= 1;
    state.shotsFired += 1;
    state.lastShotHit = false;
    state.phase = 'simulate';
    markDirty();

    emitTelemetry('shot_fired', {
      levelId: state.levelId,
      shotsRemaining: state.shotsRemaining,
      targetX,
      targetY,
      speed: CONFIG.PROJECTILE.SPEED
    });

    return true;
  }

  function resolveNode(event) {
    const state = getState();

    return resolveNodeEvent({
      state,
      event,
      modifiers: runtime.modifiers,
      getNodeById,
      enqueueChainNode: (nodeId, depth, reason, sourceId) =>
        enqueueChainNode(state, nodeId, depth, reason, sourceId),
      addVisualLink,
      createHitFeedback,
      emitTelemetry
    });
  }

  function resolveChain() {
    const state = getState();

    const isResolved = resolveChainStep(
      state,
      (event) => {
        const result = resolveNode(event);
        if (result) {
          markDirty();
        }
      },
      emitTelemetry
    );

    if (isResolved) {
      evaluateRunOutcome();
    }
  }

  function simulateProjectile(dt) {
    const state = getState();
    const projectile = state.projectile;

    if (!projectile || !projectile.alive) {
      evaluateRunOutcome();
      return;
    }

    const integration = integrateProjectile(projectile, dt);

    const hitNode =
      findHitNodeSwept(
        state.nodes,
        integration.previousX,
        integration.previousY,
        projectile.x,
        projectile.y,
        projectile.radius
      ) || findHitNodeAt(state.nodes, projectile.x, projectile.y, projectile.radius);

    if (hitNode) {
      projectile.alive = false;
      state.shotsHit += 1;

      if (state.lastShotReport) {
        state.lastShotReport.hit = true;
        state.lastShotReport.missReason = null;
        state.lastShotReport.targetNodeId = hitNode.id;
      }

      startChainFrom(state, hitNode.id);
      markDirty();
      return;
    }

    if (integration.outOfBounds || integration.lifetimeExpired || integration.speedDropped) {
      projectile.alive = false;
      state.lastShotHit = false;

      if (state.lastShotReport && !state.lastShotReport.hit) {
        if (integration.outOfBounds) {
          state.lastShotReport.missReason = 'out_of_bounds';
        } else if (integration.lifetimeExpired) {
          state.lastShotReport.missReason = 'max_lifetime';
        } else {
          state.lastShotReport.missReason = 'speed_drop';
        }
      }

      evaluateRunOutcome();
      return;
    }

    const moved = distance(projectile.x, projectile.y, integration.previousX, integration.previousY) > CONFIG.EPSILON;
    if (moved) {
      markDirty();
    }
  }

  function executeCommand(command) {
    if (!command || typeof command !== 'object') {
      return;
    }

    switch (command.type) {
      case 'aim':
        setAim(command.x, command.y, command.active);
        break;
      case 'fire':
        fireShot(command.targetX, command.targetY);
        break;
      case 'reset_level':
        resetLevel();
        break;
      case 'set_level':
        setLevel(command.levelIndex);
        break;
      case 'next_level':
        nextLevel();
        break;
      default:
        break;
    }
  }

  function tick(dt, commands) {
    if (Array.isArray(commands) && commands.length > 0) {
      for (let i = 0; i < commands.length; i += 1) {
        executeCommand(commands[i]);
      }
    }

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

      if (state.phase !== 'simulate') {
        state.accumulator = 0;
        break;
      }
    }
  }

  function update(dt) {
    tick(dt, []);
  }

  function render(ctx) {
    renderState(ctx, getState());
  }

  function getRunSummaryPublic() {
    return getSummaryInternal();
  }

  function getSnapshotPublic() {
    const state = getState();
    if (!state) {
      return null;
    }

    return getSnapshot(state);
  }

  function getChainTracePublic() {
    const state = getState();
    if (!state) {
      return [];
    }

    return getChainTrace(state);
  }

  function getLastShotReportPublic() {
    return getLastShotReport(getState());
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

  function buildRewardPacketPublic(sourceState) {
    const state = sourceState || getState();
    if (!state) {
      return null;
    }

    return buildRewardPacket(state);
  }

  function trackEvent(eventType, payload) {
    runtime.telemetry.track(getState(), eventType, payload);
  }

  function exportTelemetry(format) {
    return runtime.telemetry.exportAs(format);
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
    tick,
    update,
    render,
    getSnapshot: getSnapshotPublic,
    getChainTrace: getChainTracePublic,
    getLastShotReport: getLastShotReportPublic,
    getRunSummary: getRunSummaryPublic,
    getLevelList,
    getCurrentLevelIndex,
    buildRewardPacket: buildRewardPacketPublic,
    trackEvent,
    exportTelemetry
  };
}