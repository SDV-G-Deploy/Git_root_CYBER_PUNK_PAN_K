import { CONFIG, NODE_TYPES } from './config.js';
import { clamp, lerp } from './physicsLite.js';

function getNodeColor(node) {
  if (node.exploded) {
    return CONFIG.NODES.COLORS.broken;
  }

  if (node.baseType === NODE_TYPES.VIRUS) {
    return CONFIG.NODES.COLORS.virus;
  }

  if (node.corrupted) {
    return CONFIG.NODES.COLORS.infected;
  }

  if (!node.active && node.baseType !== NODE_TYPES.CORE && node.baseType !== NODE_TYPES.POWER) {
    return CONFIG.NODES.COLORS.inactive;
  }

  if (node.baseType === NODE_TYPES.POWER) {
    return CONFIG.NODES.COLORS.power;
  }

  if (node.baseType === NODE_TYPES.RELAY) {
    return CONFIG.NODES.COLORS.relay;
  }

  if (node.baseType === NODE_TYPES.FIREWALL) {
    return CONFIG.NODES.COLORS.firewall;
  }

  if (node.baseType === NODE_TYPES.OVERLOAD) {
    return CONFIG.NODES.COLORS.overload;
  }

  if (node.baseType === NODE_TYPES.CORE) {
    return CONFIG.NODES.COLORS.core;
  }

  return CONFIG.NODES.COLORS.inactive;
}

function buildNodeMap(nodes) {
  const map = new Map();
  for (let i = 0; i < nodes.length; i += 1) {
    map.set(nodes[i].id, nodes[i]);
  }
  return map;
}

function getPulseForNode(state, nodeId) {
  let best = null;
  for (let i = 0; i < state.effects.pulses.length; i += 1) {
    const pulse = state.effects.pulses[i];
    if (pulse.nodeId === nodeId) {
      best = pulse;
    }
  }
  return best;
}

function getNodeBursts(state, nodeId) {
  const bursts = [];
  for (let i = 0; i < state.effects.nodeBursts.length; i += 1) {
    if (state.effects.nodeBursts[i].nodeId === nodeId) {
      bursts.push(state.effects.nodeBursts[i]);
    }
  }
  return bursts;
}

function isHoveredNode(state, nodeId) {
  return state.hoverNodeId === nodeId;
}

function drawArena(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
  gradient.addColorStop(0, '#0a1723');
  gradient.addColorStop(0.55, CONFIG.ARENA.BACKGROUND);
  gradient.addColorStop(1, '#050c12');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  ctx.save();
  ctx.strokeStyle = 'rgba(65, 125, 162, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 24; x < CONFIG.ARENA.WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.ARENA.HEIGHT);
    ctx.stroke();
  }
  for (let y = 24; y < CONFIG.ARENA.HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.ARENA.WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.lineWidth = 2;
  ctx.strokeStyle = CONFIG.ARENA.BORDER;
  ctx.strokeRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  if (state.effects.flashTtl > 0) {
    const alpha = clamp(
      state.effects.flashTtl / CONFIG.FEEDBACK.FLASH_TTL,
      0,
      1
    ) * CONFIG.FEEDBACK.FLASH_ALPHA;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
  }
}

function drawEdgeBase(ctx, edge, from, to, color, width, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawEdges(ctx, state, nodeMap) {
  for (let i = 0; i < state.edges.length; i += 1) {
    const edge = state.edges[i];
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);

    if (!from || !to) {
      continue;
    }

    let color = CONFIG.EDGES.BASE_COLOR;
    let alpha = edge.enabled ? 1 : CONFIG.EDGES.DISABLED_ALPHA;

    if (edge.enabled) {
      color = CONFIG.EDGES.ENABLED_COLOR;
    }

    if (edge.overloadedThisTurn) {
      color = CONFIG.EDGES.OVERLOAD_COLOR;
      alpha = 1;
    }

    const hovered = isHoveredNode(state, edge.from) || isHoveredNode(state, edge.to);
    if (hovered) {
      drawEdgeBase(ctx, edge, from, to, color, CONFIG.EDGES.WIDTH + 6, 0.12);
    }

    drawEdgeBase(ctx, edge, from, to, color, CONFIG.EDGES.WIDTH, alpha);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length > 0.001) {
      const ux = dx / length;
      const uy = dy / length;
      const arrowX = to.x - ux * (to.radius + 8);
      const arrowY = to.y - uy * (to.radius + 8);
      const sideX = -uy;
      const sideY = ux;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - ux * 10 + sideX * 5, arrowY - uy * 10 + sideY * 5);
      ctx.lineTo(arrowX - ux * 10 - sideX * 5, arrowY - uy * 10 - sideY * 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawEdgeBursts(ctx, state, nodeMap) {
  for (let i = 0; i < state.effects.edgeBursts.length; i += 1) {
    const burst = state.effects.edgeBursts[i];
    const edge = state.edges.find((candidate) => candidate.id === burst.edgeId);
    if (!edge) {
      continue;
    }

    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) {
      continue;
    }

    const progress = clamp(1 - burst.t, 0, 1);
    const width = CONFIG.FEEDBACK.EDGE_BURST_WIDTH * (0.5 + progress * 0.5);
    const alpha = 0.12 + progress * 0.26;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = edge.overloadedThisTurn ? CONFIG.EDGES.OVERLOAD_COLOR : '#bff4ff';
    ctx.shadowBlur = 12 + progress * 8;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNodeTypeTag(ctx, node) {
  let tag = '';
  if (node.baseType === NODE_TYPES.POWER) {
    tag = 'P';
  } else if (node.baseType === NODE_TYPES.RELAY) {
    tag = 'R';
  } else if (node.baseType === NODE_TYPES.FIREWALL) {
    tag = 'F';
  } else if (node.baseType === NODE_TYPES.VIRUS) {
    tag = 'V';
  } else if (node.baseType === NODE_TYPES.OVERLOAD) {
    tag = 'O';
  } else if (node.baseType === NODE_TYPES.CORE) {
    tag = 'C';
  }

  if (!tag) {
    return;
  }

  ctx.fillStyle = '#ecf7ff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(tag, node.x - node.radius + 8, node.y - node.radius + 9);
}

function drawNodeGlow(ctx, node, color, radius, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowBlur = radius;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNodePulses(ctx, state, node) {
  const pulse = getPulseForNode(state, node.id);
  if (!pulse) {
    return;
  }

  const progress = clamp(pulse.t, 0, 1);
  const radius = node.radius + progress * CONFIG.FEEDBACK.PULSE_SCALE;
  const alpha = (1 - progress) * (pulse.kind === 'explode' ? 0.58 : 0.36);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = pulse.color;
  ctx.lineWidth = pulse.kind === 'explode' ? 4 : 2;
  ctx.shadowBlur = pulse.kind === 'explode' ? 18 : 10;
  ctx.shadowColor = pulse.color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawNodeBursts(ctx, state, node) {
  const bursts = getNodeBursts(state, node.id);
  for (let i = 0; i < bursts.length; i += 1) {
    const burst = bursts[i];
    const progress = clamp(burst.t, 0, 1);
    const alpha = (1 - progress) * (burst.kind === 'explode' ? 0.7 : 0.26);
    const radius = node.radius + 3 + progress * CONFIG.FEEDBACK.NODE_BURST_SCALE;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = burst.color;
    ctx.shadowBlur = burst.kind === 'explode' ? 20 : 12;
    ctx.shadowColor = burst.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawNodes(ctx, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    const hovered = isHoveredNode(state, node.id);
    const hoverPulse = hovered ? 0.6 + Math.sin(state.effects.time * 7.5) * 0.15 : 0;
    const baseColor = getNodeColor(node);

    drawNodeBursts(ctx, state, node);

    if (node.active || hovered) {
      drawNodeGlow(ctx, node, baseColor, hovered ? 18 : 12, hovered ? 0.2 + hoverPulse * 0.1 : 0.12);
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();

    ctx.lineWidth = hovered ? 3 : node.active ? 3 : 2;
    ctx.strokeStyle = hovered
      ? CONFIG.NODES.COLORS.hoverStroke
      : node.active
        ? CONFIG.NODES.COLORS.activeStroke
        : 'rgba(23, 39, 50, 0.9)';
    ctx.stroke();

    if (hovered) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 7 + hoverPulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawNodePulses(ctx, state, node);
    drawNodeTypeTag(ctx, node);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = CONFIG.NODES.COLORS.label;
    ctx.fillText(node.id, node.x, node.y - 1);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#d2f2ff';

    const chargeLabel = node.baseType === NODE_TYPES.CORE
      ? `${node.charge}/${node.targetCharge}`
      : `${node.charge}`;

    ctx.fillText(chargeLabel, node.x, node.y + node.radius + 11);

    if (node.baseType === NODE_TYPES.FIREWALL) {
      const modeLabel = node.firewallOpen
        ? Array.isArray(node.firewallModes) && node.firewallModes.length > 0
          ? `OPEN M${node.activeMode + 1}`
          : 'OPEN'
        : 'LOCKED';
      ctx.fillStyle = '#dacbff';
      ctx.fillText(modeLabel, node.x, node.y - node.radius - 11);
    }

    if (node.baseType === NODE_TYPES.OVERLOAD) {
      const overloadLabel = node.exploded
        ? 'BOOM'
        : `TP ${node.throughputThisTurn}/${node.overloadThreshold}`;
      ctx.fillStyle = node.exploded ? '#ffd6b8' : '#ffe1be';
      ctx.fillText(overloadLabel, node.x, node.y - node.radius - 11);
    }

    if (node.baseType === NODE_TYPES.VIRUS) {
      ctx.fillStyle = '#ffb5c7';
      ctx.fillText(`SPREAD +${node.spreadRate}`, node.x, node.y + node.radius + 24);
    }

    if (node.corrupted) {
      ctx.fillStyle = '#ffb5c7';
      ctx.fillText(`INF ${node.corruptionProgress}/${CONFIG.TURN.CORRUPTION_THRESHOLD}`, node.x, node.y + node.radius + 24);
    }
  }
}

function drawPackets(ctx, state, nodeMap) {
  const packets = state.effects.packets;
  if (!Array.isArray(packets) || packets.length === 0) {
    return;
  }

  for (let i = 0; i < packets.length; i += 1) {
    const packet = packets[i];
    const from = nodeMap.get(packet.fromNodeId);
    const to = nodeMap.get(packet.toNodeId);
    if (!from || !to) {
      continue;
    }

    const t = clamp(packet.t, 0, 1);
    const x = lerp(from.x, to.x, t);
    const y = lerp(from.y, to.y, t);
    const trailX = lerp(from.x, to.x, Math.max(0, t - 0.08));
    const trailY = lerp(from.y, to.y, Math.max(0, t - 0.08));

    ctx.save();
    ctx.globalAlpha = 0.22 + (1 - t) * CONFIG.FEEDBACK.PACKET_TRAIL_ALPHA;
    ctx.strokeStyle = '#dcfbff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f7fbff';
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.FEEDBACK.PACKET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function getHintTierColor(tier) {
  if (tier >= 3) {
    return '#ff9f6a';
  }

  if (tier === 2) {
    return '#ffd166';
  }

  return '#7fe9ff';
}

function drawHintMarker(ctx, node, color, radius, alpha, dashed) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = color;
  if (dashed) {
    ctx.setLineDash([5, 4]);
  }
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHintFocus(ctx, state, nodeMap) {
  const hint = state.hint;
  if (!hint || !hint.targetNodeId || state.phase === 'end') {
    return;
  }

  const target = nodeMap.get(hint.targetNodeId);
  if (!target) {
    return;
  }

  const tier = clamp(Number(hint.tierShown) || 1, 1, 3);
  const pulse = 0.5 + Math.sin(state.effects.time * 6) * 0.5;
  const color = getHintTierColor(tier);
  const primaryRadius = target.radius + 10 + tier * 2 + pulse * 3;

  drawHintMarker(ctx, target, color, primaryRadius, 0.55, false);
  drawHintMarker(ctx, target, color, primaryRadius + 6, 0.22, true);

  if (hint.secondaryNodeId) {
    const secondary = nodeMap.get(hint.secondaryNodeId);
    if (secondary) {
      const secondaryRadius = secondary.radius + 8 + pulse * 2;
      drawHintMarker(ctx, secondary, '#bfe9ff', secondaryRadius, 0.24, true);
    }
  }
}

function drawDangerFlash(ctx, state) {
  if (state.effects.dangerFlashTtl <= 0) {
    return;
  }

  const alpha = clamp(
    state.effects.dangerFlashTtl / CONFIG.FEEDBACK.DANGER_FLASH_TTL,
    0,
    1
  ) * CONFIG.FEEDBACK.DANGER_FLASH_ALPHA;
  ctx.fillStyle = `rgba(255, 154, 88, ${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
}

export function renderState(ctx, state) {
  if (!ctx || !state) {
    return;
  }

  const nodeMap = buildNodeMap(state.nodes);
  const shakeProgress = clamp(
    state.effects.shakeTtl / Math.max(CONFIG.FEEDBACK.SHAKE_TTL, 0.0001),
    0,
    1
  );
  const shakeAmount = state.effects.shakeMagnitude * shakeProgress;
  const offsetX = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0;
  const offsetY = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  drawArena(ctx, state);
  drawEdgeBursts(ctx, state, nodeMap);
  drawEdges(ctx, state, nodeMap);
  drawPackets(ctx, state, nodeMap);
  drawNodes(ctx, state);
  drawHintFocus(ctx, state, nodeMap);
  drawDangerFlash(ctx, state);
  ctx.restore();
}
