import { CONFIG } from './config.js';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function findClosestNode(nodes, x, y, maxDistance) {
  const limit = Number.isFinite(maxDistance) ? maxDistance : CONFIG.NODES.CLICK_RADIUS;
  let best = null;
  let bestDistance = limit;

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const d = distance(x, y, node.x, node.y);
    if (d <= bestDistance) {
      bestDistance = d;
      best = node;
    }
  }

  return best;
}

export function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

export function updatePackets(state, dt) {
  const packets = state.effects.packets;

  for (let i = packets.length - 1; i >= 0; i -= 1) {
    const packet = packets[i];
    packet.t += dt / Math.max(packet.ttl, 0.0001);

    if (packet.t >= 1) {
      packets.splice(i, 1);
    }
  }

  state.effects.flashTtl = Math.max(0, state.effects.flashTtl - dt);
}