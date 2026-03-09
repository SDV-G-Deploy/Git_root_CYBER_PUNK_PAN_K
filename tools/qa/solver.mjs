import { CONFIG, NODE_TYPES } from '../../src/config.js';
import { createState, getNodeById } from '../../src/gameState.js';
import { loadLevels } from '../../src/levels.js';
import { applyFirewallMode, isClickableNode, toggleFirewallMode, updateActiveState } from '../../src/node.js';
import { prepareTurn, resolvePropagation, seedActionPacket } from '../../src/energySystem.js';
import {
  buildScoreSummary,
  evaluateLoseCondition,
  evaluateObjectives,
  makeOutcomeStatus
} from '../../src/scoring.js';
import { createStateKey } from './state-key.mjs';

const DEFAULT_OPTIONS = {
  maxStatesPerLevel: 200000,
  solutionCountCap: 100000,
  deadStateExampleCap: 3
};

function withDefaults(options) {
  return {
    ...DEFAULT_OPTIONS,
    ...(options || {})
  };
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

function updateObjectiveState(state) {
  const objectiveResult = evaluateObjectives(state);
  state.lastTurn.objectiveProgress = objectiveResult.progress;
  updateScoreState(state);
  return objectiveResult;
}

function finalizeRun(state, result, reason) {
  if (state.ended) {
    return;
  }

  state.ended = true;
  state.result = result;
  state.phase = 'end';
  state.endReason = reason;
  state.lastTurn.status = makeOutcomeStatus(result, reason);
  updateScoreState(state);
}

function checkWinLoseAfterTurn(state, overflow) {
  if (overflow) {
    finalizeRun(state, 'lose', 'simulation_overflow');
    return;
  }

  const objectiveResult = updateObjectiveState(state);
  if (objectiveResult.allDone) {
    finalizeRun(state, 'win', 'objectives_complete');
    return;
  }

  const lose = evaluateLoseCondition(state);
  if (lose.lose) {
    finalizeRun(state, 'lose', lose.reason);
    return;
  }

  state.phase = 'await_input';
  state.lastTurn.status = 'Awaiting next move.';
  updateScoreState(state);
}

export function createSimulationState(level, levelIndex, levelCount) {
  const state = createState(level, levelIndex, levelCount);
  state.endReason = null;
  initializeFirewalls(state);
  refreshAllNodeActivity(state);
  updateObjectiveState(state);
  return state;
}

export function enumerateActions(state) {
  if (!state || state.phase === 'end' || state.movesUsed >= state.movesLimit) {
    return [];
  }

  const actions = [];
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (!isClickableNode(node) || node.exploded) {
      continue;
    }

    actions.push({
      type: 'activate_node',
      nodeId: node.id,
      nodeType: node.baseType
    });
  }

  actions.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  return actions;
}

function simulateActionInPlace(state, action) {
  if (!action || action.type !== 'activate_node') {
    return {
      valid: false,
      reason: 'unknown_action'
    };
  }

  if (!state || state.phase === 'end') {
    return {
      valid: false,
      reason: 'run_ended'
    };
  }

  const node = getNodeById(state, action.nodeId);
  if (!node) {
    state.lastAction = {
      type: 'activate',
      nodeId: action.nodeId,
      valid: false,
      reason: 'node_not_found'
    };
    return {
      valid: false,
      reason: 'node_not_found'
    };
  }

  if (!isClickableNode(node)) {
    state.lastAction = {
      type: 'activate',
      nodeId: action.nodeId,
      valid: false,
      reason: 'node_not_clickable'
    };
    return {
      valid: false,
      reason: 'node_not_clickable'
    };
  }

  if (state.movesUsed >= state.movesLimit) {
    state.lastAction = {
      type: 'activate',
      nodeId: action.nodeId,
      valid: false,
      reason: 'out_of_moves'
    };
    return {
      valid: false,
      reason: 'out_of_moves'
    };
  }

  state.turnIndex += 1;
  state.movesUsed += 1;
  state.movesRemaining = Math.max(0, state.movesLimit - state.movesUsed);
  state.phase = 'resolving';
  state.endReason = null;

  state.lastAction = {
    type: 'activate',
    nodeId: action.nodeId,
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

  if (injectPower > 0) {
    seedActionPacket(state, node, injectPower);
  }

  const propagation = resolvePropagation(state, {});
  refreshAllNodeActivity(state);
  checkWinLoseAfterTurn(state, propagation.overflow);

  return {
    valid: true,
    overflow: propagation.overflow,
    result: state.result,
    reason: state.endReason
  };
}

export function simulateAction(state, action) {
  const nextState = structuredClone(state);
  const outcome = simulateActionInPlace(nextState, action);
  return {
    state: nextState,
    outcome
  };
}

function buildGraphNode(index, state, key, parentIndex, actionFromParent) {
  return {
    index,
    key,
    state,
    depth: state.movesUsed,
    parentIndex,
    actionFromParent,
    children: [],
    availableActions: [],
    analysis: {
      solvable: false,
      solutionCount: 0,
      minMovesToWin: Number.POSITIVE_INFINITY,
      winningChildActions: 0
    }
  };
}

function getPathToNode(graph, nodeIndex) {
  const path = [];
  let currentIndex = nodeIndex;

  while (currentIndex !== null && currentIndex !== undefined) {
    const node = graph[currentIndex];
    if (!node || !node.actionFromParent) {
      break;
    }

    path.push(node.actionFromParent.nodeId);
    currentIndex = node.parentIndex;
  }

  return path.reverse();
}

function reconstructMinimalWinningPath(graph, nodeIndex) {
  if (nodeIndex === null || nodeIndex === undefined) {
    return [];
  }

  const path = [];
  let currentIndex = nodeIndex;

  while (true) {
    const node = graph[currentIndex];
    if (!node) {
      break;
    }

    if (node.state.result === 'win') {
      break;
    }

    let nextChoice = null;
    for (let i = 0; i < node.children.length; i += 1) {
      const childEdge = node.children[i];
      const childNode = graph[childEdge.childIndex];
      if (!childNode || !childNode.analysis.solvable) {
        continue;
      }

      if (1 + childNode.analysis.minMovesToWin !== node.analysis.minMovesToWin) {
        continue;
      }

      if (!nextChoice || childEdge.action.nodeId.localeCompare(nextChoice.action.nodeId) < 0) {
        nextChoice = childEdge;
      }
    }

    if (!nextChoice) {
      break;
    }

    path.push(nextChoice.action.nodeId);
    currentIndex = nextChoice.childIndex;
  }

  return path;
}

function clampSolutionCount(value, cap) {
  return Math.min(cap, value);
}

function classifyDifficulty(result) {
  if (!result.solvable) {
    return {
      label: 'Unsolvable',
      score: Number.POSITIVE_INFINITY
    };
  }

  const deadRatio = result.totalStates > 0 ? result.deadStateCount / result.totalStates : 0;
  const solutionPenalty = result.solutionCount <= 1
    ? 1.5
    : result.solutionCount <= 3
      ? 0.75
      : 0;
  const trialPenalty = result.rootBranchAnalysis.filter((branch) => !branch.solvable).length > 0
    ? Math.min(2, result.rootBranchAnalysis.filter((branch) => !branch.solvable).length * 0.5)
    : 0;

  const score = result.minimalMoves + result.averageBranchingFactor + deadRatio * 6 + solutionPenalty + trialPenalty;

  if (score <= 5.5) {
    return { label: 'Easy', score: Number(score.toFixed(2)) };
  }

  if (score <= 8.5) {
    return { label: 'Medium', score: Number(score.toFixed(2)) };
  }

  return { label: 'Hard', score: Number(score.toFixed(2)) };
}

function summarizeIssues(result) {
  const issues = [];

  if (!result.solvable) {
    issues.push('no_solution_found');
  }

  if (result.searchCutoff) {
    issues.push('search_cutoff');
  }

  if (result.overflowStates > 0) {
    issues.push('overflow_paths_exist');
  }

  if (result.rootBranchAnalysis.length > 0 && result.rootBranchAnalysis.every((branch) => !branch.solvable)) {
    issues.push('all_opening_moves_fail');
  }

  if (result.solvable && result.rootBranchAnalysis.filter((branch) => branch.solvable).length === 1) {
    issues.push('single_opening_solution');
  }

  if (result.solvable && result.solutionCount <= 1) {
    issues.push('single_solution_path');
  }

  if (result.solvable && result.minimalMoves >= result.movesLimit) {
    issues.push('zero_margin_move_budget');
  } else if (result.solvable && result.minimalMoves >= result.movesLimit - 1) {
    issues.push('tight_move_budget');
  }

  const collapseLosses = result.lossReasonCounts.network_collapse || 0;
  const overloadLosses = result.lossReasonCounts.energy_overload || 0;
  if (collapseLosses > overloadLosses && collapseLosses > 0) {
    issues.push('virus_pressure_high');
  }

  if (result.averageBranchingFactor >= 3.5 && result.solutionCount <= 3) {
    issues.push('trial_and_error_risk');
  }

  return issues;
}

export function solveLevel(level, levelIndex, levelCount, options) {
  const opts = withDefaults(options);
  const initialState = createSimulationState(level, levelIndex, levelCount);
  const initialKey = createStateKey(initialState);

  const graph = [buildGraphNode(0, initialState, initialKey, null, null)];
  const keyToIndex = new Map([[initialKey, 0]]);
  const queue = [0];
  let queueHead = 0;

  let expandedStates = 0;
  let generatedTransitions = 0;
  let repeatedStates = 0;
  let overflowStates = 0;
  let searchCutoff = false;

  while (queueHead < queue.length) {
    const nodeIndex = queue[queueHead];
    queueHead += 1;

    const graphNode = graph[nodeIndex];
    const state = graphNode.state;

    if (state.phase === 'end' || state.movesUsed >= state.movesLimit) {
      continue;
    }

    const actions = enumerateActions(state);
    graphNode.availableActions = actions;
    expandedStates += 1;
    generatedTransitions += actions.length;

    for (let i = 0; i < actions.length; i += 1) {
      const action = actions[i];
      const simulation = simulateAction(state, action);
      const nextState = simulation.state;
      const nextOutcome = simulation.outcome;

      if (nextOutcome.overflow || nextState.endReason === 'simulation_overflow') {
        overflowStates += 1;
      }

      const key = createStateKey(nextState);
      let childIndex = keyToIndex.get(key);
      if (childIndex === undefined) {
        childIndex = graph.length;
        keyToIndex.set(key, childIndex);
        graph.push(buildGraphNode(childIndex, nextState, key, nodeIndex, action));
        queue.push(childIndex);

        if (graph.length >= opts.maxStatesPerLevel) {
          searchCutoff = true;
        }
      } else {
        repeatedStates += 1;
      }

      graphNode.children.push({
        action,
        childIndex
      });

      if (searchCutoff) {
        break;
      }
    }

    if (searchCutoff) {
      break;
    }
  }

  const lossReasonCounts = {};
  let winningStateCount = 0;
  let terminalLossStateCount = 0;
  let maxCoreCharge = 0;
  let bestObjectiveCount = 0;
  let bestProgressIndex = 0;
  let bestProgressScore = Number.NEGATIVE_INFINITY;
  const statesByDepth = new Map();

  for (let i = 0; i < graph.length; i += 1) {
    const node = graph[i];
    if (!statesByDepth.has(node.depth)) {
      statesByDepth.set(node.depth, []);
    }
    statesByDepth.get(node.depth).push(i);

    maxCoreCharge = Math.max(maxCoreCharge, node.state.coreCharge ?? 0, node.state.nodes.filter((entry) => entry.baseType === NODE_TYPES.CORE).reduce((sum, entry) => sum + entry.charge, 0));
    bestObjectiveCount = Math.max(bestObjectiveCount, node.state.objectivesCompleted ?? 0, node.state.objectives.filter((objective) => objective.done).length);
    const currentObjectiveCount = node.state.objectivesCompleted ?? node.state.objectives.filter((objective) => objective.done).length;
    const currentCoreCharge = node.state.nodes.filter((entry) => entry.baseType === NODE_TYPES.CORE).reduce((sum, entry) => sum + entry.charge, 0);
    const currentInfected = node.state.nodes.filter((entry) => entry.corrupted).length;
    const progressScore = currentObjectiveCount * 10000 + currentCoreCharge * 100 - currentInfected * 10 - node.state.overload;
    if (progressScore > bestProgressScore) {
      bestProgressScore = progressScore;
      bestProgressIndex = i;
    }

    if (node.state.result === 'win') {
      winningStateCount += 1;
    }

    if (node.state.result === 'lose') {
      terminalLossStateCount += 1;
      const reason = node.state.endReason || 'unknown';
      lossReasonCounts[reason] = (lossReasonCounts[reason] || 0) + 1;
    }
  }

  const sortedDepths = Array.from(statesByDepth.keys()).sort((a, b) => b - a);
  for (let depthIndex = 0; depthIndex < sortedDepths.length; depthIndex += 1) {
    const depth = sortedDepths[depthIndex];
    const stateIndices = statesByDepth.get(depth);

    for (let i = 0; i < stateIndices.length; i += 1) {
      const nodeIndex = stateIndices[i];
      const node = graph[nodeIndex];

      if (node.state.result === 'win') {
        node.analysis.solvable = true;
        node.analysis.solutionCount = 1;
        node.analysis.minMovesToWin = 0;
        node.analysis.winningChildActions = 0;
        continue;
      }

      if (node.children.length === 0) {
        node.analysis.solvable = false;
        node.analysis.solutionCount = 0;
        node.analysis.minMovesToWin = Number.POSITIVE_INFINITY;
        node.analysis.winningChildActions = 0;
        continue;
      }

      let solvable = false;
      let solutionCount = 0;
      let minMovesToWin = Number.POSITIVE_INFINITY;
      let winningChildActions = 0;

      for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
        const childEdge = node.children[childIndex];
        const childNode = graph[childEdge.childIndex];
        if (!childNode.analysis.solvable) {
          continue;
        }

        solvable = true;
        winningChildActions += 1;
        solutionCount = clampSolutionCount(solutionCount + childNode.analysis.solutionCount, opts.solutionCountCap);
        minMovesToWin = Math.min(minMovesToWin, 1 + childNode.analysis.minMovesToWin);
      }

      node.analysis.solvable = solvable;
      node.analysis.solutionCount = solutionCount;
      node.analysis.minMovesToWin = minMovesToWin;
      node.analysis.winningChildActions = winningChildActions;
    }
  }

  const root = graph[0];
  const minimalWinningPath = root.analysis.solvable ? reconstructMinimalWinningPath(graph, 0) : [];
  const rootBranchAnalysis = root.children.map((childEdge) => {
    const childNode = graph[childEdge.childIndex];
    return {
      action: childEdge.action.nodeId,
      nodeType: childEdge.action.nodeType,
      solvable: childNode.analysis.solvable,
      minMovesToWin: Number.isFinite(childNode.analysis.minMovesToWin)
        ? childNode.analysis.minMovesToWin + 1
        : null,
      solutionCount: childNode.analysis.solutionCount,
      endState: childNode.state.result,
      endReason: childNode.state.endReason || null,
      path: getPathToNode(graph, childEdge.childIndex)
    };
  });

  const deadStateExamples = [];
  for (let i = 0; i < graph.length; i += 1) {
    const node = graph[i];
    if (deadStateExamples.length >= opts.deadStateExampleCap) {
      break;
    }

    if (node.state.phase === 'end') {
      continue;
    }

    if (node.analysis.solvable) {
      continue;
    }

    deadStateExamples.push({
      movesUsed: node.state.movesUsed,
      overload: node.state.overload,
      infectedCount: node.state.nodes.filter((entry) => entry.corrupted).length,
      path: getPathToNode(graph, i)
    });
  }

  const clickableNodes = level.nodes
    .filter((node) => node.type === NODE_TYPES.POWER || node.type === NODE_TYPES.FIREWALL)
    .map((node) => ({ id: node.id, type: node.type }));

  const interactableAtStart = enumerateActions(initialState).map((action) => action.nodeId);
  const nonInteractableClickables = clickableNodes
    .map((node) => node.id)
    .filter((nodeId) => interactableAtStart.indexOf(nodeId) < 0);

  const result = {
    levelId: level.id,
    levelName: level.name,
    authoredDifficulty: level.difficulty || level.difficultyTag || 'unknown',
    chapter: level.chapter || 'Unknown',
    teachingGoal: level.teachingGoal || '',
    movesLimit: level.movesLimit,
    overloadLimit: level.overloadLimit,
    collapseLimit: level.collapseLimit,
    totalStates: graph.length,
    expandedStates,
    generatedTransitions,
    repeatedStates,
    overflowStates,
    winningStateCount,
    terminalLossStateCount,
    averageBranchingFactor: expandedStates > 0
      ? Number((generatedTransitions / expandedStates).toFixed(2))
      : 0,
    solvable: root.analysis.solvable,
    minimalMoves: root.analysis.solvable ? root.analysis.minMovesToWin : null,
    solutionCount: root.analysis.solutionCount,
    deadStateCount: graph.filter((node) => node.state.phase !== 'end' && !node.analysis.solvable).length,
    searchCutoff,
    minimalWinningPath,
    maxCoreCharge,
    bestObjectiveCount,
    bestProgressPath: getPathToNode(graph, bestProgressIndex),
    bestProgressState: {
      movesUsed: graph[bestProgressIndex].state.movesUsed,
      overload: graph[bestProgressIndex].state.overload,
      infectedCount: graph[bestProgressIndex].state.nodes.filter((entry) => entry.corrupted).length,
      coreCharge: graph[bestProgressIndex].state.nodes
        .filter((entry) => entry.baseType === NODE_TYPES.CORE)
        .reduce((sum, entry) => sum + entry.charge, 0),
      objectivesCompleted: graph[bestProgressIndex].state.objectives.filter((objective) => objective.done).length,
      result: graph[bestProgressIndex].state.result,
      endReason: graph[bestProgressIndex].state.endReason || null
    },
    rootBranchAnalysis,
    deadStateExamples,
    lossReasonCounts,
    clickableNodes,
    interactableAtStart,
    nonInteractableClickables
  };

  const difficulty = classifyDifficulty(result);
  result.difficultyEstimate = difficulty.label;
  result.difficultyScore = difficulty.score;
  result.issues = summarizeIssues(result);

  return result;
}

export function validateAllLevels(options) {
  const levels = loadLevels();
  return levels.map((level, index) => solveLevel(level, index, levels.length, options));
}

export function validateLevels(options) {
  return validateAllLevels(options);
}

export function createValidationSummary(results) {
  const summary = {
    levelCount: results.length,
    solvableCount: 0,
    unsolvedCount: 0,
    searchCutoffCount: 0,
    totalStatesExplored: 0,
    issueCounts: {},
    difficultyCounts: {
      Easy: 0,
      Medium: 0,
      Hard: 0,
      Unsolvable: 0
    }
  };

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.solvable) {
      summary.solvableCount += 1;
    } else {
      summary.unsolvedCount += 1;
    }

    if (result.searchCutoff) {
      summary.searchCutoffCount += 1;
    }

    summary.totalStatesExplored += result.totalStates;
    summary.difficultyCounts[result.difficultyEstimate] = (summary.difficultyCounts[result.difficultyEstimate] || 0) + 1;

    for (let issueIndex = 0; issueIndex < result.issues.length; issueIndex += 1) {
      const issue = result.issues[issueIndex];
      summary.issueCounts[issue] = (summary.issueCounts[issue] || 0) + 1;
    }
  }

  return summary;
}


