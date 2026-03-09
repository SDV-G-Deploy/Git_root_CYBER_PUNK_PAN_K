import { loadLevelsWithSolverProof, validateLevels } from './solver.mjs';
import {
  ACTUAL_DIFFICULTY_BUCKETS,
  classifyActualDifficultyScore,
  computeActualDifficultyScore,
  normalizeDifficultyDistribution
} from './difficulty-model.mjs';

function roundNumber(value, digits = 2) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

export function parseTelemetryRecords(raw) {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => entry && typeof entry === 'object');
    }

    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
  } catch (error) {
    // fall through to JSONL parsing
  }

  const lines = trimmed.split(/\r?\n/);
  const records = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        records.push(parsed);
      }
    } catch (error) {
      // ignore malformed JSONL line
    }
  }

  return records;
}

function buildRunMap(records) {
  const runs = new Map();

  for (let index = 0; index < records.length; index += 1) {
    const entry = records[index];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const runId = String(entry.runId || `unknown_${index}`);
    const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};

    if (!runs.has(runId)) {
      runs.set(runId, {
        runId,
        levelId: payload.levelId || null,
        startAt: null,
        endAt: null,
        result: null,
        reason: null,
        movesUsed: null,
        retryCount: 0,
        events: []
      });
    }

    const run = runs.get(runId);
    run.events.push(entry);

    if (payload.levelId) {
      run.levelId = payload.levelId;
    }

    if (entry.eventType === 'run_start') {
      if (Number.isFinite(Number(entry.timestamp))) {
        run.startAt = Number(entry.timestamp);
      }
    }

    if (entry.eventType === 'run_end') {
      if (Number.isFinite(Number(entry.timestamp))) {
        run.endAt = Number(entry.timestamp);
      }
      run.result = payload.result || run.result;
      run.reason = payload.reason || run.reason;
      if (Number.isFinite(Number(payload.movesUsed))) {
        run.movesUsed = Number(payload.movesUsed);
      }
    }

    if (entry.eventType === 'retry') {
      run.retryCount += 1;
    }
  }

  return runs;
}

function createEmptyLevelStats(level, solverResult) {
  const optimalMoves = solverResult?.solverProof?.minMoves ?? solverResult?.minMoves ?? null;
  return {
    levelId: level.id,
    levelName: level.name,
    solverDifficulty: solverResult?.difficultyEstimate || 'unknown',
    optimalMoves,
    attempts: 0,
    wins: 0,
    fails: 0,
    retries: 0,
    totalSolveTime: 0,
    solvedRuns: 0,
    totalMovesOverOptimal: 0,
    moveSamples: 0,
    avgSolveTime: null,
    retryRate: 0,
    failRate: 0,
    avgMovesOverOptimal: null,
    actualDifficultyScore: null,
    actualDifficultyClass: 'unknown'
  };
}

export function buildTelemetryDifficultyReport(records, options) {
  const levels = options?.levels || loadLevelsWithSolverProof(options?.solverOptions);
  const solverResults = options?.solverResults || validateLevels(options?.solverOptions);
  const levelById = new Map();
  const levelStats = new Map();
  const solverById = new Map();

  for (let index = 0; index < solverResults.length; index += 1) {
    solverById.set(solverResults[index].levelId, solverResults[index]);
  }

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    levelById.set(level.id, level);
    levelStats.set(level.id, createEmptyLevelStats(level, solverById.get(level.id)));
  }

  const runs = buildRunMap(records);
  let totalRetries = 0;

  for (const run of runs.values()) {
    const levelId = run.levelId;
    if (!levelId || !levelStats.has(levelId)) {
      continue;
    }

    const stats = levelStats.get(levelId);
    stats.attempts += 1;
    stats.retries += run.retryCount;
    totalRetries += run.retryCount;

    if (run.result === 'win') {
      stats.wins += 1;
      if (Number.isFinite(run.startAt) && Number.isFinite(run.endAt)) {
        stats.totalSolveTime += Math.max(0, (run.endAt - run.startAt) / 1000);
        stats.solvedRuns += 1;
      }
    } else if (run.result === 'lose') {
      stats.fails += 1;
    }

    if (Number.isFinite(run.movesUsed) && Number.isFinite(stats.optimalMoves)) {
      stats.totalMovesOverOptimal += Math.max(0, run.movesUsed - stats.optimalMoves);
      stats.moveSamples += 1;
    }
  }

  const perLevel = [];
  const difficultyDistribution = {
    easy: 0,
    medium: 0,
    hard: 0,
    extreme: 0,
    unknown: 0
  };

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    const stats = levelStats.get(level.id);
    stats.avgSolveTime = stats.solvedRuns > 0 ? roundNumber(stats.totalSolveTime / stats.solvedRuns, 2) : null;
    stats.retryRate = stats.attempts > 0 ? roundNumber(stats.retries / stats.attempts, 4) : 0;
    stats.failRate = stats.attempts > 0 ? roundNumber(stats.fails / stats.attempts, 4) : 0;
    stats.avgMovesOverOptimal = stats.moveSamples > 0 ? roundNumber(stats.totalMovesOverOptimal / stats.moveSamples, 2) : null;
    stats.actualDifficultyScore = computeActualDifficultyScore(stats, options?.scoreModel);
    stats.actualDifficultyClass = classifyActualDifficultyScore(stats.actualDifficultyScore);

    if (!ACTUAL_DIFFICULTY_BUCKETS.includes(stats.actualDifficultyClass)) {
      difficultyDistribution.unknown += 1;
    } else {
      difficultyDistribution[stats.actualDifficultyClass] += 1;
    }

    perLevel.push({ ...stats });
  }

  const solverBucketCalibration = {};
  const solverBuckets = ['Easy', 'Medium', 'Hard', 'Unsolvable'];
  for (let index = 0; index < solverBuckets.length; index += 1) {
    const bucket = solverBuckets[index];
    const rows = perLevel.filter((entry) => entry.solverDifficulty === bucket && Number.isFinite(entry.actualDifficultyScore));
    if (rows.length === 0) {
      continue;
    }

    const averageScore = roundNumber(rows.reduce((sum, entry) => sum + entry.actualDifficultyScore, 0) / rows.length, 2);
    solverBucketCalibration[bucket] = {
      observedLevels: rows.length,
      avgActualDifficultyScore: averageScore,
      actualDifficultyClass: classifyActualDifficultyScore(averageScore)
    };
  }

  const observedAttempts = perLevel.reduce((sum, entry) => sum + entry.attempts, 0);
  const averageRetryRate = observedAttempts > 0
    ? roundNumber(perLevel.reduce((sum, entry) => sum + entry.retries, 0) / observedAttempts, 4)
    : 0;

  const classifiedTotal = ACTUAL_DIFFICULTY_BUCKETS.reduce((sum, bucket) => sum + (difficultyDistribution[bucket] || 0), 0);
  const normalizedActualDifficultyDistribution = classifiedTotal > 0
    ? normalizeDifficultyDistribution(
      ACTUAL_DIFFICULTY_BUCKETS.reduce((acc, bucket) => {
        acc[bucket] = difficultyDistribution[bucket];
        return acc;
      }, {})
    )
    : {
      easy: 0,
      medium: 0,
      hard: 0,
      extreme: 0
    };

  const summary = {
    levelsObserved: levels.length,
    attemptsObserved: observedAttempts,
    retriesObserved: totalRetries,
    avgRetryRate: averageRetryRate,
    actualDifficultyDistribution: difficultyDistribution,
    normalizedActualDifficultyDistribution
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    solverBucketCalibration,
    perLevel
  };
}

export function buildTelemetryDifficultyReportFromRaw(raw, options) {
  const records = parseTelemetryRecords(raw);
  return buildTelemetryDifficultyReport(records, options);
}
