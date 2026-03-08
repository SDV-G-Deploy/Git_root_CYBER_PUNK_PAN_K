'use strict';

const META_SAVE_KEY = 'signal_district_chainlab_meta_v1';
const META_SAVE_VERSION = 1;

const UPGRADE_DEFS = Object.freeze({
  score_bonus: {
    cost: 8,
    label: '+5% score bonus',
    scoreBonus: 0.05,
    chainGrowthBonus: 0
  },
  chain_growth: {
    cost: 10,
    label: '+1% chain growth',
    scoreBonus: 0,
    chainGrowthBonus: 0.01
  }
});

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function createDefaultMetaState() {
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

function toNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function normalizeMetaState(raw) {
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

function loadMetaState() {
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

function saveMetaState(metaState) {
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(metaState));
  } catch (error) {
    // Keep running even if persistence is unavailable.
  }
}

function buildMetaModifiers(metaState) {
  let scoreBonus = 0;
  let chainGrowthBonus = 0;

  if (metaState.upgrades.score_bonus) {
    scoreBonus += UPGRADE_DEFS.score_bonus.scoreBonus;
  }

  if (metaState.upgrades.chain_growth) {
    chainGrowthBonus += UPGRADE_DEFS.chain_growth.chainGrowthBonus;
  }

  return { scoreBonus, chainGrowthBonus };
}

function bootstrap() {
  const canvas = document.getElementById('chainlab-canvas');
  const scoreLabel = document.getElementById('scoreLabel');
  const shotsLabel = document.getElementById('shotsLabel');
  const targetLabel = document.getElementById('targetLabel');
  const levelLabel = document.getElementById('levelLabel');
  const levelSelect = document.getElementById('levelSelect');
  const retryButton = document.getElementById('retryButton');
  const outcomePanel = document.getElementById('outcomePanel');
  const outcomeText = document.getElementById('outcomeText');
  const summaryRetryButton = document.getElementById('summaryRetryButton');
  const nextButton = document.getElementById('nextButton');

  const summaryResult = document.getElementById('summaryResult');
  const summaryScore = document.getElementById('summaryScore');
  const summaryDepth = document.getElementById('summaryDepth');
  const summaryAccuracy = document.getElementById('summaryAccuracy');

  const techPartsLabel = document.getElementById('techPartsLabel');
  const metaStatus = document.getElementById('metaStatus');
  const buyScoreBonusButton = document.getElementById('buyScoreBonusButton');
  const buyChainGrowthButton = document.getElementById('buyChainGrowthButton');

  if (!canvas) {
    throw new Error('Canvas #chainlab-canvas not found.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D context from canvas.');
  }

  let metaState = loadMetaState();

  function setMetaStatus(message) {
    metaState.lastStatus = message;
    saveMetaState(metaState);
  }

  function getSummary() {
    return ChainLabGame.getRunSummary();
  }

  function renderLevelSelect() {
    if (!levelSelect) {
      return;
    }

    const levels = ChainLabGame.getLevelList();
    levelSelect.innerHTML = '';

    levels.forEach((level) => {
      const option = document.createElement('option');
      option.value = String(level.index);
      option.textContent = `${level.id} (${level.difficultyTag})`;
      levelSelect.appendChild(option);
    });

    levelSelect.value = String(ChainLabGame.getCurrentLevelIndex());
  }

  function applyModifiersFromMeta() {
    const modifiers = buildMetaModifiers(metaState);
    if (typeof ChainLabGame.setModifiers === 'function') {
      ChainLabGame.setModifiers(modifiers);
    }
  }

  function syncMetaPanel() {
    if (!techPartsLabel || !metaStatus) {
      return;
    }

    techPartsLabel.textContent = `Tech Parts: ${metaState.techParts}`;
    metaStatus.textContent = metaState.lastStatus;

    if (buyScoreBonusButton) {
      if (metaState.upgrades.score_bonus) {
        buyScoreBonusButton.disabled = true;
        buyScoreBonusButton.textContent = 'Owned';
      } else {
        const canBuy = metaState.techParts >= UPGRADE_DEFS.score_bonus.cost;
        buyScoreBonusButton.disabled = !canBuy;
        buyScoreBonusButton.textContent = canBuy
          ? `Buy (-${UPGRADE_DEFS.score_bonus.cost})`
          : `Need ${UPGRADE_DEFS.score_bonus.cost}`;
      }
    }

    if (buyChainGrowthButton) {
      if (metaState.upgrades.chain_growth) {
        buyChainGrowthButton.disabled = true;
        buyChainGrowthButton.textContent = 'Owned';
      } else {
        const canBuy = metaState.techParts >= UPGRADE_DEFS.chain_growth.cost;
        buyChainGrowthButton.disabled = !canBuy;
        buyChainGrowthButton.textContent = canBuy
          ? `Buy (-${UPGRADE_DEFS.chain_growth.cost})`
          : `Need ${UPGRADE_DEFS.chain_growth.cost}`;
      }
    }
  }

  function syncHud() {
    const snapshot = ChainLabGame.getSnapshot();
    if (!snapshot) {
      return;
    }

    scoreLabel.textContent = `Score: ${snapshot.score}`;
    shotsLabel.textContent = `Shots: ${snapshot.shotsRemaining}`;
    targetLabel.textContent = `Target: ${snapshot.targetScore}`;
    levelLabel.textContent = `Level: ${snapshot.levelId}`;

    if (levelSelect) {
      levelSelect.value = String(snapshot.levelIndex);
    }
  }

  function syncSummary() {
    const summary = getSummary();
    if (!summary) {
      return;
    }

    summaryResult.textContent = `Result: ${summary.result}`;
    summaryScore.textContent = `Final Score: ${summary.score}`;
    summaryDepth.textContent = `Chain Depth: ${summary.chainDepth}`;
    summaryAccuracy.textContent = `Accuracy: ${summary.accuracy}%`;
  }

  function syncOutcomePanel() {
    if (!outcomePanel || !outcomeText || !nextButton) {
      return;
    }

    const summary = getSummary();
    if (!summary || summary.phase !== 'end') {
      outcomePanel.classList.add('hidden');
      outcomePanel.classList.remove('win');
      outcomePanel.classList.remove('lose');
      nextButton.disabled = false;
      return;
    }

    const hasNextLevel = summary.levelIndex < summary.levelCount - 1;
    outcomePanel.classList.remove('hidden');

    if (summary.result === 'win') {
      outcomePanel.classList.add('win');
      outcomePanel.classList.remove('lose');
      outcomeText.textContent = hasNextLevel
        ? 'Victory: target reached. Press Enter or click arena for next level.'
        : 'Victory: campaign complete. Press R to replay level.';
    } else {
      outcomePanel.classList.add('lose');
      outcomePanel.classList.remove('win');
      outcomeText.textContent = 'Defeat: shots exhausted. Press Space or click arena to retry.';
    }

    nextButton.disabled = !hasNextLevel || summary.result !== 'win';
  }

  function hardSync() {
    syncHud();
    syncSummary();
    syncOutcomePanel();
    syncMetaPanel();
  }

  function restartCurrentLevel() {
    ChainLabGame.resetLevel();
    hardSync();
  }

  function tryOutcomeQuickAction() {
    const summary = getSummary();
    if (!summary || summary.phase !== 'end') {
      return false;
    }

    if (summary.result === 'win') {
      const moved = ChainLabGame.nextLevel();
      if (moved) {
        hardSync();
        return true;
      }
      return false;
    }

    restartCurrentLevel();
    return true;
  }

  function tryPurchaseUpgrade(upgradeId) {
    const def = UPGRADE_DEFS[upgradeId];
    if (!def) {
      return;
    }

    if (metaState.upgrades[upgradeId]) {
      setMetaStatus(`${def.label} already unlocked.`);
      hardSync();
      return;
    }

    if (metaState.techParts < def.cost) {
      setMetaStatus(`Not enough tech parts for ${def.label}.`);
      hardSync();
      return;
    }

    metaState.techParts -= def.cost;
    metaState.upgrades[upgradeId] = true;
    setMetaStatus(`Unlocked ${def.label}. Applied on next run.`);
    saveMetaState(metaState);
    applyModifiersFromMeta();
    restartCurrentLevel();
  }

  function handleRunEnd(result, rewardPacket, summary) {
    metaState.stats.runs += 1;

    if (result === 'win') {
      metaState.stats.wins += 1;
      const payloadParts = rewardPacket && Number.isFinite(Number(rewardPacket.tech_parts))
        ? Number(rewardPacket.tech_parts)
        : 0;
      const earnedTechParts = Math.max(1, Math.floor(payloadParts));
      metaState.techParts += earnedTechParts;
      const levelId = summary && summary.levelId ? summary.levelId : 'level';
      setMetaStatus(`+${earnedTechParts} tech parts from ${levelId}.`);
    } else {
      setMetaStatus('Run failed. Retry to earn tech parts.');
    }

    saveMetaState(metaState);
    hardSync();
  }

  ChainLabGame.initGame(canvas, {
    onRunEnd: handleRunEnd,
    modifiers: buildMetaModifiers(metaState)
  });

  renderLevelSelect();
  applyModifiersFromMeta();

  canvas.addEventListener('mousemove', (event) => {
    const point = getCanvasPoint(canvas, event);
    ChainLabGame.setAim(point.x, point.y, true);
  });

  canvas.addEventListener('mouseleave', () => {
    ChainLabGame.setAim(0, 0, false);
  });

  canvas.addEventListener('click', (event) => {
    if (tryOutcomeQuickAction()) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    ChainLabGame.fireShot(point.x, point.y);
    hardSync();
  });

  if (levelSelect) {
    levelSelect.addEventListener('change', (event) => {
      const nextIndex = Number(event.target.value);
      ChainLabGame.setLevel(nextIndex);
      hardSync();
    });
  }

  retryButton.addEventListener('click', () => {
    restartCurrentLevel();
  });

  if (summaryRetryButton) {
    summaryRetryButton.addEventListener('click', () => {
      restartCurrentLevel();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const moved = ChainLabGame.nextLevel();
      if (moved) {
        hardSync();
      }
    });
  }

  if (buyScoreBonusButton) {
    buyScoreBonusButton.addEventListener('click', () => {
      tryPurchaseUpgrade('score_bonus');
    });
  }

  if (buyChainGrowthButton) {
    buyChainGrowthButton.addEventListener('click', () => {
      tryPurchaseUpgrade('chain_growth');
    });
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === 'r') {
      restartCurrentLevel();
      return;
    }

    if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      tryOutcomeQuickAction();
      return;
    }

    if (key === 'enter') {
      const summary = getSummary();
      if (summary && summary.phase === 'end' && summary.result === 'win') {
        const moved = ChainLabGame.nextLevel();
        if (moved) {
          hardSync();
        }
      }
    }
  });

  let previous = 0;
  function frame(now) {
    if (!previous) {
      previous = now;
    }

    const dt = (now - previous) / 1000;
    previous = now;

    ChainLabGame.update(dt);
    ChainLabGame.render(ctx);
    hardSync();

    requestAnimationFrame(frame);
  }

  hardSync();
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', bootstrap);