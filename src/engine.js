import { CONFIG, NODE_TYPES } from './config.js';
import {
  bumpRevision,
  createState,
  getInfectedCount,
  getNodeById,
  getRunSummary,
  getSnapshot
} from './gameState.js';
import { clampLevelIndex, loadLevels } from './levels.js';
import { createTelemetryStore } from './telemetry.js';
import { findClosestNode, updatePackets } from './physicsLite.js';
import { applyFirewallMode, isClickableNode, toggleFirewallMode, updateActiveState } from './node.js';
import {
  buildScoreSummary,
  evaluateLoseCondition,
  evaluateObjectives,
  makeOutcomeStatus
} from './scoring.js';
import { prepareTurn, resolvePropagation, seedActionPacket } from './energySystem.js';
import { renderState } from './render.js';

function onRunEndStub() {
  return null;
}

function onUxEventStub() {
  return null;
}

function isRunResultFinal(result) {
  return result === 'win' || result === 'lose' || result === 'abandoned';
}

function buildRewardPacket(state) {
  const base = state.result === 'win' ? 40 : 10;
  const efficiency = Math.max(0, state.movesLimit - state.movesUsed);
  const controlBonus = Math.max(0, state.overloadLimit - state.overload);
  const infectionPenalty = getInfectedCount(state);

  return {
    credits: Math.max(0, base + efficiency * 4 - infectionPenalty * 2),
    tech_parts: state.result === 'win' ? 2 + Math.floor(controlBonus / 2) : 1,
    tech_module_chance: Number(Math.min(0.75, 0.1 + controlBonus * 0.03).toFixed(2)),
    performance_tags: [
      state.result === 'win' ? 'protocol_stable' : 'protocol_failed',
      controlBonus >= 3 ? 'low_overload' : 'high_overload',
      infectionPenalty === 0 ? 'clean_network' : 'infected_network',
      state.rank || 'pending'
    ]
  };
}

function makeLastShotReport(state) {
  const scoreBefore = 0;
  const scoreAfter = Number.isFinite(state.totalScore) ? state.totalScore : 0;
  const objectivesRemaining = Math.max(0, state.objectivesTotal - state.objectivesCompleted);

  return {
    fired: state.lastAction.valid,
    hit: state.lastAction.valid,
    targetNodeId: state.lastAction.nodeId,
    missReason: state.lastAction.valid ? null : state.lastAction.reason,
    scoreBefore,
    scoreAfter,
    scoreGain: Math.max(0, scoreAfter - scoreBefore),
    chainSteps: state.lastTurn.trace.length,
    chainDepth: 0,
    pointsMissing: objectivesRemaining,
    resolution: state.result
  };
}

function trimEffectList(list, maxItems) {
  if (list.length > maxItems) {
    list.splice(0, list.length - maxItems);
  }
}

export function createChainLabEngine() {
  const runtime = {
    canvas: null,
    state: null,
    levels: [],
    levelIndex: 0,
    callbacks: {
      onRunEnd: onRunEndStub,
      onUxEvent: onUxEventStub
    },
    telemetry: createTelemetryStore(CONFIG.TELEMETRY.MAX_LOG_ENTRIES),
    modifiers: {
      scoreBonus: 0,
      chainGrowthBonus: 0
    }
  };

  function getState() {
    return runtime.state;
  }

  function emitTelemetry(eventType, payload) {
    runtime.telemetry.emit(getState(), eventType, payload);
  }

  function emitUxEvent(eventType, payload) {
    const state = getState();
    try {
      runtime.callbacks.onUxEvent(eventType, payload || {}, state);
    } catch (error) {
      // UX callback failures must not break the run
    }
  }

  function bump() {
    const state = getState();
    if (state) {
      bumpRevision(state);
    }
  }

  function updateScoreState(state) {
    const scoreSummary = buildScoreSummary(state);
    state.scoreBreakdown = { ...scoreSummary.scoreBreakdown };
    state.totalScore = scoreSummary.totalScore;
    state.rank = scoreSummary.rank;
    state.objectivesCompleted = scoreSummary.objectivesCompleted;
    state.objectivesTotal = scoreSummary.objectivesTotal;
    return scoreSummary;
  }

  function refreshAllNodeActivity(state) {
    for (let i = 0; i < state.nodes.length; i += 1) {
      updateActiveState(state.nodes[i]);
    }
  }

  function initializeFirewalls(state) {
    for (let i = 0; i < state.nodes.length; i += 1) {
      const node = state.nodes[i];
      if (node.baseType === NODE_TYPES.FIREWALL) {
        applyFirewallMode(state, node);
      }
    }
  }

  function setLevels(levelsOverride) {
    runtime.levels = loadLevels(levelsOverride);
    runtime.levelIndex = clampLevelIndex(runtime.levelIndex, runtime.levels);
  }

  function getCurrentLevel() {
    return runtime.levels[runtime.levelIndex] || runtime.levels[0];
  }

  function updateObjectiveState(state) {
    const objectiveResult = evaluateObjectives(state);
    state.lastTurn.objectiveProgress = objectiveResult.progress;
    updateScoreState(state);
    return objectiveResult;
  }

  function pushPacketVisual(fromNodeId, toNodeId, energy, edgeId) {
    const state = getState();
    state.effects.packets.push({
      fromNodeId,
      toNodeId,
      edgeId,
      energy,
      t: 0,
      ttl: CONFIG.FEEDBACK.PACKET_TTL
    });
    trimEffectList(state.effects.packets, CONFIG.FEEDBACK.TRACE_MAX);
  }

  function pushNodePulse(nodeId, kind, color) {
    const state = getState();
    state.effects.pulses.push({
      nodeId,
      kind: kind || 'click',
      color: color || '#f7fbff',
      t: 0,
      ttl: CONFIG.FEEDBACK.PULSE_TTL
    });
    trimEffectList(state.effects.pulses, CONFIG.FEEDBACK.MAX_PULSES);
  }

  function pushNodeBurst(nodeId, color, kind) {
    const state = getState();
    state.effects.nodeBursts.push({
      nodeId,
      color: color || '#f7fbff',
      kind: kind || 'arrival',
      t: 0,
      ttl: CONFIG.FEEDBACK.NODE_BURST_TTL
    });
    trimEffectList(state.effects.nodeBursts, CONFIG.FEEDBACK.MAX_NODE_BURSTS);
  }

  function pushEdgeBurst(edgeId, energy) {
    const state = getState();
    if (!edgeId) {
      return;
    }

    state.effects.edgeBursts.push({
      edgeId,
      energy: Math.max(1, energy || 1),
      t: 0,
      ttl: CONFIG.FEEDBACK.EDGE_BURST_TTL
    });
    trimEffectList(state.effects.edgeBursts, CONFIG.FEEDBACK.MAX_EDGE_BURSTS);
  }

  function triggerOverloadFx(nodeId) {
    const state = getState();
    state.effects.dangerFlashTtl = CONFIG.FEEDBACK.DANGER_FLASH_TTL;
    state.effects.shakeTtl = CONFIG.FEEDBACK.SHAKE_TTL;
    state.effects.shakeMagnitude = CONFIG.FEEDBACK.SHAKE_MAGNITUDE;
    pushNodePulse(nodeId, 'explode', CONFIG.NODES.COLORS.overload);
    pushNodeBurst(nodeId, CONFIG.NODES.COLORS.overload, 'explode');
    emitUxEvent('overload', { nodeId });
  }

  function finalizeRun(result, reason) {
    const state = getState();
    if (!state || state.ended || isRunResultFinal(state.result)) {
      return;
    }

    state.ended = true;
    state.result = result;
    state.phase = 'end';
    state.lastTurn.status = makeOutcomeStatus(result, reason);
    updateScoreState(state);
    state.rewardPacket = buildRewardPacket(state);
    bump();

    emitTelemetry('run_end', {
      levelId: state.levelId,
      result,
      reason,
      movesUsed: state.movesUsed,
      overload: state.overload,
      infectedCount: getInfectedCount(state),
      explodedCount: state.nodes.filter((node) => node.exploded).length,
      totalScore: state.totalScore,
      rank: state.rank,
      objectivesCompleted: state.objectivesCompleted,
      objectivesTotal: state.objectivesTotal
    });

    emitTelemetry('reward_generated', {
      levelId: state.levelId,
      rewardPacket: state.rewardPacket
    });

    try {
      runtime.callbacks.onRunEnd(result, state.rewardPacket, getRunSummary(state));
    } catch (error) {
      // callback errors should not break game
    }
  }

  function closeActiveRunIfOpen(reason) {
    const state = getState();
    if (!state || state.ended || isRunResultFinal(state.result)) {
      return false;
    }

    state.ended = true;
    state.result = 'abandoned';
    state.phase = 'end';
    state.lastTurn.status = makeOutcomeStatus('abandoned', reason);
    updateScoreState(state);
    bump();

    emitTelemetry('run_end', {
      levelId: state.levelId,
      result: 'abandoned',
      reason: reason || 'abandoned_transition',
      movesUsed: state.movesUsed,
      overload: state.overload,
      infectedCount: getInfectedCount(state),
      explodedCount: state.nodes.filter((node) => node.exploded).length,
      totalScore: state.totalScore,
      rank: state.rank,
      objectivesCompleted: state.objectivesCompleted,
      objectivesTotal: state.objectivesTotal
    });

    return true;
  }

  function checkWinLoseAfterTurn(state, overflow) {
    if (overflow) {
      finalizeRun('lose', 'simulation_overflow');
      return;
    }

    const objectiveResult = updateObjectiveState(state);
    if (objectiveResult.allDone) {
      finalizeRun('win', 'objectives_complete');
      return;
    }

    const lose = evaluateLoseCondition(state);
    if (lose.lose) {
      finalizeRun('lose', lose.reason);
      return;
    }

    state.phase = 'await_input';
    state.lastTurn.status = 'Awaiting next move.';
    updateScoreState(state);
    bump();
  }

  function activateNode(nodeId) {
    const state = getState();

    if (!state || state.phase === 'end') {
      return false;
    }

    const node = getNodeById(state, nodeId);
    if (!node) {
      state.lastAction = {
        type: 'activate',
        nodeId,
        valid: false,
        reason: 'node_not_found'
      };
      bump();
      return false;
    }

    if (!isClickableNode(node)) {
      state.lastAction = {
        type: 'activate',
        nodeId,
        valid: false,
        reason: 'node_not_clickable'
      };
      bump();
      return false;
    }

    if (state.movesUsed >= state.movesLimit) {
      state.lastAction = {
        type: 'activate',
        nodeId,
        valid: false,
        reason: 'out_of_moves'
      };
      bump();
      return false;
    }

    state.turnIndex += 1;
    state.movesUsed += 1;
    state.movesRemaining = Math.max(0, state.movesLimit - state.movesUsed);
    state.phase = 'resolving';

    state.lastAction = {
      type: 'activate',
      nodeId,
      valid: true,
      reason: ''
    };

    prepareTurn(state);

    let injectPower = 0;

    if (node.baseType === NODE_TYPES.POWER) {
      injectPower = node.injectPower;
    }

    if (node.baseType === NODE_TYPES.FIREWALL) {
      const toggled = toggleFirewallMode(state, node);
      if (toggled) {
        state.lastTurn.trace.push({
          step: 0,
          fromNodeId: 'player',
          toNodeId: node.id,
          edgeId: null,
          energyIn: 0,
          energyAccepted: 0,
          detail: node.firewallOpen
            ? `firewall_open_m${node.activeMode + 1}`
            : 'firewall_closed'
        });
      }

      if (node.injectOnClick && node.firewallOpen) {
        injectPower = node.injectPower;
      }
    }

    pushNodePulse(node.id, 'activate', '#f7fbff');
    pushNodeBurst(node.id, '#f7fbff', 'activate');
    state.effects.flashTtl = CONFIG.FEEDBACK.FLASH_TTL;
    emitUxEvent('node_activated', {
      nodeId,
      nodeType: node.baseType,
      injectPower
    });

    if (injectPower > 0) {
      seedActionPacket(state, node, injectPower);
    }

    emitTelemetry('move_committed', {
      levelId: state.levelId,
      turnIndex: state.turnIndex,
      nodeId,
      nodeType: node.baseType,
      movesRemaining: state.movesRemaining
    });

    const propagation = resolvePropagation(state, {
      onPacketResolved: (packet, accepted) => {
        pushNodeBurst(packet.nodeId, '#dffbff', 'arrival');
        emitTelemetry('propagation_step', {
          levelId: state.levelId,
          turnIndex: state.turnIndex,
          fromNodeId: packet.fromNodeId,
          toNodeId: packet.nodeId,
          edgeId: packet.edgeId,
          energyAccepted: accepted
        });
      },
      onPacketEmitted: (packet) => {
        pushPacketVisual(packet.fromNodeId, packet.toNodeId, packet.energy, packet.edgeId);
        pushEdgeBurst(packet.edgeId, packet.energy);
        emitUxEvent('energy_flow', {
          edgeId: packet.edgeId,
          energy: packet.energy,
          fromNodeId: packet.fromNodeId,
          toNodeId: packet.toNodeId
        });
      },
      onNodeExploded: (explodedNode) => {
        triggerOverloadFx(explodedNode.id);
        emitTelemetry('node_exploded', {
          levelId: state.levelId,
          turnIndex: state.turnIndex,
          nodeId: explodedNode.id
        });
      }
    });

    refreshAllNodeActivity(state);

    emitTelemetry('turn_resolved', {
      levelId: state.levelId,
      turnIndex: state.turnIndex,
      overload: state.overload,
      overflow: propagation.overflow,
      infectionNew: state.lastTurn.corruptionNew.slice(),
      cleansedNodes: state.lastTurn.cleansedNodes.slice(),
      explodedNodes: state.lastTurn.explodedNodes.slice()
    });

    checkWinLoseAfterTurn(state, propagation.overflow);

    bump();
    return true;
  }

  function startLevel(levelIndex, transitionReason) {
    if (transitionReason) {
      closeActiveRunIfOpen(transitionReason);
    }

    runtime.levelIndex = clampLevelIndex(levelIndex, runtime.levels);
    const level = getCurrentLevel();
    runtime.state = createState(level, runtime.levelIndex, runtime.levels.length);

    initializeFirewalls(runtime.state);
    refreshAllNodeActivity(runtime.state);
    updateObjectiveState(runtime.state);

    emitTelemetry('run_start', {
      levelId: runtime.state.levelId,
      levelName: runtime.state.levelName,
      levelIndex: runtime.state.levelIndex,
      movesLimit: runtime.state.movesLimit,
      overloadLimit: runtime.state.overloadLimit,
      collapseLimit: runtime.state.collapseLimit,
      virusCount: runtime.state.nodes.filter((node) => node.baseType === NODE_TYPES.VIRUS).length
    });

    bump();
    return getSnapshot(runtime.state);
  }

  function initGame(canvas, options) {
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

    const cfg = options || {};
    runtime.callbacks.onRunEnd = typeof cfg.onRunEnd === 'function' ? cfg.onRunEnd : onRunEndStub;
    runtime.callbacks.onUxEvent = typeof cfg.onUxEvent === 'function' ? cfg.onUxEvent : onUxEventStub;

    setLevels(cfg.levels);

    const startIndex = Number.isFinite(cfg.startLevelIndex) ? cfg.startLevelIndex : 0;
    return startLevel(startIndex);
  }

  function getActivationRadius() {
    const canvas = runtime.canvas;
    const mobileWidth = canvas && canvas.clientWidth > 0
      ? canvas.clientWidth <= CONFIG.UI.MOBILE_BREAKPOINT
      : false;

    return mobileWidth
      ? CONFIG.NODES.CLICK_RADIUS + CONFIG.INPUT.TOUCH_RADIUS_BONUS
      : CONFIG.NODES.CLICK_RADIUS;
  }

  function setAim(x, y, active) {
    const state = getState();
    if (!state) {
      return;
    }

    if (!active || state.phase === 'end') {
      if (state.hoverNodeId !== null) {
        state.hoverNodeId = null;
        bump();
      }
      return;
    }

    const hoverRadius = getActivationRadius() + 10;
    const hover = findClosestNode(state.nodes, x, y, hoverRadius);
    const nextHoverId = hover ? hover.id : null;

    if (state.hoverNodeId !== nextHoverId) {
      state.hoverNodeId = nextHoverId;
      bump();
    }
  }

  function fireShot(targetX, targetY) {
    const state = getState();
    if (!state || state.phase === 'end') {
      return false;
    }

    const node = findClosestNode(state.nodes, targetX, targetY, getActivationRadius());
    if (!node) {
      state.lastAction = {
        type: 'activate',
        nodeId: null,
        valid: false,
        reason: 'no_target'
      };
      bump();
      return false;
    }

    return activateNode(node.id);
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
      case 'activate_node':
        activateNode(command.nodeId);
        break;
      case 'reset_level':
        startLevel(runtime.levelIndex, 'abandoned_retry');
        break;
      case 'set_level':
        startLevel(command.levelIndex, 'abandoned_level_switch');
        break;
      case 'next_level':
        if (runtime.levelIndex < runtime.levels.length - 1) {
          startLevel(runtime.levelIndex + 1, 'abandoned_level_switch');
        }
        break;
      default:
        break;
    }
  }

  function tick(dt, commands) {
    if (Array.isArray(commands)) {
      for (let i = 0; i < commands.length; i += 1) {
        executeCommand(commands[i]);
      }
    }

    const state = getState();
    if (!state) {
      return;
    }

    const delta = Math.max(0, Number(dt) || 0);
    updatePackets(state, delta);

    if (
      state.effects.packets.length > 0 ||
      state.effects.pulses.length > 0 ||
      state.effects.edgeBursts.length > 0 ||
      state.effects.nodeBursts.length > 0 ||
      state.effects.flashTtl > 0 ||
      state.effects.dangerFlashTtl > 0 ||
      state.effects.shakeTtl > 0 ||
      state.hoverNodeId
    ) {
      bump();
    }
  }

  function update(dt) {
    tick(dt, []);
  }

  function render(ctx) {
    renderState(ctx, getState());
  }

  function resetLevel() {
    return startLevel(runtime.levelIndex, 'abandoned_retry');
  }

  function setLevel(levelIndex) {
    return startLevel(levelIndex, 'abandoned_level_switch');
  }

  function nextLevel() {
    if (runtime.levelIndex >= runtime.levels.length - 1) {
      return false;
    }

    startLevel(runtime.levelIndex + 1, 'abandoned_level_switch');
    return true;
  }

  function getLevelList() {
    return runtime.levels.map((level, index) => ({
      index,
      id: level.id,
      name: level.name,
      chapter: level.chapter,
      difficulty: level.difficulty,
      difficultyTag: level.difficultyTag,
      teachingGoal: level.teachingGoal,
      parScore: level.parScore,
      movesLimit: level.movesLimit,
      overloadLimit: level.overloadLimit
    }));
  }

  function getSnapshotPublic() {
    const state = getState();
    return state ? getSnapshot(state) : null;
  }

  function getRunSummaryPublic() {
    const state = getState();
    return state ? getRunSummary(state) : null;
  }

  function getChainTrace() {
    const state = getState();
    return state ? state.lastTurn.trace.map((entry) => ({ ...entry })) : [];
  }

  function getLastShotReport() {
    const state = getState();
    return state
      ? makeLastShotReport(state)
      : makeLastShotReport({
        lastAction: { valid: false, nodeId: null, reason: 'idle' },
        lastTurn: { trace: [] },
        result: 'in_progress',
        objectivesCompleted: 0,
        objectivesTotal: 0,
        totalScore: 0
      });
  }

  function setModifiers(modifiers) {
    runtime.modifiers = {
      ...runtime.modifiers,
      ...(modifiers || {})
    };
    return { ...runtime.modifiers };
  }

  function getModifiers() {
    return { ...runtime.modifiers };
  }

  function trackEvent(eventType, payload) {
    runtime.telemetry.track(getState(), eventType, payload);
  }

  function exportTelemetry(format) {
    return runtime.telemetry.exportAs(format);
  }

  function getCurrentLevelIndex() {
    return runtime.levelIndex;
  }

  function buildRewardPacketPublic(sourceState) {
    const state = sourceState || getState();
    return state ? buildRewardPacket(state) : null;
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
    getRunSummary: getRunSummaryPublic,
    getLevelList,
    getCurrentLevelIndex,
    getChainTrace,
    getLastShotReport,
    buildRewardPacket: buildRewardPacketPublic,
    trackEvent,
    exportTelemetry
  };
}
