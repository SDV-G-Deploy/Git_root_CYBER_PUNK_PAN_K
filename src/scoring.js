import { CONFIG, NODE_TYPES, OBJECTIVE_TYPES } from './config.js';
import {
  createObjectiveText,
  getExplodedCount,
  getInfectedCount,
  getNodeById
} from './gameState.js';

export function createEmptyScoreBreakdown() {
  return {
    clearBonus: 0,
    efficiencyBonus: 0,
    overloadControlBonus: 0,
    cleanNetworkBonus: 0,
    failureFloor: 0
  };
}

function evaluatePowerCore(state, objective) {
  const node = getNodeById(state, objective.nodeId);
  if (!node) {
    return false;
  }

  return node.charge >= objective.requiredCharge;
}

function evaluateActivateAll(state) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (node.baseType === NODE_TYPES.CORE || node.baseType === NODE_TYPES.VIRUS) {
      continue;
    }

    if (node.exploded || node.corrupted || !node.active) {
      return false;
    }
  }

  return true;
}

function evaluateCleanCorruption(state) {
  return getInfectedCount(state) === 0;
}

export function evaluateObjectives(state) {
  const progress = [];
  let allDone = true;

  for (let i = 0; i < state.objectives.length; i += 1) {
    const objective = state.objectives[i];
    let done = false;

    if (objective.type === OBJECTIVE_TYPES.POWER_CORE) {
      done = evaluatePowerCore(state, objective);
    } else if (objective.type === OBJECTIVE_TYPES.ACTIVATE_ALL) {
      done = evaluateActivateAll(state);
    } else if (objective.type === OBJECTIVE_TYPES.CLEAN_CORRUPTION) {
      done = evaluateCleanCorruption(state);
    }

    objective.done = done;
    objective.text = createObjectiveText(objective);

    progress.push({
      id: objective.id,
      type: objective.type,
      done,
      text: objective.text
    });

    if (!done) {
      allDone = false;
    }
  }

  return {
    allDone,
    progress
  };
}

export function evaluateLoseCondition(state) {
  if (state.overload >= state.overloadLimit) {
    return {
      lose: true,
      reason: 'energy_overload'
    };
  }

  if (getInfectedCount(state) >= state.collapseLimit) {
    return {
      lose: true,
      reason: 'network_collapse'
    };
  }

  if (state.movesUsed >= state.movesLimit) {
    return {
      lose: true,
      reason: 'out_of_moves'
    };
  }

  return {
    lose: false,
    reason: null
  };
}

function getObjectiveCounts(state) {
  const objectivesTotal = Array.isArray(state.objectives) ? state.objectives.length : 0;
  let objectivesCompleted = 0;

  for (let i = 0; i < objectivesTotal; i += 1) {
    if (state.objectives[i].done) {
      objectivesCompleted += 1;
    }
  }

  return {
    objectivesCompleted,
    objectivesTotal
  };
}

function getRank(state, infectedCount, explodedCount) {
  if (state.phase !== 'end') {
    return 'pending';
  }

  if (state.result !== 'win') {
    return 'failed';
  }

  if (
    explodedCount === 0 &&
    infectedCount === 0 &&
    state.movesRemaining >= CONFIG.SCORING.PERFECT_UNUSED_MOVES
  ) {
    return 'perfect';
  }

  const overloadRatio = state.overloadLimit > 0
    ? state.overload / state.overloadLimit
    : 1;

  if (
    state.movesRemaining >= 1 ||
    overloadRatio <= CONFIG.SCORING.STRONG_OVERLOAD_RATIO
  ) {
    return 'strong';
  }

  return 'clear';
}

export function buildScoreSummary(state) {
  const breakdown = createEmptyScoreBreakdown();
  const infectedCount = getInfectedCount(state);
  const explodedCount = getExplodedCount(state);
  const overloadHeadroom = Math.max(0, state.overloadLimit - state.overload);
  const objectiveCounts = getObjectiveCounts(state);

  if (state.phase === 'end' && state.result === 'win') {
    breakdown.clearBonus = CONFIG.SCORING.CLEAR_BONUS;
    breakdown.efficiencyBonus = Math.max(0, state.movesRemaining) * CONFIG.SCORING.EFFICIENCY_PER_UNUSED_MOVE;
    breakdown.overloadControlBonus = overloadHeadroom * CONFIG.SCORING.OVERLOAD_HEADROOM_BONUS;
    breakdown.cleanNetworkBonus = infectedCount === 0 ? CONFIG.SCORING.CLEAN_NETWORK_BONUS : 0;
  } else if (state.phase === 'end' && state.result !== 'win') {
    breakdown.failureFloor = CONFIG.SCORING.FAILURE_FLOOR;
  }

  const totalScore = Math.max(
    0,
    breakdown.clearBonus +
      breakdown.efficiencyBonus +
      breakdown.overloadControlBonus +
      breakdown.cleanNetworkBonus +
      breakdown.failureFloor
  );

  return {
    scoreBreakdown: breakdown,
    totalScore,
    rank: getRank(state, infectedCount, explodedCount),
    objectivesCompleted: objectiveCounts.objectivesCompleted,
    objectivesTotal: objectiveCounts.objectivesTotal
  };
}

export function makeOutcomeStatus(result, reason) {
  if (result === 'win') {
    return 'Success: the core is charged and the district is stable.';
  }

  if (reason === 'energy_overload') {
    return 'Failure: overload hit the district limit before the objective was complete.';
  }

  if (reason === 'network_collapse') {
    return 'Failure: infection spread too far and the network collapsed.';
  }

  if (reason === 'out_of_moves') {
    return 'Failure: move budget exhausted before the objectives were complete.';
  }

  if (reason === 'simulation_overflow') {
    return 'Failure: propagation overflow safeguard triggered during resolution.';
  }

  if (reason === 'abandoned_retry') {
    return 'Run closed: player restarted before completion.';
  }

  if (reason === 'abandoned_level_switch') {
    return 'Run closed: player switched levels before completion.';
  }

  if (result === 'abandoned') {
    return 'Run closed before completion.';
  }

  return 'Operation in progress.';
}
