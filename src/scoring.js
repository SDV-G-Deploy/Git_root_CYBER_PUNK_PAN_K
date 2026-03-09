import { OBJECTIVE_TYPES } from './config.js';
import { createObjectiveText, getCorruptedCount, getNodeById } from './gameState.js';

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
    if (node.baseType === 'core') {
      continue;
    }

    if (node.corrupted) {
      continue;
    }

    if (!node.active) {
      return false;
    }
  }

  return true;
}

function evaluateCleanCorruption(state) {
  return getCorruptedCount(state) === 0;
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

  if (getCorruptedCount(state) >= state.collapseLimit) {
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

export function makeOutcomeStatus(result, reason) {
  if (result === 'win') {
    return 'Protocol stabilized. District secure.';
  }

  if (reason === 'energy_overload') {
    return 'Failure: energy overload reached critical threshold.';
  }

  if (reason === 'network_collapse') {
    return 'Failure: corruption collapse across the network.';
  }

  if (reason === 'out_of_moves') {
    return 'Failure: operation budget exhausted.';
  }

  return 'Operation in progress.';
}