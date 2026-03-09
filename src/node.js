import { CONFIG, NODE_TYPES } from './config.js';
import { clamp } from './physicsLite.js';

export function isClickableNode(node) {
  return node && (node.baseType === NODE_TYPES.SOURCE || node.baseType === NODE_TYPES.SWITCH);
}

export function beginTurnForNode(node) {
  node.emittedThisTurn = false;
  node.receivedThisTurn = 0;
  node.cleanseAccumulated = 0;
}

export function updateActiveState(node) {
  if (node.baseType === NODE_TYPES.CORE) {
    node.active = node.charge > 0;
    return;
  }

  if (node.corrupted) {
    node.active = false;
    return;
  }

  if (node.baseType === NODE_TYPES.SOURCE) {
    node.active = true;
    return;
  }

  node.active = node.charge >= node.threshold;
}

export function applySwitchMode(state, switchNode) {
  if (!switchNode || !Array.isArray(switchNode.switchModes) || switchNode.switchModes.length === 0) {
    return;
  }

  const modeIndex = clamp(switchNode.activeMode, 0, switchNode.switchModes.length - 1);
  switchNode.activeMode = modeIndex;

  const allowed = new Set(switchNode.switchModes[modeIndex]);

  const outgoing = state.outgoingByNode.get(switchNode.id) || [];
  for (let i = 0; i < outgoing.length; i += 1) {
    const edge = state.edges[outgoing[i]];
    edge.enabled = allowed.has(edge.id);
  }
}

export function toggleSwitchMode(state, switchNode) {
  if (!switchNode || !Array.isArray(switchNode.switchModes) || switchNode.switchModes.length === 0) {
    return false;
  }

  switchNode.activeMode = (switchNode.activeMode + 1) % switchNode.switchModes.length;
  applySwitchMode(state, switchNode);
  return true;
}

export function receiveEnergy(node, energy) {
  const incoming = Math.max(0, energy);
  if (incoming <= 0) {
    return 0;
  }

  const effective = node.corrupted
    ? Math.floor(incoming * CONFIG.TURN.CORRUPTION_ABSORB_FACTOR)
    : incoming;

  if (effective <= 0) {
    return 0;
  }

  const before = node.charge;
  node.charge = Math.min(node.maxCharge, node.charge + effective);
  const accepted = Math.max(0, node.charge - before);
  node.receivedThisTurn += accepted;

  if (node.corrupted) {
    node.cleanseAccumulated += accepted;
  }

  return accepted;
}

export function canEmit(node) {
  if (node.emittedThisTurn) {
    return false;
  }

  if (node.corrupted || node.baseType === NODE_TYPES.CORE) {
    return false;
  }

  if (node.baseType === NODE_TYPES.SOURCE) {
    return true;
  }

  return node.charge >= node.threshold;
}

export function emitPackets(state, node) {
  const outgoing = state.outgoingByNode.get(node.id) || [];
  const packets = [];
  let overloadAdded = 0;

  for (let i = 0; i < outgoing.length; i += 1) {
    const edge = state.edges[outgoing[i]];
    edge.overloadedThisTurn = false;

    if (!edge.enabled) {
      continue;
    }

    let output = Math.max(0, node.emitPower - edge.attenuation);
    if (output <= 0) {
      continue;
    }

    if (output > edge.capacity) {
      overloadAdded += output - edge.capacity;
      output = edge.capacity;
      edge.overloadedThisTurn = true;
    }

    if (output <= 0) {
      continue;
    }

    packets.push({
      fromNodeId: node.id,
      toNodeId: edge.to,
      edgeId: edge.id,
      energy: output
    });
  }

  node.emittedThisTurn = true;

  return {
    packets,
    overloadAdded
  };
}

export function applyDecay(node) {
  if (node.baseType === NODE_TYPES.CORE || node.baseType === NODE_TYPES.SOURCE) {
    return;
  }

  node.charge = Math.max(0, node.charge - CONFIG.TURN.DECAY_PER_TURN);
}