import { CONFIG, NODE_TYPES } from './config.js';
import { clamp } from './physicsLite.js';

export function isClickableNode(node) {
  return node && (node.baseType === NODE_TYPES.POWER || node.baseType === NODE_TYPES.FIREWALL || node.baseType === NODE_TYPES.BREAKER);
}

export function beginTurnForNode(node) {
  node.emittedThisTurn = false;
  node.receivedThisTurn = 0;
  node.cleanseAccumulated = 0;
  node.throughputThisTurn = 0;
  node.breakerDissipatedThisTurn = 0;
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
    return {
      incoming,
      effective: 0,
      accepted: 0,
      corruptionLoss: 0,
      capacityLoss: 0
    };
  }

  const effective = node.corrupted
    ? Math.floor(incoming * CONFIG.TURN.CORRUPTION_ABSORB_FACTOR)
    : incoming;

  if (effective <= 0) {
    return {
      incoming,
      effective: 0,
      accepted: 0,
      corruptionLoss: node.corrupted ? incoming : 0,
      capacityLoss: 0
    };
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

  return {
    incoming,
    effective,
    accepted,
    corruptionLoss: Math.max(0, incoming - effective),
    capacityLoss: Math.max(0, effective - accepted)
  };
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
  const breakerDissipation = [];
  const diagnostics = {
    splitEvents: [],
    attenuatedEdges: [],
    cappedEdges: []
  };

  const eligibleEdges = [];

  for (let i = 0; i < outgoing.length; i += 1) {
    const edge = state.edges[outgoing[i]];
    edge.overloadedThisTurn = false;

    if (!edge.enabled || node.exploded) {
      continue;
    }

    eligibleEdges.push(outgoing[i]);
  }

  if (node.baseType === NODE_TYPES.SPLITTER) {
    eligibleEdges.sort((leftIndex, rightIndex) => {
      const leftId = String(state.edges[leftIndex].id || '');
      const rightId = String(state.edges[rightIndex].id || '');

      if (leftId < rightId) {
        return -1;
      }

      if (leftId > rightId) {
        return 1;
      }

      return leftIndex - rightIndex;
    });

    const activeOutputCount = eligibleEdges.length;
    const totalEmit = Math.max(0, Math.trunc(Number(node.emitPower) || 0));
    const baseShare = activeOutputCount > 0 ? Math.floor(totalEmit / activeOutputCount) : 0;
    const remainder = activeOutputCount > 0 ? totalEmit % activeOutputCount : 0;

    if (activeOutputCount > 0) {
      diagnostics.splitEvents.push({
        nodeId: node.id,
        outputCount: activeOutputCount,
        emitPower: totalEmit
      });
    }

    for (let i = 0; i < eligibleEdges.length; i += 1) {
      const edge = state.edges[eligibleEdges[i]];
      const splitShare = baseShare + (i < remainder ? 1 : 0);
      const attenuated = splitShare - edge.attenuation;

      if (attenuated <= 0) {
        diagnostics.attenuatedEdges.push({
          edgeId: edge.id,
          fromNodeId: node.id,
          toNodeId: edge.to,
          rawPower: splitShare,
          attenuation: edge.attenuation
        });
        continue;
      }

      let output = attenuated;

      if (output <= 0) {
        continue;
      }

      if (output > edge.capacity) {
        const overflow = output - edge.capacity;
        overloadAdded += overflow;
        diagnostics.cappedEdges.push({
          edgeId: edge.id,
          fromNodeId: node.id,
          toNodeId: edge.to,
          beforeCap: output,
          capacity: edge.capacity,
          overflow
        });
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
  } else {
    for (let i = 0; i < eligibleEdges.length; i += 1) {
      const edge = state.edges[eligibleEdges[i]];
      const attenuated = node.emitPower - edge.attenuation;

      if (attenuated <= 0) {
        diagnostics.attenuatedEdges.push({
          edgeId: edge.id,
          fromNodeId: node.id,
          toNodeId: edge.to,
          rawPower: Math.max(0, Number(node.emitPower) || 0),
          attenuation: edge.attenuation
        });
        continue;
      }

      let output = attenuated;

      if (output <= 0) {
        continue;
      }

      if (node.baseType === NODE_TYPES.BREAKER && node.breakerArmed) {
        const safeCap = Math.max(0, Math.floor(Number(node.breakerCap) || 0));
        if (output > safeCap) {
          const dissipated = output - safeCap;
          output = safeCap;
          node.breakerDissipatedThisTurn += dissipated;
          breakerDissipation.push({
            nodeId: node.id,
            edgeId: edge.id,
            amount: dissipated
          });
        }
      }

      if (output <= 0) {
        continue;
      }

      if (output > edge.capacity) {
        const overflow = output - edge.capacity;
        overloadAdded += overflow;
        diagnostics.cappedEdges.push({
          edgeId: edge.id,
          fromNodeId: node.id,
          toNodeId: edge.to,
          beforeCap: output,
          capacity: edge.capacity,
          overflow
        });
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
  }

  node.emittedThisTurn = true;

  return {
    packets,
    overloadAdded,
    breakerDissipation,
    diagnostics
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
