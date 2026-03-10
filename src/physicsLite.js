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

function updateTimedCollection(items, dt) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    item.t += dt / Math.max(item.ttl, 0.0001);

    if (item.t >= 1) {
      items.splice(i, 1);
    }
  }
}

export function updatePackets(state, dt) {
  state.effects.time += dt;

  updateTimedCollection(state.effects.packets, dt);
  updateTimedCollection(state.effects.pulses, dt);
  updateTimedCollection(state.effects.edgeBursts, dt);
  updateTimedCollection(state.effects.nodeBursts, dt);
  updateTimedCollection(state.effects.missMarkers, dt);

  state.effects.flashTtl = Math.max(0, state.effects.flashTtl - dt);
  state.effects.dangerFlashTtl = Math.max(0, state.effects.dangerFlashTtl - dt);
  state.effects.shakeTtl = Math.max(0, state.effects.shakeTtl - dt);

  if (state.effects.shakeTtl <= 0) {
    state.effects.shakeMagnitude = 0;
  }
}
