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

function normalizeLifecycleVersion(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.floor(parsed));
}

function normalizeTelemetryEpoch(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  let duplicateRunEndEvents = 0;

  for (let index = 0; index < records.length; index += 1) {
    const entry = records[index];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const runId = String(entry.runId || `unknown_${index}`);
    const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
    const entryLifecycleVersion = normalizeLifecycleVersion(
      entry.lifecycleVersion ?? payload.lifecycleVersion
    );
    const entryTelemetryEpoch = normalizeTelemetryEpoch(
      entry.telemetryEpoch ?? payload.telemetryEpoch
    );

    if (!runs.has(runId)) {
      runs.set(runId, {
        runId,
        levelId: payload.levelId || null,
        startAt: null,
        endAt: null,
        hasStart: false,
        hasEnd: false,
        result: null,
        reason: null,
        movesUsed: null,
        retryCount: 0,
        lifecycleVersion: entryLifecycleVersion,
        telemetryEpoch: entryTelemetryEpoch,
        duplicateRunEndCount: 0,
        events: []
      });
    }

    const run = runs.get(runId);
    run.events.push(entry);

    if (payload.levelId) {
      run.levelId = payload.levelId;
    }

    if (entryLifecycleVersion !== null) {
      run.lifecycleVersion = run.lifecycleVersion === null
        ? entryLifecycleVersion
        : Math.max(run.lifecycleVersion, entryLifecycleVersion);
    }

    if (entryTelemetryEpoch) {
      run.telemetryEpoch = entryTelemetryEpoch;
    }

    if (entry.eventType === 'run_start') {
      run.hasStart = true;
      if (Number.isFinite(Number(entry.timestamp))) {
        run.startAt = Number(entry.timestamp);
      }
    }

    if (entry.eventType === 'run_end') {
      if (run.hasEnd) {
        run.duplicateRunEndCount += 1;
        duplicateRunEndEvents += 1;
        continue;
      }

      run.hasEnd = true;
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

  return {
    runs,
    duplicateRunEndEvents
  };
}

function createEmptyLevelStats(level, solverResult) {
  const optimalMoves = solverResult?.solverProof?.minMoves ?? solverResult?.minMoves ?? null;
  return {
    levelId: level.id,
    levelName: level.name,
    solverDifficulty: solverResult?.difficultyEstimate || 'unknown',
    optimalMoves,
    startedRuns: 0,
    attempts: 0,
    closedRuns: 0,
    openRuns: 0,
    wins: 0,
    fails: 0,
    abandons: 0,
    retries: 0,
    totalSolveTime: 0,
    solvedRuns: 0,
    totalMovesOverOptimal: 0,
    moveSamples: 0,
    avgSolveTime: null,
    retryRate: 0,
    failRate: 0,
    abandonRate: 0,
    avgMovesOverOptimal: null,
    actualDifficultyScore: null,
    actualDifficultyClass: 'unknown'
  };
}

function getEpochKey(run) {
  if (run.telemetryEpoch) {
    return run.telemetryEpoch;
  }

  if (Number.isFinite(run.lifecycleVersion)) {
    return `lifecycle_v${run.lifecycleVersion}`;
  }

  return 'legacy_unversioned';
}

function computeEpochReport(epochKey, runsInEpoch, levels, solverById, options) {
  const levelStats = new Map();
  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    levelStats.set(level.id, createEmptyLevelStats(level, solverById.get(level.id)));
  }

  let totalRetries = 0;
  let totalStartedRuns = 0;
  let totalClosedRuns = 0;
  let totalOpenRuns = 0;
  let totalAbandons = 0;
  let duplicateRunEndEvents = 0;
  let maxLifecycleVersion = null;

  for (let index = 0; index < runsInEpoch.length; index += 1) {
    const run = runsInEpoch[index];
    duplicateRunEndEvents += run.duplicateRunEndCount || 0;

    if (Number.isFinite(run.lifecycleVersion)) {
      maxLifecycleVersion = maxLifecycleVersion === null
        ? run.lifecycleVersion
        : Math.max(maxLifecycleVersion, run.lifecycleVersion);
    }

    const levelId = run.levelId;
    if (!levelId || !levelStats.has(levelId)) {
      continue;
    }

    const stats = levelStats.get(levelId);

    if (run.hasStart) {
      stats.startedRuns += 1;
      totalStartedRuns += 1;
    }

    if (!run.hasEnd) {
      stats.openRuns += 1;
      totalOpenRuns += 1;
      continue;
    }

    stats.attempts += 1;
    stats.closedRuns += 1;
    totalClosedRuns += 1;

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
    } else if (run.result === 'abandoned') {
      stats.abandons += 1;
      totalAbandons += 1;
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
    stats.abandonRate = stats.attempts > 0 ? roundNumber(stats.abandons / stats.attempts, 4) : 0;
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
  const averageAbandonRate = observedAttempts > 0
    ? roundNumber(perLevel.reduce((sum, entry) => sum + entry.abandons, 0) / observedAttempts, 4)
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
    epochKey,
    maxLifecycleVersion,
    levelsObserved: levels.length,
    startedRunsObserved: totalStartedRuns,
    closedRunsObserved: totalClosedRuns,
    openRunsObserved: totalOpenRuns,
    attemptsObserved: observedAttempts,
    retriesObserved: totalRetries,
    abandonsObserved: totalAbandons,
    duplicateRunEndEvents,
    closedRunRate: totalStartedRuns > 0 ? roundNumber(totalClosedRuns / totalStartedRuns, 4) : 0,
    avgRetryRate: averageRetryRate,
    avgAbandonRate: averageAbandonRate,
    actualDifficultyDistribution: difficultyDistribution,
    normalizedActualDifficultyDistribution
  };

  return {
    epochKey,
    summary,
    solverBucketCalibration,
    perLevel
  };
}

function pickEpochForCalibration(epochReports) {
  if (!Array.isArray(epochReports) || epochReports.length === 0) {
    return null;
  }

  const withClosedRuns = epochReports.filter((report) => report.summary.closedRunsObserved > 0);
  if (withClosedRuns.length === 0) {
    return epochReports[0];
  }

  const nonLegacy = withClosedRuns.filter((report) => report.epochKey !== 'legacy_unversioned');
  const source = nonLegacy.length > 0 ? nonLegacy : withClosedRuns;

  source.sort((left, right) => {
    const lvLeft = Number.isFinite(left.summary.maxLifecycleVersion) ? left.summary.maxLifecycleVersion : -1;
    const lvRight = Number.isFinite(right.summary.maxLifecycleVersion) ? right.summary.maxLifecycleVersion : -1;
    if (lvRight !== lvLeft) {
      return lvRight - lvLeft;
    }

    if (right.summary.closedRunsObserved !== left.summary.closedRunsObserved) {
      return right.summary.closedRunsObserved - left.summary.closedRunsObserved;
    }

    return left.epochKey.localeCompare(right.epochKey);
  });

  return source[0];
}

export function buildTelemetryDifficultyReport(records, options) {
  const levels = options?.levels || loadLevelsWithSolverProof(options?.solverOptions);
  const solverResults = options?.solverResults || validateLevels(options?.solverOptions);
  const solverById = new Map();

  for (let index = 0; index < solverResults.length; index += 1) {
    solverById.set(solverResults[index].levelId, solverResults[index]);
  }

  const runMap = buildRunMap(records);
  const runs = Array.from(runMap.runs.values());
  const runsByEpoch = new Map();

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    const epochKey = getEpochKey(run);
    if (!runsByEpoch.has(epochKey)) {
      runsByEpoch.set(epochKey, []);
    }

    runsByEpoch.get(epochKey).push(run);
  }

  if (runsByEpoch.size === 0) {
    runsByEpoch.set('legacy_unversioned', []);
  }

  const epochReports = [];
  for (const [epochKey, epochRuns] of runsByEpoch.entries()) {
    epochReports.push(computeEpochReport(epochKey, epochRuns, levels, solverById, options));
  }

  epochReports.sort((left, right) => left.epochKey.localeCompare(right.epochKey));
  const selectedEpochReport = pickEpochForCalibration(epochReports) || epochReports[0];

  return {
    generatedAt: new Date().toISOString(),
    selectedEpochKey: selectedEpochReport.epochKey,
    summary: selectedEpochReport.summary,
    solverBucketCalibration: selectedEpochReport.solverBucketCalibration,
    perLevel: selectedEpochReport.perLevel,
    epochs: epochReports.map((report) => ({
      epochKey: report.epochKey,
      summary: report.summary,
      solverBucketCalibration: report.solverBucketCalibration
    }))
  };
}

export function buildTelemetryDifficultyReportFromRaw(raw, options) {
  const records = parseTelemetryRecords(raw);
  return buildTelemetryDifficultyReport(records, options);
}