import {
  META_SAVE_KEY,
  META_SAVE_VERSION,
  PLAYTEST_MODE_KEY,
  TUTORIAL_SEEN_KEY,
  UPGRADE_DEFS
} from './config.js';

function toNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

export function createDefaultMetaState() {
  return {
    version: META_SAVE_VERSION,
    techParts: 0,
    upgrades: {
      score_bonus: false,
      chain_growth: false
    },
    stats: {
      wins: 0,
      runs: 0
    },
    lastStatus: 'Win runs to collect tech parts.'
  };
}

export function normalizeMetaState(raw) {
  const defaults = createDefaultMetaState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const upgradesRaw = raw.upgrades && typeof raw.upgrades === 'object' ? raw.upgrades : {};
  const statsRaw = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};

  return {
    version: META_SAVE_VERSION,
    techParts: toNonNegativeInteger(raw.techParts, defaults.techParts),
    upgrades: {
      score_bonus: Boolean(upgradesRaw.score_bonus),
      chain_growth: Boolean(upgradesRaw.chain_growth)
    },
    stats: {
      wins: toNonNegativeInteger(statsRaw.wins, defaults.stats.wins),
      runs: toNonNegativeInteger(statsRaw.runs, defaults.stats.runs)
    },
    lastStatus:
      typeof raw.lastStatus === 'string' && raw.lastStatus.trim().length > 0
        ? raw.lastStatus
        : defaults.lastStatus
  };
}

export function loadMetaState() {
  try {
    const raw = localStorage.getItem(META_SAVE_KEY);
    if (!raw) {
      return createDefaultMetaState();
    }

    const parsed = JSON.parse(raw);
    return normalizeMetaState(parsed);
  } catch (error) {
    return createDefaultMetaState();
  }
}

export function saveMetaState(metaState) {
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(metaState));
  } catch (error) {
    // Keep running even if persistence is unavailable.
  }
}

export function loadPlaytestMode() {
  try {
    return localStorage.getItem(PLAYTEST_MODE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

export function savePlaytestMode(isEnabled) {
  try {
    localStorage.setItem(PLAYTEST_MODE_KEY, isEnabled ? '1' : '0');
  } catch (error) {
    // Ignore persistence errors.
  }
}

export function loadTutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (error) {
    return false;
  }
}

export function saveTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (error) {
    // Ignore persistence errors.
  }
}

export function buildMetaModifiers(metaState) {
  let scoreBonus = 0;
  let chainGrowthBonus = 0;

  if (metaState.upgrades.score_bonus) {
    scoreBonus += UPGRADE_DEFS.score_bonus.scoreBonus;
  }

  if (metaState.upgrades.chain_growth) {
    chainGrowthBonus += UPGRADE_DEFS.chain_growth.chainGrowthBonus;
  }

  return {
    scoreBonus,
    chainGrowthBonus
  };
}