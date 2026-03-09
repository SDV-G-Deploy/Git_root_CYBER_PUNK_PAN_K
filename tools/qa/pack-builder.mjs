import { loadLevels } from '../../src/levels.js';
import { solveLevel } from './solver.mjs';
import { computeTopologyFingerprint } from './topology-fingerprint.mjs';

export const PACK_BUILDER_DEFAULTS = Object.freeze({
  minMovesFloor: 3,
  maxSolutionCount: 4096,
  randomClickRootSolvableRatio: 0.75,
  randomClickSolutionFloor: 128,
  randomClickDeadStateRatio: 0.12,
  solverOptions: undefined
});

function withDefaults(options) {
  const merged = {
    ...PACK_BUILDER_DEFAULTS,
    ...(options || {})
  };

  merged.solverOptions = options?.solverOptions || PACK_BUILDER_DEFAULTS.solverOptions;
  return merged;
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

export function analyzeCandidateLevel(level, options) {
  const opts = withDefaults(options);
  const result = solveLevel(level, 0, 1, opts.solverOptions);
  const degeneracy = detectDegeneracy(result, opts);
  const topologyFingerprint = computeTopologyFingerprint(level);

  return {
    levelId: level.id || 'candidate',
    levelName: level.name || 'Candidate Puzzle',
    topologyFingerprint,
    result,
    degeneracy,
    accepted: result.solvable && !degeneracy.rejected
  };
}

export function buildValidatedPack(candidateLevels, options) {
  const opts = withDefaults(options);
  const candidates = Array.isArray(candidateLevels) ? candidateLevels : [];
  const acceptedLevels = [];
  const acceptedEntries = [];
  const rejectedEntries = [];
  const topologyFingerprints = new Set();

  for (let index = 0; index < candidates.length; index += 1) {
    const level = candidates[index];
    const result = solveLevel(level, acceptedLevels.length, candidates.length, opts.solverOptions);
    const degeneracy = detectDegeneracy(result, opts);
    const topologyFingerprint = computeTopologyFingerprint(level);
    const rejectionReasons = [];

    if (!result.solvable) {
      rejectionReasons.push('unsolved_candidate');
    }

    for (let reasonIndex = 0; reasonIndex < degeneracy.reasons.length; reasonIndex += 1) {
      const reason = degeneracy.reasons[reasonIndex];
      if (!rejectionReasons.includes(reason)) {
        rejectionReasons.push(reason);
      }
    }

    if (topologyFingerprints.has(topologyFingerprint)) {
      rejectionReasons.push('duplicate_topology');
    }

    const entry = {
      levelId: level.id || `candidate_${index + 1}`,
      levelName: level.name || `Candidate ${index + 1}`,
      topologyFingerprint,
      rejectionReasons,
      degeneracy,
      solverProof: result.solverProof,
      minMoves: result.minMoves,
      solutionCount: result.solutionCount,
      averageBranchingFactor: result.averageBranchingFactor,
      difficultyEstimate: result.difficultyEstimate
    };

    if (rejectionReasons.length === 0) {
      topologyFingerprints.add(topologyFingerprint);
      acceptedLevels.push(level);
      acceptedEntries.push(entry);
    } else {
      rejectedEntries.push(entry);
    }
  }

  return {
    acceptedLevels,
    acceptedEntries,
    rejectedEntries,
    topologyFingerprints: Array.from(topologyFingerprints)
  };
}

export function buildValidatedPackFromAuthoredLevels(options) {
  return buildValidatedPack(loadLevels(), options);
}
