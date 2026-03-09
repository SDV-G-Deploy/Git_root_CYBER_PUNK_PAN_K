import { CONFIG, NODE_TYPES } from './config.js';
import { clamp, lerp } from './physicsLite.js';

function nodeColor(node) {
  if (node.corrupted) {
    return CONFIG.NODES.COLORS.corrupted;
  }

  if (!node.active && node.baseType !== NODE_TYPES.CORE) {
    if (node.baseType === NODE_TYPES.SOURCE) {
      return CONFIG.NODES.COLORS.source;
    }

    return CONFIG.NODES.COLORS.inactive;
  }

  if (node.baseType === NODE_TYPES.SOURCE) {
    return CONFIG.NODES.COLORS.source;
  }

  if (node.baseType === NODE_TYPES.RELAY) {
    return CONFIG.NODES.COLORS.relay;
  }

  if (node.baseType === NODE_TYPES.CORE) {
    return CONFIG.NODES.COLORS.core;
  }

  if (node.baseType === NODE_TYPES.SWITCH) {
    return CONFIG.NODES.COLORS.switch;
  }

  return CONFIG.NODES.COLORS.inactive;
}

function drawArena(ctx) {
  ctx.fillStyle = CONFIG.ARENA.BACKGROUND;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

  ctx.lineWidth = 2;
  ctx.strokeStyle = CONFIG.ARENA.BORDER;
  ctx.strokeRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
}

function drawEdges(ctx, state) {
  for (let i = 0; i < state.edges.length; i += 1) {
    const edge = state.edges[i];
    const from = state.nodes.find((node) => node.id === edge.from);
    const to = state.nodes.find((node) => node.id === edge.to);

    if (!from || !to) {
      continue;
    }

    let color = CONFIG.EDGES.BASE_COLOR;
    if (edge.enabled) {
      color = CONFIG.EDGES.ENABLED_COLOR;
    }
    if (edge.overloadedThisTurn) {
      color = CONFIG.EDGES.OVERLOAD_COLOR;
    }

    ctx.save();
    if (!edge.enabled) {
      ctx.globalAlpha = CONFIG.EDGES.DISABLED_ALPHA;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = CONFIG.EDGES.WIDTH;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

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

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - ux * 10 + sideX * 5, arrowY - uy * 10 + sideY * 5);
      ctx.lineTo(arrowX - ux * 10 - sideX * 5, arrowY - uy * 10 - sideY * 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawNodes(ctx, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor(node);
    ctx.fill();

    ctx.lineWidth = node.active ? 3 : 2;
    ctx.strokeStyle = node.active
      ? CONFIG.NODES.COLORS.activeStroke
      : 'rgba(23, 39, 50, 0.9)';
    ctx.stroke();

    if (state.hoverNodeId === node.id) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = CONFIG.NODES.COLORS.hoverStroke;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = CONFIG.NODES.COLORS.label;
    ctx.fillText(node.id, node.x, node.y - 1);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#d2f2ff';

    const chargeLabel = node.baseType === NODE_TYPES.CORE
      ? `${node.charge}/${node.targetCharge}`
      : `${node.charge}`;

    ctx.fillText(chargeLabel, node.x, node.y + node.radius + 11);

    if (node.baseType === NODE_TYPES.SWITCH && Array.isArray(node.switchModes) && node.switchModes.length > 0) {
      const modeLabel = `M${node.activeMode + 1}/${node.switchModes.length}`;
      ctx.fillStyle = '#dacbff';
      ctx.fillText(modeLabel, node.x, node.y - node.radius - 11);
    }

    if (node.corrupted) {
      ctx.fillStyle = '#ff9ab2';
      ctx.fillText(`V:${node.corruptionProgress}`, node.x, node.y + node.radius + 24);
    }
  }
}

function drawPackets(ctx, state) {
  const packets = state.effects.packets;
  if (!Array.isArray(packets) || packets.length === 0) {
    return;
  }

  for (let i = 0; i < packets.length; i += 1) {
    const packet = packets[i];
    const from = state.nodes.find((node) => node.id === packet.fromNodeId);
    const to = state.nodes.find((node) => node.id === packet.toNodeId);
    if (!from || !to) {
      continue;
    }

    const t = clamp(packet.t, 0, 1);
    const x = lerp(from.x, to.x, t);
    const y = lerp(from.y, to.y, t);

    ctx.beginPath();
    ctx.arc(x, y, CONFIG.FEEDBACK.PACKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#f7fbff';
    ctx.fill();
  }
}

function drawFlash(ctx, state) {
  if (state.effects.flashTtl <= 0) {
    return;
  }

  const alpha = clamp(state.effects.flashTtl / CONFIG.FEEDBACK.FLASH_TTL, 0, 1) * CONFIG.FEEDBACK.FLASH_ALPHA;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);
}

export function renderState(ctx, state) {
  if (!ctx || !state) {
    return;
  }

  drawArena(ctx);
  drawEdges(ctx, state);
  drawPackets(ctx, state);
  drawNodes(ctx, state);
  drawFlash(ctx, state);
}