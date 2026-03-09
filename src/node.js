import { CONFIG } from './config.js';
import { clamp, distance, normalize } from './physicsLite.js';
import { applyMultiplierGrowth, applyNodeScore } from './scoring.js';

function pushNode(origin, target) {
  const direction = normalize(target.x - origin.x, target.y - origin.y) || { x: 1, y: 0 };

  target.x = clamp(
    target.x + direction.x * CONFIG.CHAIN.PUSHER_FORCE,
    target.radius,
    CONFIG.ARENA.WIDTH - target.radius
  );
  target.y = clamp(
    target.y + direction.y * CONFIG.CHAIN.PUSHER_FORCE,
    target.radius,
    CONFIG.ARENA.HEIGHT - target.radius
  );
}

function bombBehavior(state, node, event, enqueueChainNode) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.id === node.id || target.resolved) {
      continue;
    }

    if (distance(node.x, node.y, target.x, target.y) <= CONFIG.CHAIN.BOMB_RADIUS) {
      enqueueChainNode(target.id, event.depth + 1, 'bomb_aoe', node.id);
    }
  }
}

function pusherBehavior(state, node, event, enqueueChainNode) {
  for (let i = 0; i < state.nodes.length; i += 1) {
    const target = state.nodes[i];
    if (target.id === node.id || target.resolved) {
      continue;
    }

    if (distance(node.x, node.y, target.x, target.y) <= CONFIG.CHAIN.PUSHER_RADIUS) {
      pushNode(node, target);
      enqueueChainNode(target.id, event.depth + 1, 'pusher_impulse', node.id);
    }
  }
}

const NODE_BEHAVIORS = Object.freeze({
  bomb: bombBehavior,
  pusher: pusherBehavior,
  multiplier: null
});

export function resolveNodeEvent(context) {
  const {
    state,
    event,
    modifiers,
    getNodeById,
    enqueueChainNode,
    addVisualLink,
    createHitFeedback,
    emitTelemetry
  } = context;

  const node = getNodeById(event.nodeId);
  if (!node || node.resolved) {
    return null;
  }

  node.resolved = true;
  state.lastShotHit = true;

  if (state.lastShotReport) {
    state.lastShotReport.hit = true;
    state.lastShotReport.missReason = null;
    state.lastShotReport.resolution = 'hit_reacting';
    if (!state.lastShotReport.targetNodeId) {
      state.lastShotReport.targetNodeId = node.id;
    }
  }

  state.chain.maxDepth = Math.max(state.chain.maxDepth, event.depth);

  if (node.type === 'multiplier') {
    applyMultiplierGrowth(state, modifiers);
  }

  const points = applyNodeScore(state, node.type, event.depth, modifiers);

  addVisualLink(event.sourceId, node);
  createHitFeedback(node, state.chain.steps);

  emitTelemetry('chain_step', {
    levelId: state.levelId,
    nodeId: node.id,
    nodeType: node.type,
    sourceId: event.sourceId,
    reason: event.reason,
    depth: event.depth,
    points,
    chainMultiplier: state.chain.multiplier
  });

  state.chainTrace.push({
    step: state.chain.steps,
    depth: event.depth,
    sourceId: event.sourceId,
    targetId: node.id,
    nodeType: node.type,
    reason: event.reason,
    points
  });

  if (state.chainTrace.length > CONFIG.CHAIN.TRACE_MAX) {
    state.chainTrace.splice(0, state.chainTrace.length - CONFIG.CHAIN.TRACE_MAX);
  }

  const behavior = NODE_BEHAVIORS[node.type];
  if (typeof behavior === 'function') {
    behavior(state, node, event, enqueueChainNode);
  }

  return {
    node,
    points
  };
}