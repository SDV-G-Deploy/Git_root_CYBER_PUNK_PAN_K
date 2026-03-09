import { loadLevels } from '../../src/levels.js';
import { predictActualDifficulty } from './difficulty-model.mjs';
import { solveLevel } from './solver.mjs';
import { computeTopologyFingerprint } from './topology-fingerprint.mjs';

export const DEFAULT_PACK_SLOT_TEMPLATE = Object.freeze([
  Object.freeze({ id: 'slot1', role: 'warmup', label: 'Warmup Puzzle', targetBand: 'easy', preferredTags: ['warmup'], preferredActual: ['easy'], fallbackTags: ['easy'], maxBranching: 1.6, maxNodeCount: 4, maxEdgeCount: 4, maxMinMoves: 4 }),
  Object.freeze({ id: 'slot2', role: 'easy', label: 'Easy Puzzle A', targetBand: 'easy', preferredTags: ['easy', 'warmup'], preferredActual: ['easy'], fallbackTags: ['medium'] }),
  Object.freeze({ id: 'slot3', role: 'easy', label: 'Easy Puzzle B', targetBand: 'easy', preferredTags: ['easy', 'warmup'], preferredActual: ['easy'], fallbackTags: ['medium'] }),
  Object.freeze({ id: 'slot4', role: 'medium', label: 'Medium Puzzle A', targetBand: 'medium', preferredTags: ['medium'], preferredActual: ['medium'], fallbackTags: ['easy', 'hard'] }),
  Object.freeze({ id: 'slot5', role: 'medium', label: 'Medium Puzzle B', targetBand: 'medium', preferredTags: ['medium'], preferredActual: ['medium'], fallbackTags: ['easy', 'hard'] }),
  Object.freeze({ id: 'slot6', role: 'medium', label: 'Medium Puzzle C', targetBand: 'medium', preferredTags: ['medium'], preferredActual: ['medium'], fallbackTags: ['easy', 'hard'] }),
  Object.freeze({ id: 'slot7', role: 'hard', label: 'Hard Puzzle A', targetBand: 'hard', preferredTags: ['hard'], preferredActual: ['hard'], fallbackTags: ['medium', 'challenge'] }),
  Object.freeze({ id: 'slot8', role: 'hard', label: 'Hard Puzzle B', targetBand: 'hard', preferredTags: ['hard'], preferredActual: ['hard'], fallbackTags: ['medium', 'challenge'] }),
  Object.freeze({ id: 'slot9', role: 'challenge', label: 'Challenge Puzzle', targetBand: 'hard', preferredTags: ['challenge', 'hard'], preferredActual: ['hard', 'extreme'], fallbackTags: ['medium'], minMinMoves: 5, minBranching: 2 }),
  Object.freeze({ id: 'slot10', role: 'boss', label: 'Boss Puzzle', targetBand: 'extreme', preferredTags: ['boss', 'challenge', 'hard'], preferredActual: ['hard', 'extreme'], fallbackTags: ['medium'], minMinMoves: 6, minBranching: 2.2, minNodeCount: 6, minEdgeCount: 7 })
]);

export const PACK_BUILDER_DEFAULTS = Object.freeze({
  minMovesFloor: 3,
  maxSolutionCount: 4096,
  randomClickRootSolvableRatio: 0.75,
  randomClickSolutionFloor: 128,
  randomClickDeadStateRatio: 0.12,
  solverOptions: undefined,
  difficultyCalibration: null,
  slotTemplate: DEFAULT_PACK_SLOT_TEMPLATE
});

const TAG_ALIASES = Object.freeze({
  intro: 'warmup',
  warmup: 'warmup',
  light: 'easy',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  challenge: 'challenge',
  boss: 'boss',
  extreme: 'boss'
});

const ACTUAL_BUCKET_ORDER = Object.freeze({
  easy: 1,
  medium: 2,
  hard: 3,
  extreme: 4
});

function withDefaults(options) {
  const merged = {
    ...PACK_BUILDER_DEFAULTS,
    ...(options || {})
  };

  merged.solverOptions = options?.solverOptions || PACK_BUILDER_DEFAULTS.solverOptions;
  merged.slotTemplate = Array.isArray(options?.slotTemplate) && options.slotTemplate.length > 0
    ? options.slotTemplate
    : PACK_BUILDER_DEFAULTS.slotTemplate;
  return merged;
}

function roundNumber(value, digits = 2) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function normalizeDifficultyTag(value, predictedActualClass) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw && TAG_ALIASES[raw]) {
    return TAG_ALIASES[raw];
  }

  if (predictedActualClass === 'easy') {
    return 'easy';
  }

  if (predictedActualClass === 'medium') {
    return 'medium';
  }

  if (predictedActualClass === 'hard') {
    return 'hard';
  }

  if (predictedActualClass === 'extreme') {
    return 'challenge';
  }

  return 'medium';
}

function summarizeDegeneracyMetrics(result) {
  const rootBranchCount = result.rootBranchAnalysis.length;
  const solvableRootBranches = result.rootBranchAnalysis.filter((branch) => branch.solvable).length;
  const rootSolvableRatio = rootBranchCount > 0 ? solvableRootBranches / rootBranchCount : 0;
  const deadStateRatio = result.totalStates > 0 ? result.deadStateCount / result.totalStates : 0;

  return {
    minMoves: result.minMoves ?? result.minimalMoves ?? null,
    solutionCount: result.solutionCount,
    rootBranchCount,
    solvableRootBranches,
    rootSolvableRatio: Number(rootSolvableRatio.toFixed(4)),
    deadStateRatio: Number(deadStateRatio.toFixed(4))
  };
}

export function detectDegeneracy(result, options) {
  const opts = withDefaults(options);
  const metrics = summarizeDegeneracyMetrics(result);
  const reasons = [];

  if (!result.solvable) {
    reasons.push('unsolved_candidate');
  }

  if (Number.isFinite(metrics.minMoves) && metrics.minMoves < opts.minMovesFloor) {
    reasons.push('min_moves_below_floor');
  }

  if (metrics.solutionCount > opts.maxSolutionCount) {
    reasons.push('solution_count_extremely_high');
  }

  if (
    metrics.rootBranchCount > 0 &&
    metrics.rootSolvableRatio >= opts.randomClickRootSolvableRatio &&
    metrics.solutionCount >= opts.randomClickSolutionFloor &&
    metrics.deadStateRatio <= opts.randomClickDeadStateRatio
  ) {
    reasons.push('random_click_solve_risk');
  }

  return {
    rejected: reasons.length > 0,
    reasons,
    metrics
  };
}

function countDifficultyBuckets(entries) {
  const counts = {
    easy: 0,
    medium: 0,
    hard: 0,
    extreme: 0
  };

  for (let index = 0; index < entries.length; index += 1) {
    const bucket = entries[index].predictedActualDifficultyClass;
    if (Object.prototype.hasOwnProperty.call(counts, bucket)) {
      counts[bucket] += 1;
    }
  }

  return counts;
}

function countSlotRoles(entries) {
  const counts = {};
  for (let index = 0; index < entries.length; index += 1) {
    const role = entries[index].slotRole || 'unassigned';
    counts[role] = (counts[role] || 0) + 1;
  }

  return counts;
}

function getPredictedActualDifficulty(result, options) {
  return predictActualDifficulty(result, options?.difficultyCalibration || null);
}

function buildCandidateTraits(level, result, degeneracy, predictedDifficulty, options) {
  const nodeCount = Array.isArray(level?.nodes) ? level.nodes.length : 0;
  const edgeCount = Array.isArray(level?.edges) ? level.edges.length : 0;
  const minMoves = result.minMoves ?? result.minimalMoves ?? 0;
  const branching = Number(result.averageBranchingFactor || 0);
  const authoredTag = normalizeDifficultyTag(level?.difficultyTag || level?.difficulty, predictedDifficulty.bucket);
  const topologyScale = roundNumber(nodeCount + edgeCount * 0.5, 2);
  const complexityScore = roundNumber(
    minMoves + branching * 2 + nodeCount * 0.6 + edgeCount * 0.35 + (degeneracy.metrics.deadStateRatio * 4),
    2
  );

  return {
    authoredTag,
    nodeCount,
    edgeCount,
    topologyScale,
    complexityScore,
    lowBranching: branching <= 1.6,
    largeTopology: nodeCount >= 6 || edgeCount >= 7,
    bossEligible: nodeCount >= 6 && edgeCount >= 7 && branching >= 2.2 && minMoves >= 6,
    challengeEligible: branching >= 2 || minMoves >= 5,
    minMoves,
    branching
  };
}

function buildCandidateEntry(level, index, options) {
  const opts = withDefaults(options);
  const result = solveLevel(level, index, 1, opts.solverOptions);
  const degeneracy = detectDegeneracy(result, opts);
  const topologyFingerprint = computeTopologyFingerprint(level);
  const predictedDifficulty = getPredictedActualDifficulty(result, opts);
  const traits = buildCandidateTraits(level, result, degeneracy, predictedDifficulty, opts);

  return {
    level,
    index,
    levelId: level.id || `candidate_${index + 1}`,
    levelName: level.name || `Candidate ${index + 1}`,
    topologyFingerprint,
    rejectionReasons: [],
    degeneracy,
    solverProof: result.solverProof,
    minMoves: result.minMoves,
    solutionCount: result.solutionCount,
    averageBranchingFactor: result.averageBranchingFactor,
    difficultyEstimate: result.difficultyEstimate,
    predictedActualDifficultyScore: predictedDifficulty.score,
    predictedActualDifficultyClass: predictedDifficulty.bucket,
    authoredDifficultyTag: traits.authoredTag,
    topologyScale: traits.topologyScale,
    complexityScore: traits.complexityScore,
    nodeCount: traits.nodeCount,
    edgeCount: traits.edgeCount,
    candidateTraits: traits,
    accepted: result.solvable && !degeneracy.rejected
  };
}

function candidateHardConstraintsPass(entry, slot) {
  const traits = entry.candidateTraits;

  if (slot.role === 'warmup' && !traits.lowBranching) {
    return false;
  }

  if (Number.isFinite(slot.maxBranching) && traits.branching > slot.maxBranching) {
    return false;
  }

  if (Number.isFinite(slot.minBranching) && traits.branching < slot.minBranching) {
    return false;
  }

  if (Number.isFinite(slot.maxNodeCount) && traits.nodeCount > slot.maxNodeCount) {
    return false;
  }

  if (Number.isFinite(slot.minNodeCount) && traits.nodeCount < slot.minNodeCount) {
    return false;
  }

  if (Number.isFinite(slot.maxEdgeCount) && traits.edgeCount > slot.maxEdgeCount) {
    return false;
  }

  if (Number.isFinite(slot.minEdgeCount) && traits.edgeCount < slot.minEdgeCount) {
    return false;
  }

  if (Number.isFinite(slot.maxMinMoves) && traits.minMoves > slot.maxMinMoves) {
    return false;
  }

  if (Number.isFinite(slot.minMinMoves) && traits.minMoves < slot.minMinMoves) {
    return false;
  }

  if (slot.role === 'challenge' && !traits.challengeEligible) {
    return false;
  }

  if (slot.role === 'boss' && !traits.bossEligible) {
    return false;
  }

  return true;
}

function scoreCandidateForSlot(entry, slot, strictMode) {
  const traits = entry.candidateTraits;
  const preferredTags = Array.isArray(slot.preferredTags) ? slot.preferredTags : [];
  const fallbackTags = Array.isArray(slot.fallbackTags) ? slot.fallbackTags : [];
  const preferredActual = Array.isArray(slot.preferredActual) ? slot.preferredActual : [];
  const bucketOrder = ACTUAL_BUCKET_ORDER[entry.predictedActualDifficultyClass] || 2;
  const targetOrder = ACTUAL_BUCKET_ORDER[slot.targetBand] || bucketOrder;

  let score = 0;

  if (preferredTags.includes(traits.authoredTag)) {
    score += 60;
  } else if (!strictMode && fallbackTags.includes(traits.authoredTag)) {
    score += 28;
  } else if (strictMode) {
    return Number.NEGATIVE_INFINITY;
  } else {
    score += 10;
  }

  if (preferredActual.includes(entry.predictedActualDifficultyClass)) {
    score += 20;
  } else {
    score += Math.max(0, 14 - Math.abs(bucketOrder - targetOrder) * 7);
  }

  if (slot.role === 'warmup') {
    score += Math.max(0, 20 - traits.branching * 8);
    score += Math.max(0, 12 - traits.topologyScale * 2);
    score += Math.max(0, 12 - traits.complexityScore);
  }

  if (slot.role === 'easy') {
    score += Math.max(0, 14 - Math.abs(traits.complexityScore - 7));
    score += Math.max(0, 10 - Math.abs(traits.branching - 1.5) * 6);
  }

  if (slot.role === 'medium') {
    score += Math.max(0, 16 - Math.abs(traits.complexityScore - 10));
    score += Math.max(0, 10 - Math.abs(traits.branching - 2.1) * 5);
  }

  if (slot.role === 'hard') {
    score += Math.max(0, 18 - Math.abs(traits.complexityScore - 13));
    score += Math.max(0, 10 - Math.abs(traits.branching - 2.5) * 5);
  }

  if (slot.role === 'challenge') {
    score += traits.complexityScore * 2.4;
    score += traits.branching * 8;
    score += traits.minMoves * 3;
  }

  if (slot.role === 'boss') {
    score += traits.complexityScore * 3;
    score += traits.topologyScale * 5;
    score += traits.nodeCount * 4;
    score += traits.edgeCount * 2;
  }

  score += Math.max(0, 8 - indexPenalty(entry.index));

  return roundNumber(score, 2);
}

function indexPenalty(index) {
  return Math.min(8, Math.max(0, Number(index || 0) * 0.15));
}

function createStructuredPack(entries, options) {
  const opts = withDefaults(options);
  const slots = opts.slotTemplate;
  const selectedEntries = [];
  const selectedLevels = [];
  const deferredEntries = [];
  const rejectedEntries = [];
  const usedFingerprints = new Set();
  const usedLevelIds = new Set();
  const unfilledSlots = [];
  const slotFillOrder = ['boss', 'warmup', 'challenge', 'hard', 'hard', 'medium', 'medium', 'medium', 'easy', 'easy'];

  const preRejected = [];
  const pool = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry.accepted) {
      entry.rejectionReasons = Array.from(new Set([
        ...(entry.rejectionReasons || []),
        ...entry.degeneracy.reasons
      ]));
      preRejected.push(entry);
      continue;
    }

    pool.push(entry);
  }

  for (let orderIndex = 0; orderIndex < slotFillOrder.length; orderIndex += 1) {
    const targetRole = slotFillOrder[orderIndex];
    const slotIndex = slots.findIndex((slot, index) => slot.role === targetRole && selectedEntries.every((entry) => entry.slotIndex !== index + 1));
    if (slotIndex < 0) {
      continue;
    }

    const slot = slots[slotIndex];
    let bestEntry = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let strictPass = 0; strictPass < 2; strictPass += 1) {
      const strictMode = strictPass === 0;
      for (let poolIndex = 0; poolIndex < pool.length; poolIndex += 1) {
        const entry = pool[poolIndex];
        if (usedLevelIds.has(entry.levelId) || usedFingerprints.has(entry.topologyFingerprint)) {
          continue;
        }

        if (!candidateHardConstraintsPass(entry, slot)) {
          continue;
        }

        const score = scoreCandidateForSlot(entry, slot, strictMode);
        if (!Number.isFinite(score)) {
          continue;
        }

        if (score > bestScore) {
          bestScore = score;
          bestEntry = entry;
        }
      }

      if (bestEntry) {
        break;
      }
    }

    if (!bestEntry) {
      unfilledSlots.push({
        slotId: slot.id,
        slotIndex: slotIndex + 1,
        role: slot.role,
        label: slot.label,
        reason: 'no_matching_candidate'
      });
      continue;
    }

    usedLevelIds.add(bestEntry.levelId);
    usedFingerprints.add(bestEntry.topologyFingerprint);

    const slottedEntry = {
      ...bestEntry,
      slotId: slot.id,
      slotRole: slot.role,
      slotLabel: slot.label,
      slotIndex: slotIndex + 1,
      slotScore: bestScore
    };

    selectedEntries.push(slottedEntry);
    selectedLevels.push(bestEntry.level);
  }

  for (let index = 0; index < pool.length; index += 1) {
    const entry = pool[index];
    if (usedLevelIds.has(entry.levelId)) {
      continue;
    }

    deferredEntries.push({
      ...entry,
      rejectionReasons: ['not_selected_for_slot_template']
    });
  }

  for (let index = 0; index < preRejected.length; index += 1) {
    rejectedEntries.push(preRejected[index]);
  }

  return {
    selectedLevels,
    selectedEntries,
    deferredEntries,
    rejectedEntries,
    usedFingerprints,
    unfilledSlots,
    slotTemplate: slots.map((slot, index) => ({ ...slot, slotIndex: index + 1 }))
  };
}

export function analyzeCandidateLevel(level, options) {
  return buildCandidateEntry(level, 0, options);
}

export function buildValidatedPack(candidateLevels, options) {
  const candidates = Array.isArray(candidateLevels) ? candidateLevels : [];
  const analyzedEntries = candidates.map((level, index) => buildCandidateEntry(level, index, options));
  const structuredPack = createStructuredPack(analyzedEntries, options);

  return {
    acceptedLevels: structuredPack.selectedLevels,
    acceptedEntries: structuredPack.selectedEntries,
    deferredEntries: structuredPack.deferredEntries,
    rejectedEntries: structuredPack.rejectedEntries,
    topologyFingerprints: Array.from(structuredPack.usedFingerprints),
    acceptedDifficultyCounts: countDifficultyBuckets(structuredPack.selectedEntries),
    acceptedSlotCounts: countSlotRoles(structuredPack.selectedEntries),
    packStructure: structuredPack.slotTemplate,
    unfilledSlots: structuredPack.unfilledSlots
  };
}

export function buildValidatedPackFromAuthoredLevels(options) {
  return buildValidatedPack(loadLevels(), options);
}
