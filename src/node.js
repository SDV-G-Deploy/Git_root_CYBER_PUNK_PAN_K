import { CONFIG, NODE_TYPES } from './config.js';
import { clamp } from './physicsLite.js';

export function isClickableNode(node) {
  return node && (node.baseType === NODE_TYPES.POWER || node.baseType === NODE_TYPES.FIREWALL);
}

export function beginTurnForNode(node) {
  node.emittedThisTurn = false;
  node.receivedThisTurn = 0;
  node.cleanseAccumulated = 0;
  node.throughputThisTurn = 0;
}

export function updateActiveState(node) {
  if (node.exploded) {
    node.active = false;
    return;
  }

  if (node.baseType === NODE_TYPES.CORE) {
    node.active = node.charge > 0;
    return;
  }

  if (node.baseType === NODE_TYPES.VIRUS) {
    node.active = true;
    return;
  }

  if (node.corrupted) {
    node.active = false;
    return;
  }

  if (node.baseType === NODE_TYPES.POWER) {
    node.active = true;
    return;
  }

  if (node.baseType === NODE_TYPES.FIREWALL) {
    node.active = node.firewallOpen && node.charge >= node.threshold;
    return;
  }

  node.active = node.charge >= node.threshold;
}

export function applyFirewallMode(state, firewallNode) {
  if (!firewallNode || firewallNode.baseType !== NODE_TYPES.FIREWALL) {
    return;
  }

  const outgoing = state.outgoingByNode.get(firewallNode.id) || [];
  if (outgoing.length === 0) {
    return;
  }

  if (!firewallNode.firewallOpen) {
    for (let i = 0; i < outgoing.length; i += 1) {
      const edge = state.edges[outgoing[i]];
      edge.enabled = false;
    }
    return;
  }

  const hasModes = Array.isArray(firewallNode.firewallModes) && firewallNode.firewallModes.length > 0;
  const activeMode = hasModes
    ? clamp(firewallNode.activeMode, 0, firewallNode.firewallModes.length - 1)
    : 0;

  firewallNode.activeMode = activeMode;
  const allowedSet = hasModes ? new Set(firewallNode.firewallModes[activeMode]) : null;

  for (let i = 0; i < outgoing.length; i += 1) {
    const edge = state.edges[outgoing[i]];
    if (!edge.baseEnabled) {
      edge.enabled = false;
      continue;
    }

    edge.enabled = hasModes ? allowedSet.has(edge.id) : true;
  }
}

export function toggleFirewallMode(state, firewallNode) {
  if (!firewallNode || firewallNode.baseType !== NODE_TYPES.FIREWALL) {
    return false;
  }

  const hasModes = Array.isArray(firewallNode.firewallModes) && firewallNode.firewallModes.length > 0;

  if (!firewallNode.firewallOpen) {
    firewallNode.firewallOpen = true;
    if (hasModes) {
      firewallNode.activeMode = clamp(firewallNode.activeMode, 0, firewallNode.firewallModes.length - 1);
    }
  } else if (hasModes && firewallNode.firewallModes.length > 1) {
    firewallNode.activeMode = (firewallNode.activeMode + 1) % firewallNode.firewallModes.length;
  } else {
    firewallNode.firewallOpen = false;
  }

  applyFirewallMode(state, firewallNode);
  return true;
}

export function receiveEnergy(node, energy) {
  const incoming = Math.max(0, energy);
  if (incoming <= 0 || node.exploded) {
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

  if (node.baseType === NODE_TYPES.OVERLOAD) {
    node.throughputThisTurn += accepted;
  }

  if (node.corrupted) {
    node.cleanseAccumulated += accepted;
  }

  return accepted;
}

export function canEmit(node) {
  if (node.emittedThisTurn || node.exploded) {
    return false;
  }

  if (node.corrupted || node.baseType === NODE_TYPES.CORE || node.baseType === NODE_TYPES.VIRUS) {
    return false;
  }

  if (node.baseType === NODE_TYPES.POWER) {
    return true;
  }

  if (node.baseType === NODE_TYPES.FIREWALL && !node.firewallOpen) {
    return false;
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

    if (!edge.enabled || node.exploded) {
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
  if (
    node.baseType === NODE_TYPES.CORE ||
    node.baseType === NODE_TYPES.POWER ||
    node.baseType === NODE_TYPES.VIRUS ||
    node.exploded
  ) {
    return;
  }

  node.charge = Math.max(0, node.charge - CONFIG.TURN.DECAY_PER_TURN);
}
