import { CONFIG, NODE_TYPES, OBJECTIVE_TYPES } from './config.js';
import { getCoreCharge, getExplodedCount, getInfectedCount, getNodeById } from './gameState.js';
import { prepareTurn, resolvePropagation, seedActionPacket } from './energySystem.js';
import { evaluateLoseCondition, evaluateObjectives } from './scoring.js';
import { isClickableNode, toggleFirewallMode, updateActiveState } from './node.js';

const DEFAULT_HINT_MESSAGE = 'Stuck? Press Hint for a tactical nudge.';

const ACTION_SCORE = Object.freeze({
  WIN: 2000,
  OBJECTIVE_GAIN: 240,
  CORE_GAIN: 24,
  INFECTION_REDUCED: 120,
  INFECTION_INCREASED: 140,
  OVERLOAD_REDUCED: 30,
  OVERLOAD_INCREASED: 45,
  EXPLOSION_PENALTY: 320,
  LOSE_PENALTY: 280,
  FIREWALL_ROUTE_BONUS: 20,
  POWER_STABILITY_BONUS: 10
});

function clampHintTier(tier) {
  const maxTier = Number.isFinite(CONFIG.HINT?.MAX_TIER) ? CONFIG.HINT.MAX_TIER : 3;
  const parsed = Number.isFinite(Number(tier)) ? Math.floor(Number(tier)) : 1;
  return Math.max(1, Math.min(maxTier, parsed));
}

function countCompletedObjectives(state) {
  if (!state || !Array.isArray(state.objectives)) {
    return 0;
  }

  let count = 0;
  for (let i = 0; i < state.objectives.length; i += 1) {
    if (state.objectives[i].done) {
      count += 1;
    }
  }

  return count;
}

function refreshAllNodeActivity(state) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    updateActiveState(state.nodes[i]);
  }
}

function collectClickableNodeIds(state) {
  if (!state || !Array.isArray(state.nodes)) {
    return [];
  }

  const ids = [];
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (isClickableNode(node) && !node.exploded) {
      ids.push(node.id);
    }
  }

  ids.sort((left, right) => left.localeCompare(right));
  return ids;
}

function findPrimaryCoreNodeId(state) {
  if (!state || !Array.isArray(state.objectives)) {
    return null;
  }

  for (let i = 0; i < state.objectives.length; i += 1) {
    const objective = state.objectives[i];
    if (objective.type === OBJECTIVE_TYPES.POWER_CORE && !objective.done && objective.nodeId) {
      return objective.nodeId;
    }
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].baseType === NODE_TYPES.CORE) {
      return state.nodes[i].id;
    }
  }

  return null;
}

function findClosedFirewallId(state) {
  if (!state || !Array.isArray(state.nodes)) {
    return null;
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (node.baseType === NODE_TYPES.FIREWALL && !node.exploded && !node.firewallOpen) {
      return node.id;
    }
  }

  return null;
}

function findDormantPurifierId(state) {
  if (!state || !Array.isArray(state.nodes)) {
    return null;
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (
      node.baseType !== NODE_TYPES.PURIFIER ||
      node.exploded ||
      node.corrupted ||
      node.charge >= node.threshold
    ) {
      continue;
    }

    const neighbors = state.neighborsByNode.get(node.id);
    if (!neighbors || neighbors.size === 0) {
      continue;
    }

    for (const neighborId of neighbors) {
      const neighbor = getNodeById(state, neighborId);
      if (!neighbor || neighbor.exploded) {
        continue;
      }

      if (neighbor.corrupted || neighbor.baseType === NODE_TYPES.VIRUS || (neighbor.corruptionProgress || 0) > 0) {
        return node.id;
      }
    }
  }

  return null;
}

function findPrimeableBreakerId(state) {
  if (!state || !Array.isArray(state.nodes)) {
    return null;
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (
      node.baseType === NODE_TYPES.BREAKER &&
      !node.exploded &&
      !node.corrupted &&
      !node.breakerPending
    ) {
      return node.id;
    }
  }

  return null;
}

function captureMetrics(state) {
  return {
    coreCharge: getCoreCharge(state),
    infectedCount: getInfectedCount(state),
    explodedCount: getExplodedCount(state),
    overload: Number.isFinite(state.overload) ? state.overload : 0,
    objectivesDone: countCompletedObjectives(state)
  };
}

function simulateActionFromState(baseState, nodeId) {
  if (!baseState || baseState.phase === 'end') {
    return {
      valid: false,
      reason: 'run_ended',
      nodeId
    };
  }

  if (baseState.movesUsed >= baseState.movesLimit) {
    return {
      valid: false,
      reason: 'out_of_moves',
      nodeId
    };
  }

  const state = structuredClone(baseState);
  const node = getNodeById(state, nodeId);
  if (!node || !isClickableNode(node) || node.exploded) {
    return {
      valid: false,
      reason: 'node_not_clickable',
      nodeId
    };
  }

  const before = captureMetrics(state);

  state.turnIndex += 1;
  state.movesUsed += 1;
  state.movesRemaining = Math.max(0, state.movesLimit - state.movesUsed);
  state.phase = 'resolving';

  prepareTurn(state);

  let injectPower = 0;
  if (node.baseType === NODE_TYPES.POWER) {
    injectPower = node.injectPower;
  }

  if (node.baseType === NODE_TYPES.FIREWALL) {
    toggleFirewallMode(state, node);
    if (node.injectOnClick && node.firewallOpen) {
      injectPower = node.injectPower;
    }
  }

  if (node.baseType === NODE_TYPES.BREAKER) {
    node.breakerPending = true;
    if (node.injectOnClick && node.injectPower > 0) {
      injectPower = node.injectPower;
    }
  }

  if (injectPower > 0) {
    seedActionPacket(state, node, injectPower);
  }

  const propagation = resolvePropagation(state, {});
  refreshAllNodeActivity(state);

  let result = 'in_progress';
  let reason = null;
  if (propagation.overflow) {
    result = 'lose';
    reason = 'simulation_overflow';
    state.phase = 'end';
  } else {
    const objectiveResult = evaluateObjectives(state);
    if (objectiveResult.allDone) {
      result = 'win';
      reason = 'objectives_complete';
      state.phase = 'end';
    } else {
      const lose = evaluateLoseCondition(state);
      if (lose.lose) {
        result = 'lose';
        reason = lose.reason;
        state.phase = 'end';
      } else {
        state.phase = 'await_input';
      }
    }
  }

  const after = captureMetrics(state);
  const explodedDelta = after.explodedCount - before.explodedCount;
  const infectedDelta = after.infectedCount - before.infectedCount;
  const overloadDelta = after.overload - before.overload;
  const objectiveGain = after.objectivesDone - before.objectivesDone;
  const coreGain = after.coreCharge - before.coreCharge;

  let score = 0;
  if (result === 'win') {
    score += ACTION_SCORE.WIN;
  }

  score += objectiveGain * ACTION_SCORE.OBJECTIVE_GAIN;
  score += coreGain * ACTION_SCORE.CORE_GAIN;

  if (infectedDelta < 0) {
    score += Math.abs(infectedDelta) * ACTION_SCORE.INFECTION_REDUCED;
  } else if (infectedDelta > 0) {
    score -= infectedDelta * ACTION_SCORE.INFECTION_INCREASED;
  }

  if (overloadDelta < 0) {
    score += Math.abs(overloadDelta) * ACTION_SCORE.OVERLOAD_REDUCED;
  } else if (overloadDelta > 0) {
    score -= overloadDelta * ACTION_SCORE.OVERLOAD_INCREASED;
  }

  if (explodedDelta > 0) {
    score -= explodedDelta * ACTION_SCORE.EXPLOSION_PENALTY;
  }

  if (result === 'lose') {
    score -= ACTION_SCORE.LOSE_PENALTY;
  }

  if (node.baseType === NODE_TYPES.FIREWALL && node.firewallOpen) {
    score += ACTION_SCORE.FIREWALL_ROUTE_BONUS;
  }

  if (node.baseType === NODE_TYPES.POWER) {
    score += ACTION_SCORE.POWER_STABILITY_BONUS;
  }

  return {
    valid: true,
    nodeId,
    nodeType: node.baseType,
    score,
    result,
    reason,
    objectiveGain,
    coreGain,
    infectedDelta,
    overloadDelta,
    explodedDelta,
    nextState: state
  };
}

function rankActionCandidates(state) {
  const nodeIds = collectClickableNodeIds(state);
  const candidates = [];

  for (let i = 0; i < nodeIds.length; i += 1) {
    const candidate = simulateActionFromState(state, nodeIds[i]);
    if (candidate.valid) {
      candidates.push(candidate);
    }
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.result !== right.result) {
      if (left.result === 'win') {
        return -1;
      }

      if (right.result === 'win') {
        return 1;
      }
    }

    return left.nodeId.localeCompare(right.nodeId);
  });

  return candidates;
}

function buildActionReason(candidate) {
  if (!candidate) {
    return 'it opens the cleanest route from this position.';
  }

  if (candidate.result === 'win') {
    return 'it should complete the objective immediately.';
  }

  if (candidate.objectiveGain > 0) {
    return 'it advances objective progress fastest.';
  }

  if (candidate.coreGain > 0 && candidate.overloadDelta <= 0) {
    return 'it pushes core charge while keeping overload risk controlled.';
  }

  if (candidate.infectedDelta < 0) {
    return 'it helps contain infection pressure.';
  }

  if (candidate.nodeType === NODE_TYPES.FIREWALL) {
    return 'it re-routes blocked traffic into a more useful branch.';
  }

  if (candidate.nodeType === NODE_TYPES.BREAKER) {
    return 'it primes a safety cap for the next turn through that lane.';
  }

  return 'it is the safest productive move right now.';
}

function buildDirectionalHint(state) {
  const clickable = collectClickableNodeIds(state);
  const coreNodeId = findPrimaryCoreNodeId(state);
  const closedFirewallId = findClosedFirewallId(state);
  const dormantPurifierId = findDormantPurifierId(state);
  const primeableBreakerId = findPrimeableBreakerId(state);

  if (state.phase === 'end') {
    return {
      tier: 1,
      kind: 'directional',
      message: 'Run already ended. Retry to request tactical hints for a fresh attempt.',
      targetNodeId: null,
      secondaryNodeId: null
    };
  }

  if (clickable.length === 0) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'No clickable nodes are available in this state. Retry and open with a Power, Firewall, or Breaker node.',
      targetNodeId: null,
      secondaryNodeId: null
    };
  }

  if (Array.isArray(state.lastTurn?.explodedNodes) && state.lastTurn.explodedNodes.length > 0) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'That route just overloaded. Re-route before feeding the same branch again.',
      targetNodeId: closedFirewallId || clickable[0],
      secondaryNodeId: null
    };
  }

  if (Array.isArray(state.lastTurn?.corruptionNew) && state.lastTurn.corruptionNew.length > 0) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'Virus pressure is rising. Prioritize safer routing before it spreads again.',
      targetNodeId: closedFirewallId || coreNodeId || clickable[0],
      secondaryNodeId: null
    };
  }

  if (closedFirewallId) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'A closed firewall is likely blocking progress. Re-open or rotate that gate.',
      targetNodeId: closedFirewallId,
      secondaryNodeId: null
    };
  }

  if (dormantPurifierId) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'A nearby purifier is idle. Route energy through it to suppress infection pressure.',
      targetNodeId: dormantPurifierId,
      secondaryNodeId: coreNodeId || null
    };
  }

  if (primeableBreakerId) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'A breaker lane is available. Prime it before feeding risky routes.',
      targetNodeId: primeableBreakerId,
      secondaryNodeId: coreNodeId || null
    };
  }

  if (state.movesRemaining <= 2 && countCompletedObjectives(state) < state.objectives.length) {
    return {
      tier: 1,
      kind: 'directional',
      message: 'Moves are running low. Focus on the shortest route that advances remaining objectives.',
      targetNodeId: coreNodeId || clickable[0],
      secondaryNodeId: null
    };
  }

  return {
    tier: 1,
    kind: 'directional',
    message: 'Order matters: prime a route, then feed energy toward the active objectives.',
    targetNodeId: coreNodeId || clickable[0],
    secondaryNodeId: null
  };
}

function buildActionHint(state) {
  const ranked = rankActionCandidates(state);
  if (ranked.length === 0) {
    return buildDirectionalHint(state);
  }

  const best = ranked[0];
  return {
    tier: 2,
    kind: 'action',
    message: `Try activating ${best.nodeId} next: ${buildActionReason(best)}`,
    targetNodeId: best.nodeId,
    secondaryNodeId: null
  };
}

function buildStrongHint(state) {
  const ranked = rankActionCandidates(state);
  if (ranked.length === 0) {
    const fallback = buildActionHint(state);
    return {
      ...fallback,
      tier: 3,
      kind: 'strong'
    };
  }

  const best = ranked[0];
  if (best.result === 'win') {
    return {
      tier: 3,
      kind: 'strong',
      message: `Strong hint: activate ${best.nodeId} now. This should finish the run from the current state.`,
      targetNodeId: best.nodeId,
      secondaryNodeId: null
    };
  }

  const secondRanked = rankActionCandidates(best.nextState);
  const nextStep = secondRanked.length > 0 ? secondRanked[0] : null;

  if (nextStep && nextStep.nodeId && nextStep.nodeId !== best.nodeId) {
    return {
      tier: 3,
      kind: 'strong',
      message: `Strong hint: activate ${best.nodeId} first, then pivot to ${nextStep.nodeId}.`,
      targetNodeId: best.nodeId,
      secondaryNodeId: nextStep.nodeId
    };
  }

  return {
    tier: 3,
    kind: 'strong',
    message: `Strong hint: activate ${best.nodeId} now; it is the highest-value next move.`,
    targetNodeId: best.nodeId,
    secondaryNodeId: null
  };
}

function sanitizeHintPayload(state, hint, requestedTier) {
  const safeTier = clampHintTier(requestedTier);
  const message = typeof hint?.message === 'string' && hint.message.trim().length > 0
    ? hint.message.trim()
    : state?.teachingGoal
      ? `Hint: ${state.teachingGoal}`
      : DEFAULT_HINT_MESSAGE;

  return {
    tier: safeTier,
    kind: typeof hint?.kind === 'string' && hint.kind ? hint.kind : 'directional',
    message,
    targetNodeId: hint?.targetNodeId || null,
    secondaryNodeId: hint?.secondaryNodeId || null
  };
}

export function buildHintForState(state, requestedTier) {
  const tier = clampHintTier(requestedTier);

  let rawHint = null;
  if (tier === 1) {
    rawHint = buildDirectionalHint(state);
  } else if (tier === 2) {
    rawHint = buildActionHint(state);
  } else {
    rawHint = buildStrongHint(state);
  }

  return sanitizeHintPayload(state, rawHint, tier);
}


