import legacyChainLabApi from './adapters/legacyChainLabApi.js';
import { createAudioController } from './audio.js';
import { createInputController } from './input.js';
import { loadPlaytestMode, loadTutorialSeen, savePlaytestMode, saveTutorialSeen } from './persistence.js';
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
      losses: 0
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
        result: null,
        reason: null
      });
    }

    const run = runs.get(runId);

    if (entry.eventType === 'run_start') {
      run.startAt = entry.timestamp;
      run.levelId = payload.levelId || run.levelId;
    }

    if (entry.eventType === 'run_end') {
      run.endAt = entry.timestamp;
      run.result = payload.result || null;
      run.reason = payload.reason || null;
      run.levelId = payload.levelId || run.levelId;

      if (run.levelId) {
        if (!perLevel.has(run.levelId)) {
          perLevel.set(run.levelId, { attempts: 0, wins: 0, losses: 0 });
        }

        const stats = perLevel.get(run.levelId);
        stats.attempts += 1;
        if (run.result === 'win') {
          stats.wins += 1;
        } else {
          stats.losses += 1;
        }
      }
    }

    if (entry.eventType === 'retry') {
      retries += 1;
    }
  }

  const runList = Array.from(runs.values());
  const closedRuns = runList.filter((run) => Number.isFinite(run.startAt) && Number.isFinite(run.endAt));
  const totalDuration = closedRuns.reduce((acc, run) => acc + Math.max(0, (run.endAt - run.startAt) / 1000), 0);
  const avgSession = closedRuns.length > 0 ? totalDuration / closedRuns.length : 0;
  const retryRate = runList.length > 0 ? retries / runList.length : 0;

  const lines = [];
  lines.push('Telemetry Report (Signal Grid)');
  lines.push('');
  lines.push(`Runs observed: ${runList.length}`);
  lines.push(`Avg session length: ${formatSeconds(avgSession)}`);
  lines.push(`Retry rate: ${(retryRate * 100).toFixed(1)}% (${retries} retries)`);
  lines.push('');
  lines.push('Level funnel:');

  const ids = levelList.map((level) => level.id);
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const stats = perLevel.get(id) || { attempts: 0, wins: 0, losses: 0 };
    const completion = stats.attempts > 0 ? (stats.wins / stats.attempts) * 100 : 0;
    lines.push(`- ${id}: attempts=${stats.attempts}, wins=${stats.wins}, completion=${completion.toFixed(1)}%`);
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

  let playtestMode = loadPlaytestMode();

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

  game.initGame(ui.refs.canvas, {
    onRunEnd: () => {},
    onUxEvent: (eventType, payload) => {
      audio.play(eventType, payload);
    }
  });

  ui.renderLevelSelect(game.getLevelList(), game.getCurrentLevelIndex());
  ui.applyPlaytestMode(playtestMode);
  ui.setTutorialVisible(!loadTutorialSeen());
  ui.setSoundEnabled(true);

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
    },
    onUserGesture: unlockAudio
  });

  if (ui.refs.levelSelect) {
    ui.refs.levelSelect.addEventListener('change', (event) => {
      enqueueCommand({
        type: 'set_level',
        levelIndex: Number(event.target.value)
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
      playtestMode = Boolean(event.target.checked);
      savePlaytestMode(playtestMode);
      ui.applyPlaytestMode(playtestMode);
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
