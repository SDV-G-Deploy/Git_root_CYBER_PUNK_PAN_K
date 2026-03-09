import { CONFIG, PLAYTEST_MODE_KEY, TUTORIAL_SEEN_KEY } from './config.js';

const RANK_ORDER = {
  failed: 0,
  clear: 1,
  strong: 2,
  perfect: 3
};

function createDefaultProgress() {
  return {
    highestUnlockedLevelIndex: 0,
    completedLevelIds: [],
    perfectLevelIds: []
  };
}

function createDefaultBestResults() {
  return {};
}

export function createDefaultSaveData() {
  return {
    version: CONFIG.SAVE.VERSION,
    tutorialSeen: false,
    playtestMode: false,
    progress: createDefaultProgress(),
    bestResultsByLevel: createDefaultBestResults()
  };
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();
  for (let i = 0; i < value.length; i += 1) {
    if (typeof value[i] === 'string' && value[i].length > 0) {
      unique.add(value[i]);
    }
  }

  return Array.from(unique);
}

function sanitizeBestResult(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const bestScore = Number.isFinite(entry.bestScore) ? Math.max(0, Math.floor(entry.bestScore)) : 0;
  const bestMovesUsed = Number.isFinite(entry.bestMovesUsed) ? Math.max(0, Math.floor(entry.bestMovesUsed)) : null;
  const lowestOverload = Number.isFinite(entry.lowestOverload) ? Math.max(0, Math.floor(entry.lowestOverload)) : null;
  const lastCompletedAt = Number.isFinite(entry.lastCompletedAt) ? Math.floor(entry.lastCompletedAt) : null;
  const bestRank = typeof entry.bestRank === 'string' ? entry.bestRank : 'failed';

  return {
    bestScore,
    bestRank,
    bestMovesUsed,
    lowestOverload,
    lastCompletedAt
  };
}

function sanitizeBestResultsByLevel(value) {
  if (!value || typeof value !== 'object') {
    return createDefaultBestResults();
  }

  const result = {};
  const entries = Object.entries(value);
  for (let i = 0; i < entries.length; i += 1) {
    const [levelId, entry] = entries[i];
    if (typeof levelId !== 'string' || levelId.length === 0) {
      continue;
    }

    const sanitized = sanitizeBestResult(entry);
    if (sanitized) {
      result[levelId] = sanitized;
    }
  }

  return result;
}

function sanitizeProgress(progress) {
  const source = progress && typeof progress === 'object' ? progress : {};
  return {
    highestUnlockedLevelIndex: Number.isFinite(source.highestUnlockedLevelIndex)
      ? Math.max(0, Math.floor(source.highestUnlockedLevelIndex))
      : 0,
    completedLevelIds: sanitizeStringArray(source.completedLevelIds),
    perfectLevelIds: sanitizeStringArray(source.perfectLevelIds)
  };
}

function sanitizeSaveData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    version: CONFIG.SAVE.VERSION,
    tutorialSeen: source.tutorialSeen === true,
    playtestMode: source.playtestMode === true,
    progress: sanitizeProgress(source.progress),
    bestResultsByLevel: sanitizeBestResultsByLevel(source.bestResultsByLevel)
  };
}

function migrateLegacyFlags(saveData) {
  const next = sanitizeSaveData(saveData);

  try {
    if (!next.tutorialSeen && localStorage.getItem(TUTORIAL_SEEN_KEY) === '1') {
      next.tutorialSeen = true;
    }
  } catch (error) {
    // ignore legacy tutorial storage failures
  }

  try {
    if (!next.playtestMode && localStorage.getItem(PLAYTEST_MODE_KEY) === '1') {
      next.playtestMode = true;
    }
  } catch (error) {
    // ignore legacy playtest storage failures
  }

  return next;
}

export function loadSaveData() {
  let parsed = null;
  let needsSave = false;

  try {
    const raw = localStorage.getItem(CONFIG.SAVE.KEY);
    if (raw) {
      parsed = JSON.parse(raw);
    }
  } catch (error) {
    parsed = null;
  }

  let saveData = parsed ? sanitizeSaveData(parsed) : createDefaultSaveData();
  const migrated = migrateLegacyFlags(saveData);

  if (
    migrated.tutorialSeen !== saveData.tutorialSeen ||
    migrated.playtestMode !== saveData.playtestMode ||
    !parsed
  ) {
    needsSave = true;
  }

  saveData = migrated;

  return {
    data: saveData,
    needsSave
  };
}

export function saveSaveData(saveData) {
  try {
    localStorage.setItem(CONFIG.SAVE.KEY, JSON.stringify(sanitizeSaveData(saveData)));
    return true;
  } catch (error) {
    return false;
  }
}

export function setTutorialSeen(saveData, tutorialSeen) {
  return {
    ...sanitizeSaveData(saveData),
    tutorialSeen: Boolean(tutorialSeen)
  };
}

export function setPlaytestMode(saveData, playtestMode) {
  return {
    ...sanitizeSaveData(saveData),
    playtestMode: Boolean(playtestMode)
  };
}

function getHigherRank(left, right) {
  const leftOrder = RANK_ORDER[left] ?? -1;
  const rightOrder = RANK_ORDER[right] ?? -1;
  return rightOrder > leftOrder ? right : left;
}

function pickBestLowerValue(previousValue, incomingValue) {
  const hasPrevious = Number.isFinite(previousValue);
  const hasIncoming = Number.isFinite(incomingValue);

  if (hasPrevious && hasIncoming) {
    return Math.min(previousValue, incomingValue);
  }

  if (hasPrevious) {
    return previousValue;
  }

  if (hasIncoming) {
    return incomingValue;
  }

  return null;
}

export function applyRunSummaryToSave(saveData, summary, levelCount) {
  const next = sanitizeSaveData(saveData);
  if (!summary || summary.result !== 'win') {
    return next;
  }

  const safeLevelCount = Number.isFinite(levelCount) ? Math.max(1, Math.floor(levelCount)) : 1;
  const completedSet = new Set(next.progress.completedLevelIds);
  const perfectSet = new Set(next.progress.perfectLevelIds);

  completedSet.add(summary.levelId);
  if (summary.rank === 'perfect') {
    perfectSet.add(summary.levelId);
  }

  const unlockIndex = Math.min(safeLevelCount - 1, Math.max(0, summary.levelIndex + 1));
  next.progress = {
    highestUnlockedLevelIndex: Math.max(next.progress.highestUnlockedLevelIndex, unlockIndex),
    completedLevelIds: Array.from(completedSet),
    perfectLevelIds: Array.from(perfectSet)
  };

  const previous = next.bestResultsByLevel[summary.levelId] || null;
  const incomingScore = Number.isFinite(summary.totalScore) ? Math.max(0, Math.floor(summary.totalScore)) : 0;
  const incomingMovesUsed = Number.isFinite(summary.movesUsed) ? Math.max(0, Math.floor(summary.movesUsed)) : null;
  const incomingOverload = Number.isFinite(summary.overload) ? Math.max(0, Math.floor(summary.overload)) : null;

  next.bestResultsByLevel[summary.levelId] = {
    bestScore: previous ? Math.max(previous.bestScore, incomingScore) : incomingScore,
    bestRank: previous ? getHigherRank(previous.bestRank, summary.rank) : summary.rank,
    bestMovesUsed: pickBestLowerValue(previous ? previous.bestMovesUsed : null, incomingMovesUsed),
    lowestOverload: pickBestLowerValue(previous ? previous.lowestOverload : null, incomingOverload),
    lastCompletedAt: Date.now()
  };

  return next;
}
