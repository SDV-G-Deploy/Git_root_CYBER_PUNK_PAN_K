function getEl(documentRef, id) {
  return documentRef.getElementById(id);
}

function setText(cache, key, element, value) {
  if (!element) {
    return;
  }

  if (cache.get(key) === value) {
    return;
  }

  cache.set(key, value);
  element.textContent = value;
}

function setToggle(cache, key, element, className, enabled) {
  if (!element) {
    return;
  }

  const next = Boolean(enabled);
  if (cache.get(key) === next) {
    return;
  }

  cache.set(key, next);
  element.classList.toggle(className, next);
}

function buildObjectiveLine(objective) {
  const status = objective.done ? '[OK]' : '[ ]';
  return `${status} ${objective.text}`;
}

function buildTraceLine(entry) {
  if (entry.detail) {
    return `#${entry.step} ${entry.toNodeId}: ${entry.detail}`;
  }

  const source = entry.fromNodeId || 'unknown';
  const edge = entry.edgeId ? ` via ${entry.edgeId}` : '';
  return `#${entry.step} ${source} -> ${entry.toNodeId}${edge}, +${entry.energyAccepted}`;
}

function getCoachCopy(snapshot, summary) {
  if (snapshot && snapshot.hoverInfo) {
    return {
      title: snapshot.hoverInfo.title,
      body: snapshot.hoverInfo.actionText,
      meta: snapshot.hoverInfo.detailText
    };
  }

  if (!summary) {
    return {
      title: 'Signal Brief',
      body: 'Charge the core to stabilize the district grid.',
      meta: 'Hover nodes to inspect their role before committing a move.'
    };
  }

  if (summary.phase === 'end') {
    return {
      title: summary.result === 'win' ? 'Run Complete' : 'Run Failed',
      body: summary.lastTurn.status || 'Operation complete.',
      meta: summary.result === 'win'
        ? 'Press Enter or click the arena to move on.'
        : 'Press Space, R, or Retry to restart quickly.'
    };
  }

  if (summary.lastAction && !summary.lastAction.valid) {
    if (summary.lastAction.reason === 'no_target') {
      return {
        title: 'No target selected',
        body: 'Clicks only count on Power and Firewall nodes.',
        meta: 'Hover a node first. Clickable nodes glow brighter than passive ones.'
      };
    }

    if (summary.lastAction.reason === 'node_not_clickable') {
      return {
        title: 'That node is passive',
        body: 'Relay, Overload, Virus, and Core nodes react automatically.',
        meta: 'Use Power to inject energy and Firewall to route it.'
      };
    }
  }

  if (summary.turnIndex === 0) {
    return {
      title: 'Primary Objective',
      body: summary.nextObjectiveText || 'Charge the core.',
      meta: 'Open with a Power node. Firewalls let you redirect the flow.'
    };
  }

  if (summary.lastTurn && summary.lastTurn.explodedNodes && summary.lastTurn.explodedNodes.length > 0) {
    return {
      title: 'Overload Detected',
      body: 'Too much energy passed through an overload node in one turn.',
      meta: 'Split the route, reduce feed, or open another firewall branch.'
    };
  }

  if (summary.lastTurn && summary.lastTurn.corruptionNew && summary.lastTurn.corruptionNew.length > 0) {
    return {
      title: 'Virus Spread',
      body: 'Infection advanced into adjacent nodes after the turn resolved.',
      meta: 'Push energy faster toward the core or avoid feeding infected branches.'
    };
  }

  return {
    title: 'Next Move',
    body: summary.nextObjectiveText || 'Charge the core.',
    meta: 'Hover nodes to inspect them. Neon pulses show where energy just traveled.'
  };
}

export function createUI(documentRef) {
  const refs = {
    canvas: getEl(documentRef, 'chainlab-canvas'),
    scoreLabel: getEl(documentRef, 'scoreLabel'),
    shotsLabel: getEl(documentRef, 'shotsLabel'),
    targetLabel: getEl(documentRef, 'targetLabel'),
    levelLabel: getEl(documentRef, 'levelLabel'),
    chainStatusLabel: getEl(documentRef, 'chainStatusLabel'),
    levelSelect: getEl(documentRef, 'levelSelect'),
    helpButton: getEl(documentRef, 'helpButton'),
    retryButton: getEl(documentRef, 'retryButton'),
    soundToggleButton: getEl(documentRef, 'soundToggleButton'),
    coachTitle: getEl(documentRef, 'coachTitle'),
    coachBody: getEl(documentRef, 'coachBody'),
    coachMeta: getEl(documentRef, 'coachMeta'),
    outcomePanel: getEl(documentRef, 'outcomePanel'),
    outcomeText: getEl(documentRef, 'outcomeText'),
    outcomeReason: getEl(documentRef, 'outcomeReason'),
    summaryRetryButton: getEl(documentRef, 'summaryRetryButton'),
    nextButton: getEl(documentRef, 'nextButton'),
    summaryResult: getEl(documentRef, 'summaryResult'),
    summaryScore: getEl(documentRef, 'summaryScore'),
    summaryDepth: getEl(documentRef, 'summaryDepth'),
    summaryAccuracy: getEl(documentRef, 'summaryAccuracy'),
    chainFeedStatus: getEl(documentRef, 'chainFeedStatus'),
    chainLogList: getEl(documentRef, 'chainLogList'),
    tutorialOverlay: getEl(documentRef, 'tutorialOverlay'),
    tutorialStartButton: getEl(documentRef, 'tutorialStartButton'),
    playtestModeToggle: getEl(documentRef, 'playtestModeToggle'),
    exportTelemetryJsonButton: getEl(documentRef, 'exportTelemetryJsonButton'),
    exportTelemetryJsonlButton: getEl(documentRef, 'exportTelemetryJsonlButton'),
    buildReportButton: getEl(documentRef, 'buildReportButton'),
    telemetryReportOutput: getEl(documentRef, 'telemetryReportOutput'),
    metaPanel: getEl(documentRef, 'metaPanel')
  };

  if (refs.metaPanel) {
    refs.metaPanel.classList.add('hidden');
  }

  const textCache = new Map();
  const toggleCache = new Map();
  let tutorialVisible = false;
  let chainKey = '';

  function renderLevelSelect(levels, currentIndex) {
    if (!refs.levelSelect) {
      return;
    }

    refs.levelSelect.innerHTML = '';
    levels.forEach((level) => {
      const option = documentRef.createElement('option');
      option.value = String(level.index);
      option.textContent = `${level.id} ${level.name}`;
      refs.levelSelect.appendChild(option);
    });

    refs.levelSelect.value = String(currentIndex);
  }

  function setTutorialVisible(visible) {
    tutorialVisible = Boolean(visible);
    setToggle(toggleCache, 'tutorial-hidden', refs.tutorialOverlay, 'hidden', !tutorialVisible);
    documentRef.body.classList.toggle('tutorial-open', tutorialVisible);
  }

  function isTutorialVisible() {
    return tutorialVisible;
  }

  function applyPlaytestMode(enabled) {
    documentRef.body.classList.toggle('playtest-mode', Boolean(enabled));
    if (refs.playtestModeToggle) {
      refs.playtestModeToggle.checked = Boolean(enabled);
    }
  }

  function syncOutcome(summary) {
    if (!summary || !refs.outcomePanel) {
      return;
    }

    if (summary.phase !== 'end') {
      setToggle(toggleCache, 'outcome-hidden', refs.outcomePanel, 'hidden', true);
      setToggle(toggleCache, 'outcome-win', refs.outcomePanel, 'win', false);
      setToggle(toggleCache, 'outcome-lose', refs.outcomePanel, 'lose', false);
      if (refs.nextButton) {
        refs.nextButton.disabled = false;
      }
      setText(textCache, 'outcome-text', refs.outcomeText, 'Operation in progress');
      setText(textCache, 'outcome-reason', refs.outcomeReason, 'Charge the core before the network collapses.');
      return;
    }

    setToggle(toggleCache, 'outcome-hidden', refs.outcomePanel, 'hidden', false);

    const hasNextLevel = summary.levelIndex < summary.levelCount - 1;
    if (summary.result === 'win') {
      setToggle(toggleCache, 'outcome-win', refs.outcomePanel, 'win', true);
      setToggle(toggleCache, 'outcome-lose', refs.outcomePanel, 'lose', false);
      setText(
        textCache,
        'outcome-text',
        refs.outcomeText,
        hasNextLevel
          ? 'Protocol complete. Press Enter or click arena for next level.'
          : 'Campaign complete. Press R to replay current level.'
      );
    } else {
      setToggle(toggleCache, 'outcome-win', refs.outcomePanel, 'win', false);
      setToggle(toggleCache, 'outcome-lose', refs.outcomePanel, 'lose', true);
      setText(textCache, 'outcome-text', refs.outcomeText, 'Operation failed. Press Space/click arena to retry.');
    }

    setText(textCache, 'outcome-reason', refs.outcomeReason, summary.lastTurn.status || '');

    if (refs.nextButton) {
      refs.nextButton.disabled = !hasNextLevel || summary.result !== 'win';
    }
  }

  function syncChain(summary, trace) {
    if (!summary || !refs.chainFeedStatus || !refs.chainLogList) {
      return;
    }

    const status = summary.lastTurn && summary.lastTurn.status
      ? summary.lastTurn.status
      : 'Awaiting move...';

    setText(textCache, 'chain-status', refs.chainFeedStatus, status);

    const objectives = Array.isArray(summary.objectives) ? summary.objectives : [];
    const chainHash = JSON.stringify({
      turn: summary.turnIndex,
      result: summary.result,
      objectives,
      trace
    });

    if (chainHash === chainKey) {
      return;
    }

    chainKey = chainHash;
    refs.chainLogList.innerHTML = '';

    for (let i = 0; i < objectives.length; i += 1) {
      const row = documentRef.createElement('li');
      row.textContent = buildObjectiveLine(objectives[i]);
      refs.chainLogList.appendChild(row);
    }

    if (Array.isArray(trace) && trace.length > 0) {
      for (let i = trace.length - 1; i >= 0; i -= 1) {
        const row = documentRef.createElement('li');
        row.textContent = buildTraceLine(trace[i]);
        refs.chainLogList.appendChild(row);
      }
    } else {
      const row = documentRef.createElement('li');
      row.className = 'chain-log-empty';
      row.textContent = 'No propagation yet. Click a Power or Firewall node.';
      refs.chainLogList.appendChild(row);
    }
  }

  function syncCoach(snapshot, summary) {
    const coach = getCoachCopy(snapshot, summary);
    setText(textCache, 'coach-title', refs.coachTitle, coach.title);
    setText(textCache, 'coach-body', refs.coachBody, coach.body);
    setText(textCache, 'coach-meta', refs.coachMeta, coach.meta);
  }

  function sync({ snapshot, summary, trace }) {
    if (snapshot) {
      setText(textCache, 'hud-turn', refs.scoreLabel, `Turn: ${snapshot.turnIndex}`);
      setText(textCache, 'hud-moves', refs.shotsLabel, `Moves: ${snapshot.movesRemaining}/${snapshot.movesLimit}`);
      setText(textCache, 'hud-overload', refs.targetLabel, `Overload: ${snapshot.overload}/${snapshot.overloadLimit}`);
      setText(textCache, 'hud-level', refs.levelLabel, `Level: ${snapshot.levelId} - ${snapshot.levelName}`);
      setText(
        textCache,
        'hud-infected',
        refs.chainStatusLabel,
        `Infected: ${snapshot.infectedCount}/${snapshot.collapseLimit} | Virus: ${snapshot.virusCount}`
      );

      if (refs.levelSelect) {
        refs.levelSelect.value = String(snapshot.levelIndex);
      }
    }

    if (summary) {
      const completed = summary.objectives.filter((objective) => objective.done).length;
      setText(textCache, 'summary-result', refs.summaryResult, `Result: ${summary.result}`);
      setText(textCache, 'summary-core', refs.summaryScore, `Core charge: ${summary.coreCharge}`);
      setText(
        textCache,
        'summary-objectives',
        refs.summaryDepth,
        `Objectives: ${completed}/${summary.objectives.length}`
      );
      setText(
        textCache,
        'summary-metrics',
        refs.summaryAccuracy,
        `Moves: ${summary.movesUsed}/${summary.movesLimit} | Overload: ${summary.overload}/${summary.overloadLimit} | Exploded: ${summary.explodedCount}`
      );

      syncOutcome(summary);
      syncChain(summary, trace || []);
    }

    syncCoach(snapshot, summary);
  }

  function setTelemetryReport(text) {
    if (!refs.telemetryReportOutput) {
      return;
    }

    refs.telemetryReportOutput.textContent = text;
    refs.telemetryReportOutput.classList.remove('hidden');
  }

  function setSoundEnabled(enabled) {
    const label = enabled ? 'Sound: On' : 'Sound: Off';
    setText(textCache, 'sound-toggle', refs.soundToggleButton, label);
  }

  return {
    refs,
    sync,
    renderLevelSelect,
    setTutorialVisible,
    isTutorialVisible,
    applyPlaytestMode,
    setTelemetryReport,
    setSoundEnabled
  };
}
