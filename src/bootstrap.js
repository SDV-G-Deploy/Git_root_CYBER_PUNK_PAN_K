import legacyChainLabApi from './adapters/legacyChainLabApi.js';
import { createAudioController } from './audio.js';
import { createInputController } from './input.js';
import {
  applyRunSummaryToSave,
  loadSaveData,
  saveSaveData,
  setPlaytestMode,
  setTutorialSeen
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
        // ignore malformed line
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
  const perLevel = new Map();
  let retries = 0;

  for (let i = 0; i < levelList.length; i += 1) {
    perLevel.set(levelList[i].id, {
      attempts: 0,
      wins: 0,
      losses: 0,
      abandons: 0
    });
  }

  for (let i = 0; i < records.length; i += 1) {
    const entry = records[i];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const runId = entry.runId || `unknown_${i}`;
    const payload = entry.payload || {};

    if (!runs.has(runId)) {
      runs.set(runId, {
        levelId: payload.levelId || null,
        startAt: null,
        endAt: null,
        hasStart: false,
        hasEnd: false,
        result: null,
        reason: null
      });
    }

    const run = runs.get(runId);

    if (entry.eventType === 'run_start') {
      run.startAt = entry.timestamp;
      run.hasStart = true;
      run.levelId = payload.levelId || run.levelId;
    }

    if (entry.eventType === 'run_end') {
      run.endAt = entry.timestamp;
      run.hasEnd = true;
      run.result = payload.result || null;
      run.reason = payload.reason || null;
      run.levelId = payload.levelId || run.levelId;

      if (run.levelId) {
        if (!perLevel.has(run.levelId)) {
          perLevel.set(run.levelId, { attempts: 0, wins: 0, losses: 0, abandons: 0 });
        }

        const stats = perLevel.get(run.levelId);
        stats.attempts += 1;
        if (run.result === 'win') {
          stats.wins += 1;
        } else if (run.result === 'lose') {
          stats.losses += 1;
        } else if (run.result === 'abandoned') {
          stats.abandons += 1;
        }
      }
    }

    if (entry.eventType === 'retry') {
      retries += 1;
    }
  }

  const runList = Array.from(runs.values());
  const closedRuns = runList.filter((run) => run.hasEnd);
  const openRuns = runList.length - closedRuns.length;
  const abandonedRuns = closedRuns.filter((run) => run.result === 'abandoned').length;

  const timedRuns = closedRuns.filter((run) => Number.isFinite(run.startAt) && Number.isFinite(run.endAt));
  const totalDuration = timedRuns.reduce((acc, run) => acc + Math.max(0, (run.endAt - run.startAt) / 1000), 0);
  const avgSession = timedRuns.length > 0 ? totalDuration / timedRuns.length : 0;

  const retryRate = closedRuns.length > 0 ? retries / closedRuns.length : 0;
  const abandonRate = closedRuns.length > 0 ? abandonedRuns / closedRuns.length : 0;
  const closedRunRate = runList.length > 0 ? closedRuns.length / runList.length : 0;

  const lines = [];
  lines.push('Telemetry Report (Signal Grid)');
  lines.push('');
  lines.push(`Runs observed: ${runList.length}`);
  lines.push(`Closed run rate: ${(closedRunRate * 100).toFixed(1)}% (${closedRuns.length}/${runList.length})`);
  lines.push(`Open runs: ${openRuns}`);
  lines.push(`Abandon rate: ${(abandonRate * 100).toFixed(1)}% (${abandonedRuns} abandoned runs)`);
  lines.push(`Avg session length: ${formatSeconds(avgSession)}`);
  lines.push(`Retry rate: ${(retryRate * 100).toFixed(1)}% (${retries} retries)`);
  lines.push('');
  lines.push('Level funnel:');

  const ids = levelList.map((level) => level.id);
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const stats = perLevel.get(id) || { attempts: 0, wins: 0, losses: 0, abandons: 0 };
    const completion = stats.attempts > 0 ? (stats.wins / stats.attempts) * 100 : 0;
    lines.push(
      `- ${id}: attempts=${stats.attempts}, wins=${stats.wins}, losses=${stats.losses}, abandons=${stats.abandons}, completion=${completion.toFixed(1)}%`
    );
  }

  lines.push('');
  lines.push('Top fail levels:');

  const rankedFails = Array.from(perLevel.entries())
    .map(([id, stats]) => ({ id, fails: stats.losses, attempts: stats.attempts }))
    .filter((row) => row.fails > 0)
    .sort((a, b) => {
      if (b.fails !== a.fails) {
        return b.fails - a.fails;
      }
      return a.id.localeCompare(b.id);
    })
    .slice(0, 5);

  if (rankedFails.length === 0) {
    lines.push('- no fails captured');
  } else {
    for (let i = 0; i < rankedFails.length; i += 1) {
      const row = rankedFails[i];
      lines.push(`- ${row.id}: fails=${row.fails}/${row.attempts}`);
    }
  }

  return lines.join('\n');
}
function bootstrap() {
  const game = legacyChainLabApi;
  const ui = createUI(document);
  const audio = createAudioController();

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

  const loadedSave = loadSaveData();
  let saveData = loadedSave.data;
  if (loadedSave.needsSave) {
    saveSaveData(saveData);
  }

  function persistSave() {
    saveSaveData(saveData);
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

  function buildLevelSelectViewModel() {
    const levels = game.getLevelList();
    const completedSet = new Set(saveData.progress.completedLevelIds);
    const perfectSet = new Set(saveData.progress.perfectLevelIds);
    const highestUnlockedLevelIndex = Math.min(
      Math.max(0, saveData.progress.highestUnlockedLevelIndex),
      Math.max(0, levels.length - 1)
    );

    return levels.map((level) => {
      const best = saveData.bestResultsByLevel[level.id] || null;
      return {
        ...level,
        locked: level.index > highestUnlockedLevelIndex,
        completed: completedSet.has(level.id),
        perfect: perfectSet.has(level.id),
        bestScore: best ? best.bestScore : 0
      };
    });
  }

  function renderLevelSelect() {
    ui.renderLevelSelect(buildLevelSelectViewModel(), game.getCurrentLevelIndex());
  }

  function syncUI() {
    ui.sync({
      snapshot: getSnapshot(),
      summary: getSummary(),
      trace: getTrace()
    });
  }

  function unlockAudio() {
    audio.unlock();
    ui.setSoundEnabled(!audio.isMuted());
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

  function exportTelemetry(format) {
    const mode = format === 'jsonl' ? 'jsonl' : 'json';
    const raw = game.exportTelemetry(mode);

    if (!raw || raw.length === 0 || raw === '[]') {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = mode === 'jsonl' ? 'jsonl' : 'json';
    const mime = mode === 'jsonl' ? 'application/jsonl' : 'application/json';
    const file = `chainlab-grid-telemetry-${stamp}.${ext}`;

    downloadTextFile(file, raw, mime);
  }

  function buildAndShowTelemetryReport() {
    const raw = game.exportTelemetry('json');
    const records = parseTelemetryRecords(raw);
    const report = buildTelemetryReport(records, game.getLevelList());

    ui.setTelemetryReport(report);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`chainlab-grid-report-${stamp}.txt`, report, 'text/plain');
  }

  const startLevelIndex = Math.max(0, saveData.progress.highestUnlockedLevelIndex);

  game.initGame(ui.refs.canvas, {
    startLevelIndex,
    onRunEnd: (result, rewardPacket, summary) => {
      saveData = applyRunSummaryToSave(saveData, summary, game.getLevelList().length);
      persistSave();
      renderLevelSelect();
    },
    onUxEvent: (eventType, payload) => {
      audio.play(eventType, payload);
    }
  });

  renderLevelSelect();
  ui.applyPlaytestMode(saveData.playtestMode);
  ui.setTutorialVisible(!saveData.tutorialSeen);
  ui.setSoundEnabled(!audio.isMuted());

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
      saveData = setTutorialSeen(saveData, true);
      persistSave();
    },
    onUserGesture: unlockAudio
  });

  if (ui.refs.levelSelect) {
    ui.refs.levelSelect.addEventListener('change', (event) => {
      const nextIndex = Number(event.target.value);
      const levels = buildLevelSelectViewModel();
      const selected = levels.find((level) => level.index === nextIndex);
      if (!selected || selected.locked) {
        renderLevelSelect();
        return;
      }

      enqueueCommand({
        type: 'set_level',
        levelIndex: nextIndex
      });
    });
  }

  if (ui.refs.retryButton) {
    ui.refs.retryButton.addEventListener('click', () => {
      unlockAudio();
      restartCurrentLevel('hud_retry', true);
    });
  }

  if (ui.refs.summaryRetryButton) {
    ui.refs.summaryRetryButton.addEventListener('click', () => {
      unlockAudio();
      restartCurrentLevel('summary_retry', true);
    });
  }

  if (ui.refs.nextButton) {
    ui.refs.nextButton.addEventListener('click', () => {
      unlockAudio();
      enqueueCommand({ type: 'next_level' });
    });
  }

  if (ui.refs.soundToggleButton) {
    ui.refs.soundToggleButton.addEventListener('click', () => {
      unlockAudio();
      const enabled = audio.toggleMute();
      ui.setSoundEnabled(enabled);
    });
  }

  if (ui.refs.playtestModeToggle) {
    ui.refs.playtestModeToggle.addEventListener('change', (event) => {
      saveData = setPlaytestMode(saveData, Boolean(event.target.checked));
      persistSave();
      ui.applyPlaytestMode(saveData.playtestMode);
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

