import { CONFIG } from './config.js';
import { createChainState } from './gameState.js';

export function resetChainForShot(state) {
  state.chain = createChainState();
  state.chainTrace = [];
}

export function enqueueChainNode(state, nodeId, depth, reason, sourceId) {
  if (state.chain.queue.length - state.chain.queueHead >= CONFIG.CHAIN.MAX_QUEUE_SIZE) {
    return false;
  }

  if (state.chain.queuedIds.has(nodeId) || state.chain.visitedIds.has(nodeId)) {
    return false;
  }

  state.chain.queue.push({ nodeId, depth, reason, sourceId });
  state.chain.queuedIds.add(nodeId);
  return true;
}

export function startChainFrom(state, nodeId) {
  state.chain = createChainState();
  enqueueChainNode(state, nodeId, 0, 'direct_hit', 'projectile');
  state.phase = 'resolve';
}

function popChainEvent(state) {
  if (state.chain.queueHead >= state.chain.queue.length) {
    return null;
  }

  const event = state.chain.queue[state.chain.queueHead];
  state.chain.queue[state.chain.queueHead] = null;
  state.chain.queueHead += 1;

  if (state.chain.queueHead > 32 && state.chain.queueHead * 2 > state.chain.queue.length) {
    state.chain.queue = state.chain.queue.slice(state.chain.queueHead);
    state.chain.queueHead = 0;
  }

  return event;
}

function hasPendingEvents(state) {
  return state.chain.queueHead < state.chain.queue.length;
}

export function resolveChainStep(state, resolveNodeEvent, emitTelemetry) {
  let processed = 0;

  while (hasPendingEvents(state) && processed < CONFIG.CHAIN.RESOLVE_BATCH_SIZE) {
    if (state.chain.steps >= CONFIG.CHAIN.MAX_STEPS) {
      state.chain.capped = true;
      state.chain.queue = [];
      state.chain.queueHead = 0;
      break;
    }

    const event = popChainEvent(state);
    if (!event) {
      break;
    }

    state.chain.queuedIds.delete(event.nodeId);

    if (state.chain.visitedIds.has(event.nodeId)) {
      processed += 1;
      continue;
    }

    state.chain.visitedIds.add(event.nodeId);
    state.chain.steps += 1;

    resolveNodeEvent(event);
    processed += 1;
  }

  if (!hasPendingEvents(state)) {
    emitTelemetry('chain_resolved', {
      levelId: state.levelId,
      steps: state.chain.steps,
      maxDepth: state.chain.maxDepth,
      capped: state.chain.capped
    });

    return true;
  }

  return false;
}