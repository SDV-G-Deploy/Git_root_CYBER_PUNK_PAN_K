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

function infectNode(node) {
  if (node.corrupted || node.exploded || node.baseType === NODE_TYPES.VIRUS) {
    return false;
  }

  node.corrupted = true;
  node.corruptionProgress = CONFIG.TURN.CORRUPTION_THRESHOLD;
  node.cleanseAccumulated = 0;

  if (node.baseType === NODE_TYPES.FIREWALL) {
    node.firewallOpen = false;
  }

  updateActiveState(node);
  return true;
}

function tryCleanseNode(node, cleansedNodes) {
  if (!node.corrupted || node.baseType === NODE_TYPES.VIRUS) {
    return;
  }

  if (node.cleanseAccumulated < CONFIG.TURN.CLEANSE_THRESHOLD) {
    return;
  }

  node.corrupted = false;
  node.corruptionProgress = 0;
  node.cleanseAccumulated = 0;
  cleansedNodes.push(node.id);
}

function explodeOverloadNode(state, node) {
  if (!node || node.exploded) {
    return false;
  }

  node.exploded = true;
  node.corrupted = false;
  node.charge = 0;
  node.corruptionProgress = 0;
  node.cleanseAccumulated = 0;
  updateActiveState(node);

  for (let i = 0; i < state.edges.length; i += 1) {
    const edge = state.edges[i];
    if (edge.from === node.id || edge.to === node.id) {
      edge.enabled = false;
      edge.baseEnabled = false;
      edge.overloadedThisTurn = true;
    }
  }

  state.overload += CONFIG.TURN.OVERLOAD_EXPLOSION_PENALTY;
  state.lastTurn.overloadDelta += CONFIG.TURN.OVERLOAD_EXPLOSION_PENALTY;
  state.lastTurn.explodedNodes.push(node.id);

  return true;
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

  if (
    node.baseType === NODE_TYPES.OVERLOAD &&
    !node.exploded &&
    node.throughputThisTurn > node.overloadThreshold
  ) {
    const exploded = explodeOverloadNode(state, node);
    if (exploded) {
      state.lastTurn.trace.push({
        step: state.propagationSteps,
        fromNodeId: node.id,
        toNodeId: node.id,
        edgeId: null,
        energyIn: 0,
        energyAccepted: 0,
        detail: 'overload_explosion'
      });

      if (hooks.onNodeExploded) {
        hooks.onNodeExploded(node);
      }
    }
    return;
  }

  if (hooks.onPacketResolved) {
    hooks.onPacketResolved(packet, accepted);
  }

  if (!canEmit(node)) {
    return;
  }

  const emission = emitPackets(state, node);
  if (emission.overloadAdded > 0) {
    state.overload += emission.overloadAdded;
    state.lastTurn.overloadDelta += emission.overloadAdded;
  }

  if (Array.isArray(emission.breakerDissipation) && emission.breakerDissipation.length > 0) {
    for (let i = 0; i < emission.breakerDissipation.length; i += 1) {
      const dissipated = emission.breakerDissipation[i];
      state.lastTurn.breakerDissipation.push({
        nodeId: dissipated.nodeId,
        edgeId: dissipated.edgeId,
        amount: dissipated.amount
      });

      state.lastTurn.trace.push({
        step: state.propagationSteps,
        fromNodeId: dissipated.nodeId,
        toNodeId: dissipated.nodeId,
        edgeId: dissipated.edgeId || null,
        energyIn: dissipated.amount,
        energyAccepted: 0,
        detail: `breaker_dissipate_${dissipated.amount}`
      });

      if (hooks.onBreakerDissipated) {
        hooks.onBreakerDissipated({
          nodeId: dissipated.nodeId,
          edgeId: dissipated.edgeId,
          amount: dissipated.amount
        });
      }
    }
  }

  for (let i = 0; i < emission.packets.length; i += 1) {
    const emitted = emission.packets[i];

    enqueuePacket(state, {
      nodeId: emitted.toNodeId,
      fromNodeId: node.id,
      edgeId: emitted.edgeId,
      energy: emitted.energy
    });

    if (hooks.onPacketEmitted) {
      hooks.onPacketEmitted(emitted);
    }
  }
}

function spreadCorruption(state) {
  const newlyCorrupted = [];

  for (let i = 0; i < state.nodes.length; i += 1) {
    const source = state.nodes[i];
    const canSpread = source.baseType === NODE_TYPES.VIRUS;
    if (!canSpread || source.exploded) {
      continue;
    }

    const neighbors = state.neighborsByNode.get(source.id);
    if (!neighbors) {
      continue;
    }

    const spreadStep = source.baseType === NODE_TYPES.VIRUS
      ? Math.max(1, source.spreadRate)
      : CONFIG.TURN.VIRUS_SPREAD_PER_TURN;

    neighbors.forEach((neighborId) => {
      const node = getNodeById(state, neighborId);
      if (!node || node.exploded || node.baseType === NODE_TYPES.VIRUS || node.corrupted) {
        return;
      }

      node.corruptionProgress += spreadStep;
      if (node.corruptionProgress >= CONFIG.TURN.CORRUPTION_THRESHOLD) {
        if (infectNode(node)) {
          newlyCorrupted.push(node.id);
        }
      }
    });
  }

  state.lastTurn.corruptionNew = newlyCorrupted;
}

function applyPurifierEffects(state, hooks) {
  const purifiedNodes = [];
  const purifierActive = [];

  for (let i = 0; i < state.nodes.length; i += 1) {
    const source = state.nodes[i];
    if (
      source.baseType !== NODE_TYPES.PURIFIER ||
      source.exploded ||
      source.corrupted ||
      source.charge < source.threshold
    ) {
      continue;
    }

    const cleansePower = Math.max(0, Number(source.purifierStrength) || 0);
    if (cleansePower <= 0) {
      continue;
    }

    const neighbors = state.neighborsByNode.get(source.id);
    if (!neighbors || neighbors.size === 0) {
      continue;
    }

    purifierActive.push(source.id);

    neighbors.forEach((neighborId) => {
      const node = getNodeById(state, neighborId);
      if (!node || node.exploded || node.baseType === NODE_TYPES.VIRUS) {
        return;
      }

      const hadCorruption = node.corrupted;
      const rawBeforeProgress = Number(node.corruptionProgress) || 0;
      const beforeProgress = hadCorruption && rawBeforeProgress <= 0
        ? CONFIG.TURN.CORRUPTION_THRESHOLD
        : rawBeforeProgress;

      if (!hadCorruption && beforeProgress <= 0) {
        return;
      }

      const nextProgress = Math.max(0, beforeProgress - cleansePower);
      node.corruptionProgress = nextProgress;

      let cleansed = false;
      if (hadCorruption && nextProgress <= 0) {
        node.corrupted = false;
        node.cleanseAccumulated = 0;
        cleansed = true;

        if (state.lastTurn.cleansedNodes.indexOf(node.id) < 0) {
          state.lastTurn.cleansedNodes.push(node.id);
        }
      }

      if (hadCorruption !== node.corrupted || beforeProgress !== node.corruptionProgress) {
        if (purifiedNodes.indexOf(node.id) < 0) {
          purifiedNodes.push(node.id);
        }

        if (hooks.onNodePurified) {
          hooks.onNodePurified({
            purifierId: source.id,
            nodeId: node.id,
            cleansed,
            corruptionBefore: beforeProgress,
            corruptionAfter: node.corruptionProgress
          });
        }
      }

      updateActiveState(node);
    });
  }

  state.lastTurn.purifiedNodes = purifiedNodes;
  state.lastTurn.purifierActive = purifierActive;
}

function applyDecayPhase(state) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    applyDecay(node);
    if (node.baseType === NODE_TYPES.BREAKER) {
      node.breakerArmed = false;
    }
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
    purifiedNodes: [],
    purifierActive: [],
    breakerArmedNodes: [],
    breakerDissipation: [],
    explodedNodes: [],
    objectiveProgress: [],
    status: 'Resolving network propagation...'
  };

  for (let i = 0; i < state.edges.length; i += 1) {
    state.edges[i].overloadedThisTurn = false;
  }

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    beginTurnForNode(node);

    if (node.baseType === NODE_TYPES.BREAKER) {
      node.breakerArmed = Boolean(node.breakerPending);
      node.breakerPending = false;
      if (node.breakerArmed) {
        state.lastTurn.breakerArmedNodes.push(node.id);
      }
    }
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

    processPacket(state, packet, hooks || {});
  }

  spreadCorruption(state);
  applyPurifierEffects(state, hooks || {});
  applyDecayPhase(state);

  return {
    overflow: false
  };
}




