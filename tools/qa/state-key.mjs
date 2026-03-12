export function createStateKey(state) {
  const nodeKey = state.nodes
    .map((node) => [
      node.id,
      node.charge,
      node.corrupted ? 1 : 0,
      node.exploded ? 1 : 0,
      node.active ? 1 : 0,
      node.firewallOpen ? 1 : 0,
      Number.isFinite(node.activeMode) ? node.activeMode : 0,
      node.breakerPending ? 1 : 0,
      node.breakerArmed ? 1 : 0,
      node.corruptionProgress,
      node.cleanseAccumulated
    ].join(':'))
    .join('|');

  const edgeKey = state.edges
    .map((edge) => [
      edge.id,
      edge.enabled ? 1 : 0,
      edge.baseEnabled ? 1 : 0,
      edge.overloadedThisTurn ? 1 : 0
    ].join(':'))
    .join('|');

  const objectiveKey = state.objectives
    .map((objective) => (objective.done ? '1' : '0'))
    .join('');

  return [
    state.levelId,
    state.movesUsed,
    state.movesRemaining,
    state.overload,
    state.phase,
    state.result,
    state.endReason || 'none',
    nodeKey,
    edgeKey,
    objectiveKey
  ].join('||');
}

