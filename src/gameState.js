import { CONFIG, NODE_TYPES, OBJECTIVE_TYPES } from './config.js';

export function createRunId() {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `run_${now}_${random}`;
}

function createDefaultScoreBreakdown() {
  return {
    clearBonus: 0,
    efficiencyBonus: 0,
    overloadControlBonus: 0,
    cleanNetworkBonus: 0,
    failureFloor: 0
  };
}

export function createDefaultHintState() {
  return {
    tierShown: 0,
    requests: 0,
    kind: 'none',
    message: 'Stuck? Press Hint for a tactical nudge.',
    targetNodeId: null,
    secondaryNodeId: null,
    updatedTurnIndex: 0
  };
}

function defaultThresholdForType(type) {
  if (type === NODE_TYPES.RELAY) {
    return CONFIG.TURN.RELAY_THRESHOLD;
  }

  if (type === NODE_TYPES.SPLITTER) {
    return CONFIG.TURN.RELAY_THRESHOLD;
  }

  if (type === NODE_TYPES.BREAKER) {
    return CONFIG.TURN.BREAKER_THRESHOLD;
  }

  if (type === NODE_TYPES.FIREWALL) {
    return CONFIG.TURN.FIREWALL_THRESHOLD;
  }

  if (type === NODE_TYPES.PURIFIER) {
    return CONFIG.TURN.PURIFIER_THRESHOLD;
  }

  if (type === NODE_TYPES.OVERLOAD) {
    return CONFIG.TURN.RELAY_THRESHOLD;
  }

  return 0;
}

function defaultEmitForType(type, injectPower) {
  if (type === NODE_TYPES.POWER) {
    return injectPower;
  }

  if (type === NODE_TYPES.RELAY) {
    return CONFIG.TURN.RELAY_EMIT_POWER;
  }

  if (type === NODE_TYPES.SPLITTER) {
    return CONFIG.TURN.RELAY_EMIT_POWER;
  }

  if (type === NODE_TYPES.BREAKER) {
    return CONFIG.TURN.BREAKER_EMIT_POWER;
  }

  if (type === NODE_TYPES.FIREWALL) {
    return CONFIG.TURN.FIREWALL_EMIT_POWER;
  }

  if (type === NODE_TYPES.PURIFIER) {
    return CONFIG.TURN.PURIFIER_EMIT_POWER;
  }

  if (type === NODE_TYPES.OVERLOAD) {
    return CONFIG.TURN.OVERLOAD_NODE_EMIT_POWER;
  }

  return 0;
}

function makeRuntimeNode(node) {
  const threshold = Number.isFinite(node.threshold)
    ? node.threshold
    : defaultThresholdForType(node.type);

  const injectPower = Number.isFinite(node.injectPower)
    ? node.injectPower
    : node.type === NODE_TYPES.POWER
      ? CONFIG.TURN.POWER_INJECT_POWER
      : node.type === NODE_TYPES.FIREWALL
        ? CONFIG.TURN.FIREWALL_CLICK_INJECT
        : 0;

  const emitPower = Number.isFinite(node.emitPower)
    ? node.emitPower
    : defaultEmitForType(node.type, injectPower);

  const firewallModes = Array.isArray(node.firewallModes)
    ? node.firewallModes.map((mode) => (Array.isArray(mode) ? mode.slice() : []))
    : null;

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
    firewallModes,
    activeMode: Number.isFinite(node.activeMode) ? node.activeMode : 0,
    firewallOpen: Boolean(node.firewallOpen),
    injectOnClick: Boolean(
      node.injectOnClick !== undefined
        ? node.injectOnClick
        : node.type === NODE_TYPES.POWER || node.type === NODE_TYPES.FIREWALL
    ),
    spreadRate: Number.isFinite(node.spreadRate) ? node.spreadRate : CONFIG.TURN.VIRUS_SPREAD_PER_TURN,
    purifierStrength: Number.isFinite(node.purifierStrength)
      ? node.purifierStrength
      : CONFIG.TURN.PURIFIER_CLEANSE_POWER,
    overloadThreshold: Number.isFinite(node.overloadThreshold)
      ? node.overloadThreshold
      : CONFIG.TURN.OVERLOAD_NODE_THRESHOLD,
    breakerCap: Number.isFinite(node.breakerCap)
      ? Math.max(0, Math.floor(node.breakerCap))
      : CONFIG.TURN.BREAKER_SAFE_CAP,
    corrupted: Boolean(node.corrupted),
    charge: 0,
    active: node.type === NODE_TYPES.POWER,
    emittedThisTurn: false,
    receivedThisTurn: 0,
    throughputThisTurn: 0,
    exploded: false,
    corruptionProgress: 0,
    cleanseAccumulated: 0,
    breakerPending: Boolean(node.breakerPending),
    breakerArmed: false,
    breakerDissipatedThisTurn: 0,
    radius: CONFIG.NODES.RADIUS
  };
}

function makeRuntimeEdge(edge) {
  const enabled = edge.enabled !== false;
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    capacity: Number.isFinite(edge.capacity) ? edge.capacity : 3,
    attenuation: Number.isFinite(edge.attenuation) ? edge.attenuation : 1,
    enabled,
    baseEnabled: enabled,
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

function buildObjectives(level) {
  const source = Array.isArray(level.objectives) ? level.objectives : [];
  return source.map((objective, idx) => ({
    id: `obj_${idx + 1}`,
    type: objective.type,
    nodeId: objective.nodeId || null,
    requiredCharge: Number.isFinite(objective.requiredCharge) ? objective.requiredCharge : 0,
    done: false,
    text: ''
  }));
}

function getNodeTypeLabel(type) {
  if (type === NODE_TYPES.POWER) {
    return 'Power Node';
  }

  if (type === NODE_TYPES.RELAY) {
    return 'Relay Node';
  }

  if (type === NODE_TYPES.SPLITTER) {
    return 'Splitter Node';
  }

  if (type === NODE_TYPES.BREAKER) {
    return 'Breaker Node';
  }

  if (type === NODE_TYPES.FIREWALL) {
    return 'Firewall Node';
  }

  if (type === NODE_TYPES.PURIFIER) {
    return 'Purifier Node';
  }

  if (type === NODE_TYPES.VIRUS) {
    return 'Virus Node';
  }

  if (type === NODE_TYPES.OVERLOAD) {
    return 'Overload Node';
  }

  if (type === NODE_TYPES.CORE) {
    return 'Core Node';
  }

  return 'Node';
}

function getNextObjectiveText(state) {
  for (let i = 0; i < state.objectives.length; i += 1) {
    if (!state.objectives[i].done) {
      return state.objectives[i].text || createObjectiveText(state.objectives[i]);
    }
  }

  return 'All objectives complete.';
}

function buildHoverInfo(state) {
  if (!state.hoverNodeId) {
    return null;
  }

  const node = getNodeById(state, state.hoverNodeId);
  if (!node) {
    return null;
  }

  const clickable = (
    node.baseType === NODE_TYPES.POWER ||
    node.baseType === NODE_TYPES.FIREWALL ||
    node.baseType === NODE_TYPES.BREAKER
  ) && !node.exploded;
  const chargeText = node.baseType === NODE_TYPES.CORE
    ? `Charge ${node.charge}/${node.targetCharge}`
    : `Charge ${node.charge}`;

  let stateText = 'Idle';
  if (node.exploded) {
    stateText = 'Destroyed';
  } else if (node.corrupted) {
    stateText = 'Infected';
  } else if (node.active) {
    stateText = 'Active';
  }

  let actionText = 'Observe this node.';
  let detailText = chargeText;

  if (node.baseType === NODE_TYPES.POWER) {
    actionText = 'Click to inject energy into connected routes.';
    detailText = `${chargeText} | Injects ${node.injectPower} energy each click.`;
  } else if (node.baseType === NODE_TYPES.FIREWALL) {
    actionText = node.firewallOpen
      ? 'Click to rotate this route or lock it again.'
      : 'Click to open this route and let energy through.';
    const modeText = Array.isArray(node.firewallModes) && node.firewallModes.length > 0
      ? `${node.firewallModes.length} route modes available.`
      : 'Single route gate.';
    detailText = `${chargeText} | ${modeText}`;
  } else if (node.baseType === NODE_TYPES.RELAY) {
    actionText = 'Relay nodes auto-forward once charged enough.';
    detailText = `${chargeText} | Needs ${node.threshold}, emits ${node.emitPower}.`;
  } else if (node.baseType === NODE_TYPES.SPLITTER) {
    actionText = 'Splitter nodes divide output across every active outgoing route (extra remainder goes to lower edge IDs).';
    const activeOutputs = (state.outgoingByNode.get(node.id) || [])
      .filter((edgeIndex) => state.edges[edgeIndex]?.enabled)
      .length;
    detailText = `${chargeText} | Needs ${node.threshold}, splits ${node.emitPower} across ${activeOutputs} routes.`;
  } else if (node.baseType === NODE_TYPES.BREAKER) {
    if (node.breakerPending) {
      actionText = 'Breaker is primed: your next turn through this node will be capped and excess will dissipate safely.';
    } else {
      actionText = 'Click to prime a one-turn safety cap on this node for your next move.';
    }
    detailText = `${chargeText} | Prime cap ${node.breakerCap}, base emit ${node.emitPower}.`;
  } else if (node.baseType === NODE_TYPES.PURIFIER) {
    actionText = 'Purifier auto-cleans adjacent infection when it stays powered.';
    detailText = `${chargeText} | Needs ${node.threshold}, cleanse ${node.purifierStrength}/turn.`;
  } else if (node.baseType === NODE_TYPES.VIRUS) {
    actionText = 'Hazard node. It infects nearby nodes at the end of each turn.';
    detailText = `Spread ${node.spreadRate} per turn | ${stateText}`;
  } else if (node.baseType === NODE_TYPES.OVERLOAD) {
    actionText = 'Auto-forwards charge but can explode if fed too much in one turn.';
    detailText = `${chargeText} | Safe throughput ${node.overloadThreshold}.`;
  } else if (node.baseType === NODE_TYPES.CORE) {
    actionText = 'Main objective. Fill the core to the target charge.';
    detailText = `${chargeText} | ${stateText}`;
  }

  return {
    id: node.id,
    type: node.baseType,
    title: `${node.id} | ${getNodeTypeLabel(node.baseType)}`,
    clickable,
    actionText,
    detailText: `${detailText} | ${stateText}`
  };
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
    chapter: level.chapter || 'Sector 1',
    difficulty: level.difficulty || level.difficultyTag || 'intro',
    difficultyTag: level.difficultyTag || level.difficulty || 'intro',
    teachingGoal: level.teachingGoal || 'Charge the core.',
    parScore: Number.isFinite(level.parScore) ? level.parScore : 0,
    phase: 'await_input',
    result: 'in_progress',
    ended: false,

    turnIndex: 0,
    movesLimit: level.movesLimit,
    movesUsed: 0,
    movesRemaining: level.movesLimit,

    overload: 0,
    overloadLimit: Number.isFinite(level.overloadLimit) ? level.overloadLimit : 8,
    collapseLimit: Number.isFinite(level.collapseLimit) ? level.collapseLimit : 4,

    nodes,
    edges,
    edgeById: buildEdgeLookup(edges),
    outgoingByNode: buildOutgoingIndex(nodes, edges),
    neighborsByNode: buildNeighborIndex(nodes, edges),

    objectives: buildObjectives(level),
    objectivesCompleted: 0,
    objectivesTotal: 0,

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
      purifiedNodes: [],
      purifierActive: [],
      breakerArmedNodes: [],
      breakerDissipation: [],
      explodedNodes: [],
      objectiveProgress: [],
      status: 'Awaiting input.'
    },

    scoreBreakdown: createDefaultScoreBreakdown(),
    totalScore: 0,
    rank: 'pending',
    rewardPacket: null,
    hint: createDefaultHintState(),

    hoverNodeId: null,
    effects: {
      time: 0,
      packets: [],
      pulses: [],
      edgeBursts: [],
      nodeBursts: [],
      missMarkers: [],
      flashTtl: 0,
      dangerFlashTtl: 0,
      shakeTtl: 0,
      shakeMagnitude: 0
    },

    telemetry: [],
    revision: 0
  };
}

export function bumpRevision(state) {
  state.revision += 1;
}

export function getInfectedCount(state) {
  let count = 0;
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].corrupted) {
      count += 1;
    }
  }
  return count;
}

export function getVirusCount(state) {
  let count = 0;
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].baseType === NODE_TYPES.VIRUS) {
      count += 1;
    }
  }
  return count;
}

export function getVirusThreatCount(state) {
  const threatened = new Set();

  for (let i = 0; i < state.nodes.length; i += 1) {
    const source = state.nodes[i];
    if (source.baseType !== NODE_TYPES.VIRUS || source.exploded) {
      continue;
    }

    const neighbors = state.neighborsByNode.get(source.id);
    if (!neighbors) {
      continue;
    }

    neighbors.forEach((neighborId) => {
      const node = getNodeById(state, neighborId);
      if (!node || node.exploded || node.baseType === NODE_TYPES.VIRUS || node.corrupted) {
        return;
      }

      threatened.add(node.id);
    });
  }

  return threatened.size;
}

export function getExplodedCount(state) {
  let count = 0;
  for (let i = 0; i < state.nodes.length; i += 1) {
    if (state.nodes[i].exploded) {
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
    chapter: state.chapter,
    difficulty: state.difficulty,
    difficultyTag: state.difficultyTag,
    teachingGoal: state.teachingGoal,
    parScore: state.parScore,
    phase: state.phase,
    result: state.result,
    turnIndex: state.turnIndex,
    movesUsed: state.movesUsed,
    movesRemaining: state.movesRemaining,
    movesLimit: state.movesLimit,
    overload: state.overload,
    overloadLimit: state.overloadLimit,
    collapseLimit: state.collapseLimit,
    infectedCount: getInfectedCount(state),
    virusCount: getVirusCount(state),
    virusThreatCount: getVirusThreatCount(state),
    explodedCount: getExplodedCount(state),
    coreCharge: getCoreCharge(state),
    totalScore: state.totalScore,
    rank: state.rank,
    objectivesCompleted: state.objectivesCompleted,
    objectivesTotal: state.objectivesTotal,
    hoverInfo: buildHoverInfo(state),
    nextObjectiveText: getNextObjectiveText(state),
    hint: state.hint ? { ...state.hint } : createDefaultHintState(),
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
    chapter: state.chapter,
    difficulty: state.difficulty,
    difficultyTag: state.difficultyTag,
    teachingGoal: state.teachingGoal,
    parScore: state.parScore,
    phase: state.phase,
    result: state.result,
    turnIndex: state.turnIndex,
    movesUsed: state.movesUsed,
    movesRemaining: state.movesRemaining,
    movesLimit: state.movesLimit,
    overload: state.overload,
    overloadLimit: state.overloadLimit,
    collapseLimit: state.collapseLimit,
    infectedCount: getInfectedCount(state),
    virusCount: getVirusCount(state),
    explodedCount: getExplodedCount(state),
    coreCharge: getCoreCharge(state),
    totalScore: state.totalScore,
    rank: state.rank,
    scoreBreakdown: { ...state.scoreBreakdown },
    objectivesCompleted: state.objectivesCompleted,
    objectivesTotal: state.objectivesTotal,
    nextObjectiveText: getNextObjectiveText(state),
    rewardPacket: state.rewardPacket ? { ...state.rewardPacket } : null,
    objectives: state.objectives.map((objective) => ({ ...objective })),
    lastAction: { ...state.lastAction },
    lastTurn: {
      ...state.lastTurn,
      trace: state.lastTurn.trace.map((entry) => ({ ...entry })),
      activatedNodes: state.lastTurn.activatedNodes.slice(),
      corruptionNew: state.lastTurn.corruptionNew.slice(),
      cleansedNodes: state.lastTurn.cleansedNodes.slice(),
      purifiedNodes: state.lastTurn.purifiedNodes.slice(),
      purifierActive: state.lastTurn.purifierActive.slice(),
      breakerArmedNodes: state.lastTurn.breakerArmedNodes.slice(),
      breakerDissipation: state.lastTurn.breakerDissipation.map((entry) => ({ ...entry })),
      explodedNodes: state.lastTurn.explodedNodes.slice(),
      objectiveProgress: state.lastTurn.objectiveProgress.slice()
    },
    revision: state.revision
  };
}

export function createObjectiveText(objective) {
  if (objective.type === OBJECTIVE_TYPES.POWER_CORE) {
    return `Charge core ${objective.nodeId} to ${objective.requiredCharge}`;
  }

  if (objective.type === OBJECTIVE_TYPES.ACTIVATE_ALL) {
    return 'Activate all non-virus nodes';
  }

  if (objective.type === OBJECTIVE_TYPES.CLEAN_CORRUPTION) {
    return 'Clear all infection from the network';
  }

  return 'Unknown objective';
}




