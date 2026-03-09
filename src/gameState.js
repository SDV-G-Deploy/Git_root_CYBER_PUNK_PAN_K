import { CONFIG } from './config.js';

export function createRunId() {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `run_${now}_${random}`;
}

export function createChainState() {
  return {
    queue: [],
    queueHead: 0,
    queuedIds: new Set(),
    visitedIds: new Set(),
    steps: 0,
    maxDepth: 0,
    multiplier: CONFIG.CHAIN.START_MULTIPLIER,
    capped: false
  };
}

export function createLastShotReport(scoreBefore) {
  const baseScore = Number(scoreBefore) || 0;

  return {
    fired: false,
    hit: false,
    targetNodeId: null,
    missReason: null,
    scoreBefore: baseScore,
    scoreAfter: baseScore,
    scoreGain: 0,
    chainSteps: 0,
    chainDepth: 0,
    pointsMissing: 0,
    resolution: 'idle'
  };
}

export function createNodes(level) {
  return level.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    radius: CONFIG.NODES.RADIUS,
    resolved: false
  }));
}

export function createState(level, levelIndex, levelCount) {
  return {
    runId: createRunId(),
    levelId: level.id,
    levelIndex,
    levelCount,
    targetScore: level.targetScore,
    difficultyTag: level.difficultyTag,
    score: 0,
    shotsRemaining: level.shotsLimit,
    shotsFired: 0,
    shotsHit: 0,
    phase: 'aim',
    result: 'in_progress',
    ended: false,
    revision: 0,
    lastShotHit: false,
    projectile: null,
    nodes: createNodes(level),
    aim: {
      x: CONFIG.SHOOTER.X + 120,
      y: CONFIG.SHOOTER.Y,
      active: false
    },
    chain: createChainState(),
    chainTrace: [],
    lastShotReport: createLastShotReport(0),
    rewardPacket: null,
    telemetry: [],
    visualLinks: [],
    particles: [],
    chainCues: [],
    hitFlashTtl: 0,
    screenShakeTtl: 0,
    accumulator: 0
  };
}

export function bumpRevision(state) {
  state.revision += 1;
}

export function getSnapshot(state) {
  return {
    levelId: state.levelId,
    levelIndex: state.levelIndex,
    levelCount: state.levelCount,
    targetScore: state.targetScore,
    difficultyTag: state.difficultyTag,
    score: state.score,
    shotsRemaining: state.shotsRemaining,
    phase: state.phase,
    lastShotHit: state.lastShotHit,
    chainDepth: state.chain.maxDepth,
    chainSteps: state.chain.steps,
    result: state.result,
    revision: state.revision
  };
}

export function getLastShotReport(state) {
  return state && state.lastShotReport
    ? { ...state.lastShotReport }
    : createLastShotReport(0);
}

export function getChainTrace(state) {
  return state.chainTrace.map((entry) => ({ ...entry }));
}

export function getRunSummary(state, accuracy) {
  return {
    runId: state.runId,
    levelId: state.levelId,
    levelIndex: state.levelIndex,
    levelCount: state.levelCount,
    targetScore: state.targetScore,
    difficultyTag: state.difficultyTag,
    result: state.result,
    phase: state.phase,
    score: state.score,
    shotsRemaining: state.shotsRemaining,
    shotsFired: state.shotsFired,
    shotsHit: state.shotsHit,
    chainDepth: state.chain.maxDepth,
    chainSteps: state.chain.steps,
    accuracy,
    lastShotReport: getLastShotReport(state),
    rewardPacket: state.rewardPacket,
    revision: state.revision
  };
}