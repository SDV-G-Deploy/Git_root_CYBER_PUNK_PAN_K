import { createChainLabEngine } from '../../src/engine.js';
import { loadLevels } from '../../src/levels.js';
import { applyRunSummaryToSave, createDefaultSaveData } from '../../src/persistence.js';

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

function verifyLevelList(engine, levels) {
  const levelList = engine.getLevelList();
  assertCondition(Array.isArray(levelList), 'engine.getLevelList() must return an array');
  assertCondition(levelList.length === levels.length, 'Level list length mismatch between engine and authored levels');

  const listedIds = new Set(levelList.map((level) => level.id));
  for (let i = 0; i < levels.length; i += 1) {
    assertCondition(listedIds.has(levels[i].id), `Missing level in engine level list: ${levels[i].id}`);
  }

  const sampleWithObjectives = levelList.find((level) => Array.isArray(level.objectiveTypes));
  assertCondition(Boolean(sampleWithObjectives), 'Level list is missing objectiveTypes metadata');
}

function verifyHintTierProgression(engine, levelId) {
  const first = engine.requestHint();
  const second = engine.requestHint();
  const third = engine.requestHint();
  const fourth = engine.requestHint();

  assertCondition(first && first.tierShown === 1, `Hint tier 1 missing on ${levelId}`);
  assertCondition(second && second.tierShown === 2, `Hint tier 2 missing on ${levelId}`);
  assertCondition(third && third.tierShown === 3, `Hint tier 3 missing on ${levelId}`);
  assertCondition(fourth && fourth.tierShown === 3, `Hint tier should remain capped on ${levelId}`);
}

function verifyProgressSaveAfterWin(engine, levels, levelIndexById) {
  const l1Index = levelIndexById.get('L1');
  assertCondition(Number.isFinite(l1Index), 'L1 not found for save/progress smoke check');

  engine.setLevel(l1Index);
  const actionNode = findPrimaryActionNode(levels[l1Index]);
  assertCondition(actionNode, 'L1 has no clickable action node');

  let summary = engine.getRunSummary();
  let guard = 0;
  while (summary && summary.phase !== 'end' && guard < 12) {
    const fired = engine.fireShot(actionNode.x, actionNode.y);
    assertCondition(fired === true, 'Failed to fire on L1 during save/progress smoke check');
    summary = engine.getRunSummary();
    guard += 1;
  }

  assertCondition(summary && summary.result === 'win', 'L1 did not reach win state in save/progress smoke check');

  const saveData = createDefaultSaveData();
  const nextSave = applyRunSummaryToSave(saveData, summary, levels.length);
  assertCondition(
    nextSave.progress.highestUnlockedLevelIndex >= 1,
    'Save progression did not unlock next level after L1 win'
  );
  assertCondition(
    nextSave.progress.completedLevelIds.includes('L1'),
    'Save progression did not record L1 completion'
  );
}

function verifyTelemetryFormats(engine) {
  const telemetryRawJson = engine.exportTelemetry('json');
  const telemetryRecords = JSON.parse(telemetryRawJson);
  const counters = collectTelemetryCounters(telemetryRecords);

  assertCondition(counters.runStart > 0, 'No run_start events were captured in telemetry');
  assertCondition(counters.runEnd > 0, 'No run_end events were captured in telemetry');
  assertCondition(counters.duplicateRunEndEvents === 0, 'Duplicate run_end events detected in telemetry');

  const telemetryRawJsonl = engine.exportTelemetry('jsonl');
  const lines = telemetryRawJsonl
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  assertCondition(lines.length > 0, 'JSONL telemetry export is empty');
  for (let i = 0; i < lines.length; i += 1) {
    const parsed = JSON.parse(lines[i]);
    assertCondition(parsed && typeof parsed === 'object', `Invalid JSONL telemetry line at ${i + 1}`);
  }

  assertCondition(
    lines.length === telemetryRecords.length,
    `JSON and JSONL telemetry record count mismatch (${telemetryRecords.length} vs ${lines.length})`
  );

  return counters;
}


function verifyBreakerLifecycle(engine, levels, levelIndexById) {
  const levelIndex = levelIndexById.get('L42');
  assertCondition(Number.isFinite(levelIndex), 'L42 not found for breaker lifecycle smoke check');

  engine.setLevel(levelIndex);
  const level = levels[levelIndex];
  const breakerNode = level.nodes.find((node) => node.type === 'breaker');
  const powerNode = level.nodes.find((node) => node.type === 'power');
  assertCondition(Boolean(breakerNode && powerNode), 'L42 missing breaker or power node');

  const primed = engine.fireShot(breakerNode.x, breakerNode.y);
  assertCondition(primed === true, 'Failed to prime breaker on L42');

  let summary = engine.getRunSummary();
  assertCondition(summary.lastTurn.breakerArmedNodes.length === 0, 'Breaker armed on same turn as prime');

  const armedFeed = engine.fireShot(powerNode.x, powerNode.y);
  assertCondition(armedFeed === true, 'Failed to feed armed breaker on L42');

  summary = engine.getRunSummary();
  assertCondition(summary.lastTurn.breakerArmedNodes.includes(breakerNode.id), 'Breaker did not arm on next turn');
  assertCondition(summary.lastTurn.breakerDissipation.length > 0, 'Breaker did not dissipate on armed feed turn');

  const unprimedFeed = engine.fireShot(powerNode.x, powerNode.y);
  assertCondition(unprimedFeed === true, 'Failed to feed after armed turn on L42');

  summary = engine.getRunSummary();
  assertCondition(
    !summary.lastTurn.breakerArmedNodes.includes(breakerNode.id),
    'Breaker armed state did not reset after one turn'
  );

  engine.resetLevel();
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

  verifyLevelList(engine, levels);
  verifyBreakerLifecycle(engine, levels, levelIndexById);

  const checkpoints = ['L1', 'L2', 'L4', 'L25', 'L29', 'L32', 'L34', 'L36', 'L37', 'L40'];

  for (let index = 0; index < checkpoints.length; index += 1) {
    const levelId = checkpoints[index];
    const levelIndex = levelIndexById.get(levelId);
    assertCondition(Number.isFinite(levelIndex), `Checkpoint level not found: ${levelId}`);

    engine.setLevel(levelIndex);
    let summary = engine.getRunSummary();
    assertCondition(summary && summary.levelId === levelId, `Failed to load level ${levelId}`);

    if (index === 0) {
      verifyHintTierProgression(engine, levelId);
    } else {
      const hint = engine.requestHint();
      assertCondition(hint && hint.tierShown === 1, `Hint tier did not start at 1 on ${levelId}`);
    }

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

  const l30Index = levelIndexById.get('L30');
  assertCondition(Number.isFinite(l30Index), 'L30 not found for multi-objective smoke check');
  engine.setLevel(l30Index);
  const l30Summary = engine.getRunSummary();
  assertCondition(l30Summary && l30Summary.objectivesTotal >= 3, 'L30 objective metadata did not load as expected');

  engine.setLevel(0);
  const nextLevelWorked = engine.nextLevel();
  assertCondition(nextLevelWorked === true, 'nextLevel returned false from level 1');
  assertCondition(engine.getCurrentLevelIndex() === 1, 'nextLevel did not advance to level index 1');

  const lastIndex = levels.length - 1;
  engine.setLevel(lastIndex);
  const nextFromLast = engine.nextLevel();
  assertCondition(nextFromLast === false, 'nextLevel should return false at final level');
  assertCondition(engine.getCurrentLevelIndex() === lastIndex, 'nextLevel from final level changed current index');

  verifyProgressSaveAfterWin(engine, levels, levelIndexById);

  const counters = verifyTelemetryFormats(engine);

  console.log('Runtime smoke check passed.');
  console.log(`Levels loaded: ${levels.length}`);
  console.log(`Checkpoints: ${checkpoints.join(', ')}`);
  console.log(`Telemetry: run_start=${counters.runStart}, run_end=${counters.runEnd}, retry=${counters.retry}`);
}

runSmoke();
