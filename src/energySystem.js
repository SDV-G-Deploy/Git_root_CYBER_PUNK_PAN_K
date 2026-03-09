import { CONFIG, NODE_TYPES } from './config.js';
import {
  applyDecay,
  beginTurnForNode,
  canEmit,
  emitPackets,
  receiveEnergy,
  updateActiveState
} from './node.js';
import { getNodeById } from './gameState.js';

function enqueuePacket(state, packet) {
  state.queue.push(packet);
}

function resetQueue(state) {
  state.queue = [];
  state.queueHead = 0;
  state.propagationSteps = 0;
}

function dequeuePacket(state) {
  if (state.queueHead >= state.queue.length) {
    return null;
  }

  const packet = state.queue[state.queueHead];
  state.queue[state.queueHead] = null;
  state.queueHead += 1;

  if (state.queueHead > 32 && state.queueHead * 2 > state.queue.length) {
    state.queue = state.queue.slice(state.queueHead);
    state.queueHead = 0;
  }

  return packet;
}

function hasQueue(state) {
  return state.queueHead < state.queue.length;
}

function normalizeNodeOnCorruption(node) {
  node.corrupted = true;
  node.type = NODE_TYPES.CORRUPTED;
  node.emitPower = 0;
  node.threshold = 99;
  node.active = false;
}

function tryCleanseNode(node, cleansedNodes) {
  if (!node.corrupted) {
    return;
  }

  if (node.cleanseAccumulated < CONFIG.TURN.CLEANSE_THRESHOLD) {
    return;
  }

  node.corrupted = false;
  node.corruptionProgress = 0;
  node.cleanseAccumulated = 0;

  if (node.baseType === NODE_TYPES.CORRUPTED) {
    node.baseType = NODE_TYPES.RELAY;
    node.threshold = CONFIG.TURN.RELAY_THRESHOLD;
    node.emitPower = CONFIG.TURN.RELAY_EMIT_POWER;
    node.type = NODE_TYPES.RELAY;
  } else {
    node.type = node.baseType;
  }

  cleansedNodes.push(node.id);
}

function processPacket(state, packet, hooks) {
  const node = getNodeById(state, packet.nodeId);
  if (!node) {
    return;
  }

  const accepted = receiveEnergy(node, packet.energy);
  if (accepted <= 0) {
    return;
  }

  updateActiveState(node);

  state.lastTurn.trace.push({
    step: state.propagationSteps,
    fromNodeId: packet.fromNodeId,
    toNodeId: node.id,
    edgeId: packet.edgeId || null,
    energyIn: packet.energy,
    energyAccepted: accepted
  });

  if (node.active && state.lastTurn.activatedNodes.indexOf(node.id) < 0) {
    state.lastTurn.activatedNodes.push(node.id);
  }

  tryCleanseNode(node, state.lastTurn.cleansedNodes);

  hooks.onPacketResolved(packet, accepted);

  if (!canEmit(node)) {
    return;
  }

  const emission = emitPackets(state, node);
  if (emission.overloadAdded > 0) {
    state.overload += emission.overloadAdded;
    state.lastTurn.overloadDelta += emission.overloadAdded;
  }

  for (let i = 0; i < emission.packets.length; i += 1) {
    const emitted = emission.packets[i];

    enqueuePacket(state, {
      nodeId: emitted.toNodeId,
      fromNodeId: node.id,
      edgeId: emitted.edgeId,
      energy: emitted.energy
    });

    hooks.onPacketEmitted(emitted);
  }
}

function spreadCorruption(state) {
  const newlyCorrupted = [];

  for (let i = 0; i < state.nodes.length; i += 1) {
    const source = state.nodes[i];
    if (!source.corrupted) {
      continue;
    }

    const neighbors = state.neighborsByNode.get(source.id);
    if (!neighbors) {
      continue;
    }

    neighbors.forEach((neighborId) => {
      const node = getNodeById(state, neighborId);
      if (!node || node.corrupted || node.baseType === NODE_TYPES.SOURCE) {
        return;
      }

      node.corruptionProgress += 1;
      if (node.corruptionProgress >= CONFIG.TURN.CORRUPTION_THRESHOLD) {
        normalizeNodeOnCorruption(node);
        newlyCorrupted.push(node.id);
      }
    });
  }

  state.lastTurn.corruptionNew = newlyCorrupted;
}

function applyDecayPhase(state) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    applyDecay(node);
    updateActiveState(node);
  }
}

export function prepareTurn(state) {
  resetQueue(state);

  state.lastTurn = {
    trace: [],
    activatedNodes: [],
    overloadDelta: 0,
    corruptionNew: [],
    cleansedNodes: [],
    objectiveProgress: [],
    status: 'Resolving network propagation...'
  };

  for (let i = 0; i < state.edges.length; i += 1) {
    state.edges[i].overloadedThisTurn = false;
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    beginTurnForNode(state.nodes[i]);
  }
}

export function seedActionPacket(state, node, injectPower) {
  enqueuePacket(state, {
    nodeId: node.id,
    fromNodeId: 'player',
    edgeId: null,
    energy: Math.max(0, injectPower)
  });
}

export function resolvePropagation(state, hooks) {
  while (hasQueue(state)) {
    state.propagationSteps += 1;

    if (state.propagationSteps > CONFIG.TURN.MAX_PROPAGATION_STEPS) {
      return {
        overflow: true
      };
    }

    const packet = dequeuePacket(state);
    if (!packet) {
      continue;
    }

    processPacket(state, packet, hooks);
  }

  spreadCorruption(state);
  applyDecayPhase(state);

  return {
    overflow: false
  };
}