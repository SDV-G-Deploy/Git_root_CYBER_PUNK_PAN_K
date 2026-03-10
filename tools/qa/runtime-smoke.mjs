import { createChainLabEngine } from '../../src/engine.js';
import { loadLevels } from '../../src/levels.js';

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createCanvasStub() {
  const context = {
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    setLineDash() {},
    fillText() {},
    strokeText() {},
    measureText() {
      return { width: 0 };
    }
  };

  return {
    width: 960,
    height: 540,
    clientWidth: 960,
    getContext() {
      return context;
    }
  };
}

function findPrimaryActionNode(level) {
  const power = level.nodes.find((node) => node.type === 'power');
  if (power) {
    return power;
  }

  const firewall = level.nodes.find((node) => node.type === 'firewall');
  return firewall || null;
}

function collectTelemetryCounters(records) {
  const counters = {
    runStart: 0,
    runEnd: 0,
    retry: 0,
    duplicateRunEndEvents: 0
  };

  const runEndByRunId = new Map();

  for (let index = 0; index < records.length; index += 1) {
    const entry = records[index];
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    if (entry.eventType === 'run_start') {
      counters.runStart += 1;
    }

    if (entry.eventType === 'run_end') {
      counters.runEnd += 1;
      const runId = String(entry.runId || `unknown_${index}`);
      const nextCount = (runEndByRunId.get(runId) || 0) + 1;
      runEndByRunId.set(runId, nextCount);
      if (nextCount > 1) {
        counters.duplicateRunEndEvents += 1;
      }
    }

    if (entry.eventType === 'retry') {
      counters.retry += 1;
    }
  }

  return counters;
}

function runSmoke() {
  const levels = loadLevels();
  const levelIndexById = new Map();
  for (let index = 0; index < levels.length; index += 1) {
    levelIndexById.set(levels[index].id, index);
  }

  const engine = createChainLabEngine();
  engine.initGame(createCanvasStub(), {
    levels,
    startLevelIndex: 0
  });

  const checkpoints = ['L1', 'L25', 'L29', 'L34', 'L36'];

  for (let index = 0; index < checkpoints.length; index += 1) {
    const levelId = checkpoints[index];
    const levelIndex = levelIndexById.get(levelId);
    assertCondition(Number.isFinite(levelIndex), `Checkpoint level not found: ${levelId}`);

    engine.setLevel(levelIndex);
    let summary = engine.getRunSummary();
    assertCondition(summary && summary.levelId === levelId, `Failed to load level ${levelId}`);

    const hint = engine.requestHint();
    assertCondition(hint && hint.tierShown === 1, `Hint tier did not start at 1 on ${levelId}`);

    const actionNode = findPrimaryActionNode(levels[levelIndex]);
    assertCondition(actionNode, `No clickable action node found for ${levelId}`);

    const fired = engine.fireShot(actionNode.x, actionNode.y);
    assertCondition(fired === true, `Primary action failed on ${levelId}`);

    summary = engine.getRunSummary();
    assertCondition(summary.turnIndex === 1, `Turn index did not advance on ${levelId}`);

    engine.resetLevel();
    summary = engine.getRunSummary();
    assertCondition(summary.turnIndex === 0, `Reset did not restart turn index on ${levelId}`);
    assertCondition(summary.result === 'in_progress', `Reset left run in non-active state on ${levelId}`);

    const snapshot = engine.getSnapshot();
    assertCondition(snapshot.hint && snapshot.hint.tierShown === 0, `Hint tier did not reset on ${levelId}`);
  }

  engine.setLevel(0);
  const nextLevelWorked = engine.nextLevel();
  assertCondition(nextLevelWorked === true, 'nextLevel returned false from level 1');
  assertCondition(engine.getCurrentLevelIndex() === 1, 'nextLevel did not advance to level index 1');

  const telemetryRaw = engine.exportTelemetry('json');
  const telemetryRecords = JSON.parse(telemetryRaw);
  const counters = collectTelemetryCounters(telemetryRecords);

  assertCondition(counters.runStart > 0, 'No run_start events were captured in telemetry');
  assertCondition(counters.runEnd > 0, 'No run_end events were captured in telemetry');
  assertCondition(counters.duplicateRunEndEvents === 0, 'Duplicate run_end events detected in telemetry');

  console.log('Runtime smoke check passed.');
  console.log(`Levels loaded: ${levels.length}`);
  console.log(`Telemetry: run_start=${counters.runStart}, run_end=${counters.runEnd}, retry=${counters.retry}`);
}

runSmoke();
