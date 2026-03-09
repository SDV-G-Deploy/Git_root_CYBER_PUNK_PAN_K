import legacyChainLabApi from './adapters/legacyChainLabApi.js';
import { UPGRADE_DEFS } from './config.js';
import { createInputController } from './input.js';
import {
  buildMetaModifiers,
  loadMetaState,
  loadPlaytestMode,
  loadTutorialSeen,
  saveMetaState,
  savePlaytestMode,
  saveTutorialSeen
} from './persistence.js';
import { createUI } from './ui.js';

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

function bootstrap() {
  const game = legacyChainLabApi;
  const ui = createUI(document);

  if (!ui.refs.canvas) {
    throw new Error('Canvas #chainlab-canvas not found.');
  }

  const ctx = ui.refs.canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D context from canvas.');
  }

  const commandQueue = [];
  const enqueueCommand = (command) => {
    commandQueue.push(command);
  };

  let metaState = loadMetaState();
  let playtestMode = loadPlaytestMode();

  function setMetaStatus(message) {
    metaState.lastStatus = message;
    saveMetaState(metaState);
  }

  function getSummary() {
    return game.getRunSummary();
  }

  function getSnapshot() {
    return game.getSnapshot();
  }

  function getTrace() {
    return game.getChainTrace();
  }

  function syncUI() {
    ui.sync({
      snapshot: getSnapshot(),
      summary: getSummary(),
      trace: getTrace(),
      metaState
    });
  }

  function applyModifiersFromMeta() {
    game.setModifiers(buildMetaModifiers(metaState));
  }

  function applyPlaytestMode() {
    ui.applyPlaytestMode(playtestMode);
  }

  function renderLevelSelect() {
    ui.renderLevelSelect(game.getLevelList(), game.getCurrentLevelIndex());
  }

  function trackRetry(reason) {
    const summary = getSummary();
    game.trackEvent('retry', {
      reason,
      levelId: summary ? summary.levelId : null,
      result: summary ? summary.result : null
    });
  }

  function restartCurrentLevel(reason, trackAsRetry) {
    if (trackAsRetry) {
      trackRetry(reason || 'manual_retry');
    }

    enqueueCommand({ type: 'reset_level' });
  }

  function tryOutcomeQuickAction() {
    const summary = getSummary();
    if (!summary || summary.phase !== 'end') {
      return false;
    }

    if (summary.result === 'win') {
      enqueueCommand({ type: 'next_level' });
      return true;
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
      syncUI();
      return;
    }

    if (metaState.techParts < def.cost) {
      setMetaStatus(`Not enough tech parts for ${def.label}.`);
      syncUI();
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
    const raw = game.exportTelemetry(normalized);

    if (!raw || raw.length === 0 || raw === '[]') {
      setMetaStatus('No telemetry data yet. Play at least one run first.');
      syncUI();
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = normalized === 'jsonl' ? 'jsonl' : 'json';
    const mime = normalized === 'jsonl' ? 'application/jsonl' : 'application/json';
    const fileName = `chainlab-telemetry-${stamp}.${ext}`;

    downloadTextFile(fileName, raw, mime);
    setMetaStatus(`Telemetry exported: ${fileName}`);
    syncUI();
  }

  function buildAndShowTelemetryReport() {
    const raw = game.exportTelemetry('json');
    const records = parseTelemetryRecords(raw);
    const reportText = buildTelemetryReport(records, game.getLevelList());

    ui.setTelemetryReport(reportText);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `chainlab-telemetry-report-${stamp}.txt`;
    downloadTextFile(fileName, reportText, 'text/plain');

    setMetaStatus(`Telemetry report generated: ${fileName}`);
    syncUI();
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

      game.trackEvent('reward_claimed', {
        levelId,
        tech_parts: earnedTechParts
      });
    } else {
      setMetaStatus('Run failed. Retry to earn tech parts.');
    }

    saveMetaState(metaState);
  }

  game.initGame(ui.refs.canvas, {
    onRunEnd: handleRunEnd,
    modifiers: buildMetaModifiers(metaState)
  });

  renderLevelSelect();
  applyModifiersFromMeta();
  applyPlaytestMode();
  ui.setTutorialVisible(!loadTutorialSeen());

  createInputController({
    windowRef: window,
    ui,
    enqueueCommand,
    getSummary,
    onQuickAction: tryOutcomeQuickAction,
    onRetry: restartCurrentLevel,
    onNextLevel: () => {
      enqueueCommand({ type: 'next_level' });
    },
    onHelpToggle: () => {
      ui.setTutorialVisible(true);
    },
    onTutorialDismiss: () => {
      ui.setTutorialVisible(false);
      saveTutorialSeen();
    }
  });

  if (ui.refs.levelSelect) {
    ui.refs.levelSelect.addEventListener('change', (event) => {
      const levelIndex = Number(event.target.value);
      enqueueCommand({ type: 'set_level', levelIndex });
    });
  }

  if (ui.refs.retryButton) {
    ui.refs.retryButton.addEventListener('click', () => {
      restartCurrentLevel('hud_retry', true);
    });
  }

  if (ui.refs.summaryRetryButton) {
    ui.refs.summaryRetryButton.addEventListener('click', () => {
      restartCurrentLevel('summary_retry', true);
    });
  }

  if (ui.refs.nextButton) {
    ui.refs.nextButton.addEventListener('click', () => {
      enqueueCommand({ type: 'next_level' });
    });
  }

  if (ui.refs.buyScoreBonusButton) {
    ui.refs.buyScoreBonusButton.addEventListener('click', () => {
      tryPurchaseUpgrade('score_bonus');
    });
  }

  if (ui.refs.buyChainGrowthButton) {
    ui.refs.buyChainGrowthButton.addEventListener('click', () => {
      tryPurchaseUpgrade('chain_growth');
    });
  }

  if (ui.refs.playtestModeToggle) {
    ui.refs.playtestModeToggle.addEventListener('change', (event) => {
      playtestMode = Boolean(event.target.checked);
      savePlaytestMode(playtestMode);
      applyPlaytestMode();
    });
  }

  if (ui.refs.exportTelemetryJsonButton) {
    ui.refs.exportTelemetryJsonButton.addEventListener('click', () => {
      exportTelemetry('json');
    });
  }

  if (ui.refs.exportTelemetryJsonlButton) {
    ui.refs.exportTelemetryJsonlButton.addEventListener('click', () => {
      exportTelemetry('jsonl');
    });
  }

  if (ui.refs.buildReportButton) {
    ui.refs.buildReportButton.addEventListener('click', () => {
      buildAndShowTelemetryReport();
    });
  }

  let previous = 0;

  function frame(now) {
    if (!previous) {
      previous = now;
    }

    const dt = (now - previous) / 1000;
    previous = now;

    const commands = commandQueue.splice(0, commandQueue.length);
    game.tick(dt, commands);
    game.render(ctx);
    syncUI();

    requestAnimationFrame(frame);
  }

  syncUI();
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', bootstrap);