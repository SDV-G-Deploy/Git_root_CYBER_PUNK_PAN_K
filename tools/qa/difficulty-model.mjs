export const ACTUAL_DIFFICULTY_BUCKETS = Object.freeze(['easy', 'medium', 'hard', 'extreme']);

export const DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION = Object.freeze({
  easy: 0.3,
  medium: 0.4,
  hard: 0.2,
  extreme: 0.1
});

const DEFAULT_SCORE_MODEL = Object.freeze({
  expectedSecondsPerOptimalMove: 8,
  minimumExpectedSolveTime: 15,
  solveTimeWeight: 0.3,
  retryRateWeight: 0.25,
  failRateWeight: 0.3,
  movesOverOptimalWeight: 0.15
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value, digits = 2) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

export function classifyActualDifficultyScore(score) {
  if (!Number.isFinite(score)) {
    return 'unknown';
  }

  if (score < 25) {
    return 'easy';
  }

  if (score < 50) {
    return 'medium';
  }

  if (score < 75) {
    return 'hard';
  }

  return 'extreme';
}

export function normalizeDifficultyDistribution(distribution) {
  const source = distribution && typeof distribution === 'object'
    ? distribution
    : DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION;

  const normalized = {};
  let total = 0;

  for (let index = 0; index < ACTUAL_DIFFICULTY_BUCKETS.length; index += 1) {
    const bucket = ACTUAL_DIFFICULTY_BUCKETS[index];
    const raw = Number(source[bucket]);
    const safe = Number.isFinite(raw) && raw > 0 ? raw : 0;
    normalized[bucket] = safe;
    total += safe;
  }

  if (total <= 0) {
    return { ...DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION };
  }

  for (let index = 0; index < ACTUAL_DIFFICULTY_BUCKETS.length; index += 1) {
    const bucket = ACTUAL_DIFFICULTY_BUCKETS[index];
    normalized[bucket] = roundNumber(normalized[bucket] / total, 4);
  }

  return normalized;
}

export function computeTargetDifficultyCounts(distribution, packSize) {
  const normalized = normalizeDifficultyDistribution(distribution);
  const size = Number.isFinite(packSize) && packSize > 0 ? Math.floor(packSize) : 0;
  const counts = {};
  const remainders = [];
  let assigned = 0;

  for (let index = 0; index < ACTUAL_DIFFICULTY_BUCKETS.length; index += 1) {
    const bucket = ACTUAL_DIFFICULTY_BUCKETS[index];
    const exact = normalized[bucket] * size;
    const base = Math.floor(exact);
    counts[bucket] = base;
    assigned += base;
    remainders.push({ bucket, remainder: exact - base });
  }

  remainders.sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.bucket.localeCompare(right.bucket);
  });

  let remainderIndex = 0;
  while (assigned < size && remainders.length > 0) {
    counts[remainders[remainderIndex].bucket] += 1;
    assigned += 1;
    remainderIndex = (remainderIndex + 1) % remainders.length;
  }

  return counts;
}

export function mapSolverResultToActualDifficulty(result) {
  if (!result || !result.solvable) {
    return {
      score: 100,
      bucket: 'extreme'
    };
  }

  const bucketBase = {
    Easy: 18,
    Medium: 45,
    Hard: 70,
    Unsolvable: 100
  };

  let score = bucketBase[result.difficultyEstimate] || 45;

  if ((result.minMoves ?? result.minimalMoves ?? 0) >= 8) {
    score += 10;
  }

  if (Array.isArray(result.issues) && result.issues.includes('tight_move_budget')) {
    score += 8;
  }

  if (Array.isArray(result.issues) && result.issues.includes('zero_margin_move_budget')) {
    score += 12;
  }

  if (Number(result.solutionCount) >= 1000) {
    score -= 8;
  }

  if (Number(result.solutionCount) <= 1) {
    score += 6;
  }

  score = clamp(roundNumber(score, 2), 0, 100);
  return {
    score,
    bucket: classifyActualDifficultyScore(score)
  };
}

export function predictActualDifficulty(result, calibrationProfile) {
  const fallback = mapSolverResultToActualDifficulty(result);
  const calibration = calibrationProfile?.solverBucketCalibration?.[result?.difficultyEstimate || ''];

  if (!calibration || !Number.isFinite(calibration.avgActualDifficultyScore)) {
    return fallback;
  }

  const bucketBase = {
    Easy: 18,
    Medium: 45,
    Hard: 70,
    Unsolvable: 100
  };

  const fallbackBase = bucketBase[result?.difficultyEstimate] || fallback.score;
  const adjustedScore = clamp(
    roundNumber(calibration.avgActualDifficultyScore + (fallback.score - fallbackBase) * 0.5, 2),
    0,
    100
  );

  return {
    score: adjustedScore,
    bucket: classifyActualDifficultyScore(adjustedScore)
  };
}

export function computeActualDifficultyScore(metrics, options) {
  const model = {
    ...DEFAULT_SCORE_MODEL,
    ...(options || {})
  };

  const attempts = Number(metrics?.attempts || 0);
  if (attempts <= 0) {
    return null;
  }

  const optimalMoves = Math.max(1, Number(metrics?.optimalMoves || 1));
  const expectedSolveTime = Math.max(model.minimumExpectedSolveTime, optimalMoves * model.expectedSecondsPerOptimalMove);
  const failRate = clamp(Number(metrics?.failRate || 0), 0, 1);
  const retryRate = clamp(Number(metrics?.retryRate || 0), 0, 1);
  const avgMovesOverOptimal = Math.max(0, Number(metrics?.avgMovesOverOptimal || 0));

  let avgSolveTime = Number(metrics?.avgSolveTime);
  if (!Number.isFinite(avgSolveTime)) {
    avgSolveTime = expectedSolveTime * (1 + failRate * 1.5);
  }

  const solveTimePressure = clamp((avgSolveTime - expectedSolveTime) / (expectedSolveTime * 1.5), 0, 1);
  const movesPressure = clamp(avgMovesOverOptimal / Math.max(1, optimalMoves * 0.75), 0, 1);

  const score = (
    solveTimePressure * model.solveTimeWeight +
    retryRate * model.retryRateWeight +
    failRate * model.failRateWeight +
    movesPressure * model.movesOverOptimalWeight
  ) * 100;

  return roundNumber(score, 2);
}
