'use strict';

const META_SAVE_KEY = 'signal_district_chainlab_meta_v1';
const META_SAVE_VERSION = 1;
const PLAYTEST_MODE_KEY = 'signal_district_chainlab_playtest_mode';
const TUTORIAL_SEEN_KEY = 'signal_district_chainlab_tutorial_seen';

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

const NODE_TYPE_LABELS = Object.freeze({
  bomb: 'Bomb',
  pusher: 'Pusher',
  multiplier: 'Multiplier'
});

const CHAIN_REASON_LABELS = Object.freeze({
  direct_hit: 'direct hit',
  bomb_aoe: 'bomb AOE',
  pusher_impulse: 'pusher impulse'
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

function loadPlaytestMode() {
  try {
    return localStorage.getItem(PLAYTEST_MODE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function savePlaytestMode(isEnabled) {
  try {
    localStorage.setItem(PLAYTEST_MODE_KEY, isEnabled ? '1' : '0');
  } catch (error) {
    // Ignore persistence errors.
  }
}

function loadTutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function saveTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (error) {
    // Ignore persistence errors.
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

function downloadTextFile(fileName, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseTelemetryRecords(raw) {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const records = [];
    for (let i = 0; i < lines.length; i += 1) {
      try {
        records.push(JSON.parse(lines[i]));
      } catch (lineError) {
        // Skip malformed lines in MVP report mode.
      }
    }

    return records;
  }
}

function formatSeconds(value) {
  return `${value.toFixed(2)}s`;
}

function buildTelemetryReport(records, levelList) {
  const runs = new Map();
  const levelStats = new Map();

  for (let i = 0; i < levelList.length; i += 1) {
    levelStats.set(levelList[i].id, { attempts: 0, wins: 0, fails: 0 });
  }

  let retryEvents = 0;

  for (let i = 0; i < records.length; i += 1) {
    const entry = records[i];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const runId = entry.runId || `unknown_${i}`;
    const payload = entry.payload || {};
    if (!runs.has(runId)) {
      runs.set(runId, {
        startAt: null,
        endAt: null,
        levelId: payload.levelId || null,
        result: null
      });
    }

    const run = runs.get(runId);
    const eventType = entry.eventType;

    if (eventType === 'run_start') {
      run.startAt = entry.timestamp;
      run.levelId = payload.levelId || run.levelId;
    }

    if (eventType === 'run_end') {
      run.endAt = entry.timestamp;
      run.result = payload.result || run.result;
      run.levelId = payload.levelId || run.levelId;

      if (run.levelId) {
        if (!levelStats.has(run.levelId)) {
          levelStats.set(run.levelId, { attempts: 0, wins: 0, fails: 0 });
        }

        const stats = levelStats.get(run.levelId);
        stats.attempts += 1;
        if (run.result === 'win') {
          stats.wins += 1;
        } else {
          stats.fails += 1;
        }
      }
    }

    if (eventType === 'retry') {
      retryEvents += 1;
    }
  }

  const runEntries = Array.from(runs.values());
  const completedRuns = runEntries.filter((run) => Number.isFinite(run.startAt) && Number.isFinite(run.endAt));

  let totalDurationSec = 0;
  for (let i = 0; i < completedRuns.length; i += 1) {
    totalDurationSec += Math.max(0, (completedRuns[i].endAt - completedRuns[i].startAt) / 1000);
  }

  const avgSessionSec = completedRuns.length > 0 ? totalDurationSec / completedRuns.length : 0;
  const retryRate = runEntries.length > 0 ? retryEvents / runEntries.length : 0;

  const levelIds = levelList.map((level) => level.id);
  const funnelLines = [];
  for (let i = 0; i < levelIds.length; i += 1) {
    const id = levelIds[i];
    const stats = levelStats.get(id) || { attempts: 0, wins: 0, fails: 0 };
    const completionRate = stats.attempts > 0 ? (stats.wins / stats.attempts) * 100 : 0;
    funnelLines.push(
      `${id}: attempts=${stats.attempts}, wins=${stats.wins}, completion=${completionRate.toFixed(1)}%`
    );
  }

  const failRanking = [];
  levelStats.forEach((stats, levelId) => {
    if (stats.fails > 0) {
      failRanking.push({ levelId, fails: stats.fails, attempts: stats.attempts });
    }
  });

  failRanking.sort((a, b) => {
    if (b.fails !== a.fails) {
      return b.fails - a.fails;
    }
    return a.levelId.localeCompare(b.levelId);
  });

  const topFailLines = failRanking.slice(0, 5).map((row) => `${row.levelId}: fails=${row.fails}/${row.attempts}`);

  const lines = [];
  lines.push('Telemetry Report (v0.1-playtest)');
  lines.push('');
  lines.push(`Runs observed: ${runEntries.length}`);
  lines.push(`Avg session length: ${formatSeconds(avgSessionSec)}`);
  lines.push(`Retry rate: ${(retryRate * 100).toFixed(1)}% (${retryEvents} retries)`);
  lines.push('');
  lines.push('Level completion funnel (L1-L12):');
  if (funnelLines.length === 0) {
    lines.push('- no level data');
  } else {
    for (let i = 0; i < funnelLines.length; i += 1) {
      lines.push(`- ${funnelLines[i]}`);
    }
  }
  lines.push('');
  lines.push('Top fail levels:');
  if (topFailLines.length === 0) {
    lines.push('- no fails captured');
  } else {
    for (let i = 0; i < topFailLines.length; i += 1) {
      lines.push(`- ${topFailLines[i]}`);
    }
  }
  lines.push('');
  lines.push('Known issues:');
  lines.push('- Screen shake can feel strong on dense chains.');
  lines.push('- Telemetry is local-only and resets if storage is cleared.');
  lines.push('- Completion funnel stabilizes only after enough external sessions.');

  return lines.join('\n');
}

function formatChainReason(reason) {
  return CHAIN_REASON_LABELS[reason] || String(reason || 'trigger');
}

function formatNodeType(type) {
  return NODE_TYPE_LABELS[type] || String(type || 'node');
}

function bootstrap() {
  const canvas = document.getElementById('chainlab-canvas');
  const scoreLabel = document.getElementById('scoreLabel');
  const shotsLabel = document.getElementById('shotsLabel');
  const targetLabel = document.getElementById('targetLabel');
  const levelLabel = document.getElementById('levelLabel');
  const chainStatusLabel = document.getElementById('chainStatusLabel');
  const levelSelect = document.getElementById('levelSelect');
  const helpButton = document.getElementById('helpButton');
  const retryButton = document.getElementById('retryButton');
  const outcomePanel = document.getElementById('outcomePanel');
  const outcomeText = document.getElementById('outcomeText');
  const outcomeReason = document.getElementById('outcomeReason');
  const summaryRetryButton = document.getElementById('summaryRetryButton');
  const nextButton = document.getElementById('nextButton');

  const summaryResult = document.getElementById('summaryResult');
  const summaryScore = document.getElementById('summaryScore');
  const summaryDepth = document.getElementById('summaryDepth');
  const summaryAccuracy = document.getElementById('summaryAccuracy');

  const chainFeedStatus = document.getElementById('chainFeedStatus');
  const chainLogList = document.getElementById('chainLogList');

  const tutorialOverlay = document.getElementById('tutorialOverlay');
  const tutorialStartButton = document.getElementById('tutorialStartButton');

  const techPartsLabel = document.getElementById('techPartsLabel');
  const metaStatus = document.getElementById('metaStatus');
  const buyScoreBonusButton = document.getElementById('buyScoreBonusButton');
  const buyChainGrowthButton = document.getElementById('buyChainGrowthButton');

  const playtestModeToggle = document.getElementById('playtestModeToggle');
  const exportTelemetryJsonButton = document.getElementById('exportTelemetryJsonButton');
  const exportTelemetryJsonlButton = document.getElementById('exportTelemetryJsonlButton');
  const buildReportButton = document.getElementById('buildReportButton');
  const telemetryReportOutput = document.getElementById('telemetryReportOutput');

  if (!canvas) {
    throw new Error('Canvas #chainlab-canvas not found.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D context from canvas.');
  }

  let metaState = loadMetaState();
  let playtestMode = loadPlaytestMode();
  let tutorialVisible = !loadTutorialSeen();

  function setMetaStatus(message) {
    metaState.lastStatus = message;
    saveMetaState(metaState);
  }

  function getSummary() {
    return ChainLabGame.getRunSummary();
  }

  function setTutorialVisible(visible, markSeen) {
    tutorialVisible = Boolean(visible);

    if (tutorialOverlay) {
      tutorialOverlay.classList.toggle('hidden', !tutorialVisible);
    }

    document.body.classList.toggle('tutorial-open', tutorialVisible);

    if (markSeen) {
      saveTutorialSeen();
    }
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

  function applyPlaytestMode() {
    document.body.classList.toggle('playtest-mode', playtestMode);
    if (playtestModeToggle) {
      playtestModeToggle.checked = playtestMode;
    }
  }

  function trackRetry(reason) {
    if (typeof ChainLabGame.trackEvent !== 'function') {
      return;
    }

    const summary = getSummary();
    ChainLabGame.trackEvent('retry', {
      reason,
      levelId: summary ? summary.levelId : null,
      result: summary ? summary.result : null
    });
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

    if (chainStatusLabel) {
      let status = 'Chain: idle';
      if (snapshot.phase === 'simulate') {
        status = 'Chain: projectile in flight';
      } else if (snapshot.phase === 'resolve') {
        status = `Chain: resolving (step ${snapshot.chainSteps})`;
      } else if (snapshot.phase === 'end') {
        status = `Chain: resolved depth ${snapshot.chainDepth}`;
      }
      chainStatusLabel.textContent = status;
    }

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
      if (outcomeReason) {
        outcomeReason.textContent = 'Reach target score before shots run out.';
      }
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
      if (outcomeReason) {
        outcomeReason.textContent = `Target ${summary.targetScore} reached with ${summary.score} score.`;
      }
    } else {
      outcomePanel.classList.add('lose');
      outcomePanel.classList.remove('win');
      outcomeText.textContent = 'Defeat: shots exhausted. Press Space or click arena to retry.';
      if (outcomeReason) {
        outcomeReason.textContent = `Score ${summary.score}/${summary.targetScore}. No shots left.`;
      }
    }

    nextButton.disabled = !hasNextLevel || summary.result !== 'win';
  }

  function syncChainFeed() {
    if (!chainFeedStatus || !chainLogList) {
      return;
    }

    const summary = getSummary();
    if (!summary) {
      return;
    }

    if (summary.phase === 'resolve') {
      chainFeedStatus.textContent = `Chain resolving... step ${summary.chainSteps}, depth ${summary.chainDepth}.`;
    } else if (summary.phase === 'simulate') {
      chainFeedStatus.textContent = 'Projectile in flight...';
    } else if (summary.phase === 'end') {
      chainFeedStatus.textContent =
        summary.chainSteps > 0
          ? `Chain ended at depth ${summary.chainDepth}.`
          : 'No chain triggered this run.';
    } else {
      chainFeedStatus.textContent = 'Waiting for shot...';
    }

    const trace = typeof ChainLabGame.getChainTrace === 'function' ? ChainLabGame.getChainTrace() : [];
    chainLogList.innerHTML = '';

    if (!Array.isArray(trace) || trace.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'chain-log-empty';
      empty.textContent = 'Hit a node to see causal chain events.';
      chainLogList.appendChild(empty);
      return;
    }

    for (let i = trace.length - 1; i >= 0; i -= 1) {
      const item = trace[i];
      const source = item.sourceId === 'projectile' ? 'shot' : item.sourceId;
      const reason = formatChainReason(item.reason);
      const nodeType = formatNodeType(item.nodeType);
      const row = document.createElement('li');
      row.textContent = `#${item.step} ${source} -> ${item.targetId} (${nodeType}) via ${reason}, +${item.points}`;
      chainLogList.appendChild(row);
    }
  }

  function hardSync() {
    syncHud();
    syncSummary();
    syncOutcomePanel();
    syncChainFeed();
    syncMetaPanel();
  }

  function restartCurrentLevel(reason, trackAsRetry) {
    if (trackAsRetry) {
      trackRetry(reason || 'manual_retry');
    }

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

    restartCurrentLevel('quick_retry', true);
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
    restartCurrentLevel('upgrade_refresh', false);
  }

  function exportTelemetry(format) {
    const normalized = format === 'jsonl' ? 'jsonl' : 'json';
    const raw = ChainLabGame.exportTelemetry(normalized);
    if (!raw || raw.length === 0 || raw === '[]') {
      setMetaStatus('No telemetry data yet. Play at least one run first.');
      hardSync();
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = normalized === 'jsonl' ? 'jsonl' : 'json';
    const mime = normalized === 'jsonl' ? 'application/jsonl' : 'application/json';
    const fileName = `chainlab-telemetry-${stamp}.${ext}`;

    downloadTextFile(fileName, raw, mime);
    setMetaStatus(`Telemetry exported: ${fileName}`);
    hardSync();
  }

  function buildAndShowTelemetryReport() {
    const raw = ChainLabGame.exportTelemetry('json');
    const records = parseTelemetryRecords(raw);
    const levelList = ChainLabGame.getLevelList();
    const reportText = buildTelemetryReport(records, levelList);

    if (telemetryReportOutput) {
      telemetryReportOutput.textContent = reportText;
      telemetryReportOutput.classList.remove('hidden');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `chainlab-telemetry-report-${stamp}.txt`;
    downloadTextFile(reportFileName, reportText, 'text/plain');

    setMetaStatus(`Telemetry report generated: ${reportFileName}`);
    hardSync();
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

      if (typeof ChainLabGame.trackEvent === 'function') {
        ChainLabGame.trackEvent('reward_claimed', {
          levelId,
          tech_parts: earnedTechParts
        });
      }
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
  applyPlaytestMode();
  setTutorialVisible(tutorialVisible, false);

  canvas.addEventListener('mousemove', (event) => {
    if (tutorialVisible) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    ChainLabGame.setAim(point.x, point.y, true);
  });

  canvas.addEventListener('mouseleave', () => {
    if (tutorialVisible) {
      return;
    }

    ChainLabGame.setAim(0, 0, false);
  });

  canvas.addEventListener('click', (event) => {
    if (tutorialVisible) {
      return;
    }

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

  if (helpButton) {
    helpButton.addEventListener('click', () => {
      setTutorialVisible(true, false);
    });
  }

  if (tutorialStartButton) {
    tutorialStartButton.addEventListener('click', () => {
      setTutorialVisible(false, true);
    });
  }

  if (tutorialOverlay) {
    tutorialOverlay.addEventListener('click', (event) => {
      if (event.target === tutorialOverlay) {
        setTutorialVisible(false, true);
      }
    });
  }

  retryButton.addEventListener('click', () => {
    restartCurrentLevel('hud_retry', true);
  });

  if (summaryRetryButton) {
    summaryRetryButton.addEventListener('click', () => {
      restartCurrentLevel('summary_retry', true);
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

  if (playtestModeToggle) {
    playtestModeToggle.addEventListener('change', (event) => {
      playtestMode = Boolean(event.target.checked);
      savePlaytestMode(playtestMode);
      applyPlaytestMode();
    });
  }

  if (exportTelemetryJsonButton) {
    exportTelemetryJsonButton.addEventListener('click', () => {
      exportTelemetry('json');
    });
  }

  if (exportTelemetryJsonlButton) {
    exportTelemetryJsonlButton.addEventListener('click', () => {
      exportTelemetry('jsonl');
    });
  }

  if (buildReportButton) {
    buildReportButton.addEventListener('click', () => {
      buildAndShowTelemetryReport();
    });
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (tutorialVisible) {
      if (key === 'escape' || key === 'enter' || key === ' ') {
        event.preventDefault();
        setTutorialVisible(false, true);
      }
      return;
    }

    if (key === 'r') {
      restartCurrentLevel('hotkey_retry', true);
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