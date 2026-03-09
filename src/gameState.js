import { CONFIG, NODE_TYPES, OBJECTIVE_TYPES } from './config.js';

export function createRunId() {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `run_${now}_${random}`;
}

function makeRuntimeNode(node) {
  const threshold = Number.isFinite(node.threshold)
    ? node.threshold
    : node.type === NODE_TYPES.RELAY || node.type === NODE_TYPES.SWITCH
      ? CONFIG.TURN.RELAY_THRESHOLD
      : 0;

  const injectPower = Number.isFinite(node.injectPower)
    ? node.injectPower
    : CONFIG.TURN.SOURCE_INJECT_POWER;

  const emitPower = Number.isFinite(node.emitPower)
    ? node.emitPower
    : node.type === NODE_TYPES.SOURCE
      ? injectPower
      : node.type === NODE_TYPES.RELAY || node.type === NODE_TYPES.SWITCH
        ? CONFIG.TURN.RELAY_EMIT_POWER
        : 0;

  return {
    id: node.id,
    type: node.type,
    baseType: node.type,
    x: node.x,
    y: node.y,
    injectPower,
    threshold,
    emitPower,
    targetCharge: Number.isFinite(node.targetCharge) ? node.targetCharge : 0,
    maxCharge: Number.isFinite(node.maxCharge) ? node.maxCharge : 99,
    switchModes: Array.isArray(node.switchModes)
      ? node.switchModes.map((mode) => (Array.isArray(mode) ? mode.slice() : []))
      : null,
    activeMode: Number.isFinite(node.activeMode) ? node.activeMode : 0,
    injectOnClick: Boolean(node.injectOnClick),
    corrupted: node.type === NODE_TYPES.CORRUPTED,
    charge: 0,
    active: false,
    emittedThisTurn: false,
    receivedThisTurn: 0,
    corruptionProgress: 0,
    cleanseAccumulated: 0,
    radius: CONFIG.NODES.RADIUS
  };
}

function makeRuntimeEdge(edge) {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    capacity: Number.isFinite(edge.capacity) ? edge.capacity : 3,
    attenuation: Number.isFinite(edge.attenuation) ? edge.attenuation : 1,
    enabled: edge.enabled !== false,
    overloadedThisTurn: false
  };
}

function buildEdgeLookup(edges) {
  const map = new Map();
  for (let i = 0; i < edges.length; i += 1) {
    map.set(edges[i].id, i);
  }
  return map;
}

function buildOutgoingIndex(nodes, edges) {
  const outgoing = new Map();
  for (let i = 0; i < nodes.length; i += 1) {
    outgoing.set(nodes[i].id, []);
  }

  for (let i = 0; i < edges.length; i += 1) {
    const list = outgoing.get(edges[i].from);
    if (list) {
      list.push(i);
    }
  }

  return outgoing;
}

function buildNeighborIndex(nodes, edges) {
  const neighbors = new Map();
  for (let i = 0; i < nodes.length; i += 1) {
    neighbors.set(nodes[i].id, new Set());
  }

  for (let i = 0; i < edges.length; i += 1) {
    const edge = edges[i];
    if (!neighbors.has(edge.from) || !neighbors.has(edge.to)) {
      continue;
    }

    neighbors.get(edge.from).add(edge.to);
    neighbors.get(edge.to).add(edge.from);
  }

  return neighbors;
}

export function createState(level, levelIndex, levelCount) {
  const nodes = level.nodes.map(makeRuntimeNode);
  const edges = level.edges.map(makeRuntimeEdge);

  return {
    runId: createRunId(),
    levelId: level.id,
    levelName: level.name || level.id,
    levelIndex,
    levelCount,
    difficultyTag: level.difficultyTag || 'intro',
    phase: 'await_input',
    result: 'in_progress',
    ended: false,

    turnIndex: 0,
    movesLimit: level.movesLimit,
    movesUsed: 0,
    movesRemaining: level.movesLimit,

    overload: 0,
    overloadLimit: level.overloadLimit,

    collapseLimit: level.collapseLimit,

    nodes,
    edges,
    edgeById: buildEdgeLookup(edges),
    outgoingByNode: buildOutgoingIndex(nodes, edges),
    neighborsByNode: buildNeighborIndex(nodes, edges),

    objectives: level.objectives.map((objective, idx) => ({
      id: `obj_${idx + 1}`,
      type: objective.type,
      nodeId: objective.nodeId || null,
      requiredCharge: Number.isFinite(objective.requiredCharge) ? objective.requiredCharge : 0,
      done: false,
      text: ''
    })),

    queue: [],
    queueHead: 0,
    propagationSteps: 0,

    lastAction: {
      type: 'none',
      nodeId: null,
      valid: false,
      reason: ''
    },

    lastTurn: {
      trace: [],
      activatedNodes: [],
      overloadDelta: 0,
      corruptionNew: [],
      cleansedNodes: [],
      objectiveProgress: [],
      status: 'Awaiting input.'
    },

    hoverNodeId: null,
    effects: {
      packets: [],
      flashTtl: 0
    },

    telemetry: [],
    revision: 0
  };
}

export function bumpRevision(state) {
  state.revision += 1;
}

export function getCorruptedCount(state) {
  let count = 0;
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].corrupted) {
      count += 1;
    }
  }
  return count;
}

export function getCoreCharge(state) {
  let total = 0;
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].baseType === NODE_TYPES.CORE) {
      total += state.nodes[i].charge;
    }
  }
  return total;
}

export function getNodeById(state, nodeId) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].id === nodeId) {
      return state.nodes[i];
    }
  }

  return null;
}

export function getSnapshot(state) {
  return {
    runId: state.runId,
    levelId: state.levelId,
    levelName: state.levelName,
    levelIndex: state.levelIndex,
    levelCount: state.levelCount,
    difficultyTag: state.difficultyTag,
    phase: state.phase,
    result: state.result,
    turnIndex: state.turnIndex,
    movesUsed: state.movesUsed,
    movesRemaining: state.movesRemaining,
    movesLimit: state.movesLimit,
    overload: state.overload,
    overloadLimit: state.overloadLimit,
    collapseLimit: state.collapseLimit,
    corruptedCount: getCorruptedCount(state),
    coreCharge: getCoreCharge(state),
    revision: state.revision
  };
}

export function getRunSummary(state) {
  return {
    runId: state.runId,
    levelId: state.levelId,
    levelName: state.levelName,
    levelIndex: state.levelIndex,
    levelCount: state.levelCount,
    difficultyTag: state.difficultyTag,
    phase: state.phase,
    result: state.result,
    turnIndex: state.turnIndex,
    movesUsed: state.movesUsed,
    movesRemaining: state.movesRemaining,
    movesLimit: state.movesLimit,
    overload: state.overload,
    overloadLimit: state.overloadLimit,
    collapseLimit: state.collapseLimit,
    corruptedCount: getCorruptedCount(state),
    coreCharge: getCoreCharge(state),
    objectives: state.objectives.map((objective) => ({ ...objective })),
    lastAction: { ...state.lastAction },
    lastTurn: {
      ...state.lastTurn,
      trace: state.lastTurn.trace.map((entry) => ({ ...entry })),
      activatedNodes: state.lastTurn.activatedNodes.slice(),
      corruptionNew: state.lastTurn.corruptionNew.slice(),
      cleansedNodes: state.lastTurn.cleansedNodes.slice(),
      objectiveProgress: state.lastTurn.objectiveProgress.slice()
    },
    revision: state.revision
  };
}

export function createObjectiveText(objective) {
  if (objective.type === OBJECTIVE_TYPES.POWER_CORE) {
    return `Power core ${objective.nodeId} to ${objective.requiredCharge}`;
  }

  if (objective.type === OBJECTIVE_TYPES.ACTIVATE_ALL) {
    return 'Activate all non-corrupted network nodes';
  }

  if (objective.type === OBJECTIVE_TYPES.CLEAN_CORRUPTION) {
    return 'Clean all corrupted nodes';
  }

  return 'Unknown objective';
}