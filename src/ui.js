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
    if (entry.detail.startsWith('firewall_open_m')) {
      const mode = entry.detail.replace('firewall_open_m', '');
      return `#${entry.step} ${entry.toNodeId}: firewall mode ${mode} opened`;
    }

    if (entry.detail === 'firewall_closed') {
      return `#${entry.step} ${entry.toNodeId}: firewall locked`;
    }

    if (entry.detail.startsWith('breaker_primed_cap')) {
      const cap = entry.detail.replace('breaker_primed_cap', '');
      return `#${entry.step} ${entry.toNodeId}: breaker primed (cap ${cap})`;
    }

    if (entry.detail.startsWith('breaker_armed_cap')) {
      const cap = entry.detail.replace('breaker_armed_cap', '');
      return `#${entry.step} ${entry.toNodeId}: breaker armed (cap ${cap})`;
    }

    if (entry.detail.startsWith('breaker_dissipate_')) {
      const amount = entry.detail.replace('breaker_dissipate_', '');
      return `#${entry.step} ${entry.toNodeId}: breaker dissipated ${amount}`;
    }

    if (entry.detail === 'flow_cleanse') {
      return `#${entry.step} ${entry.toNodeId}: cleansed by direct flow`;
    }

    if (entry.detail === 'virus_corruption') {
      return `#${entry.step} ${entry.toNodeId}: infected by virus spread`;
    }

    return `#${entry.step} ${entry.toNodeId}: ${entry.detail}`;
  }

  const source = entry.fromNodeId || 'unknown';
  const edge = entry.edgeId ? ` via ${entry.edgeId}` : '';
  return `#${entry.step} ${source} -> ${entry.toNodeId}${edge}, +${entry.energyAccepted}`;
}

function formatRankLabel(rank) {
  if (rank === 'perfect') {
    return 'Perfect';
  }

  if (rank === 'strong') {
    return 'Strong';
  }

  if (rank === 'clear') {
    return 'Clear';
  }

  if (rank === 'failed') {
    return 'Failed';
  }

  return 'Pending';
}

function formatStateLabel(summary) {
  if (!summary) {
    return 'Booting';
  }

  if (summary.phase === 'end') {
    return summary.result === 'win' ? 'Run Complete' : 'Run Failed';
  }

  if (summary.phase === 'resolving') {
    return 'Resolving';
  }

  return 'Awaiting Input';
}

function buildRankReason(summary) {
  if (!summary || summary.phase !== 'end') {
    return 'Complete the objectives to lock in a final score and rank.';
  }

  if (summary.rank === 'perfect') {
    return 'Perfect: no exploded nodes, no infection left, and at least 2 unused moves.';
  }

  if (summary.rank === 'strong') {
    return 'Strong: you won with efficient routing or controlled overload usage.';
  }

  if (summary.rank === 'clear') {
    return 'Clear: objectives complete, but there is room to improve efficiency or control.';
  }

  return 'Failed: retry with a safer route, fewer overload spikes, or faster containment.';
}

function buildBonusLines(summary) {
  if (!summary || !summary.scoreBreakdown) {
    return [];
  }

  const breakdown = summary.scoreBreakdown;
  return [
    `Clear bonus: ${breakdown.clearBonus}`,
    `Efficiency bonus: ${breakdown.efficiencyBonus}`,
    `Overload control bonus: ${breakdown.overloadControlBonus}`,
    `Clean network bonus: ${breakdown.cleanNetworkBonus}`,
    `Failure floor: ${breakdown.failureFloor}`
  ];
}

function formatObjectiveTag(type) {
  if (type === 'power_core') {
    return 'CORE';
  }

  if (type === 'activate_all') {
    return 'GRID';
  }

  if (type === 'clean_corruption') {
    return 'CLEAN';
  }

  return 'MIX';
}

function buildLevelObjectiveTags(level) {
  if (!Array.isArray(level?.objectiveTypes) || level.objectiveTypes.length === 0) {
    return 'CORE';
  }

  const tags = [];
  for (let i = 0; i < level.objectiveTypes.length; i += 1) {
    const tag = formatObjectiveTag(level.objectiveTypes[i]);
    if (tags.indexOf(tag) < 0) {
      tags.push(tag);
    }
  }

  return tags.join('+');
}
function buildLevelOptionLabel(level) {
  const prefix = level.locked
    ? '[LOCKED]'
    : level.perfect
      ? '[PERFECT]'
      : level.completed
        ? '[CLEAR]'
        : '[OPEN]';
  const score = level.bestScore > 0 ? ` | ${level.bestScore}` : '';
  const objectiveTags = buildLevelObjectiveTags(level);
  return `${prefix} ${level.id} ${level.name} [${objectiveTags}]${score}`;
}

function buildHintTargetText(hint) {
  if (!hint || !hint.targetNodeId) {
    return 'none';
  }

  if (hint.secondaryNodeId) {
    return `${hint.targetNodeId} -> ${hint.secondaryNodeId}`;
  }

  return hint.targetNodeId;
}

function formatObjectiveTypeLabel(type) {
  if (type === 'power_core') {
    return 'Charge Core';
  }

  if (type === 'activate_all') {
    return 'Activate Network';
  }

  if (type === 'clean_corruption') {
    return 'Clear Infection';
  }

  return 'Unknown';
}

function buildObjectiveTypeText(summary) {
  if (!summary || !Array.isArray(summary.objectives) || summary.objectives.length === 0) {
    return 'Objective Type: pending';
  }

  const labels = [];
  for (let i = 0; i < summary.objectives.length; i += 1) {
    const label = formatObjectiveTypeLabel(summary.objectives[i].type);
    if (labels.indexOf(label) < 0) {
      labels.push(label);
    }
  }

  return `Objective Type: ${labels.join(' + ')}`;
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
      body: 'Complete the active level objectives to stabilize the district grid.',
      meta: 'Desktop: hover nodes to inspect roles. Touch: use Hint before committing taps.'
    };
  }

  if (summary.phase === 'end') {
    return {
      title: summary.result === 'win' ? 'Run Complete' : 'Run Failed',
      body: summary.lastTurn.status || 'Operation complete.',
      meta: `Score ${summary.totalScore} | Rank ${formatRankLabel(summary.rank)} | ${buildRankReason(summary)}`
    };
  }

  if (summary.lastAction && !summary.lastAction.valid) {
    if (summary.lastAction.reason === 'no_target') {
      return {
        title: 'No target selected',
        body: 'Clicks only count on Power, Firewall, and Breaker nodes.',
        meta: 'Aim near a node first on desktop, or use Hint on touch. Clickable nodes glow brighter.'
      };
    }

    if (summary.lastAction.reason === 'node_not_clickable') {
      return {
        title: 'That node is passive',
        body: 'Relay, Splitter, Purifier, Overload, Virus, and Core nodes react automatically.',
        meta: 'Use Power to inject, Firewall to route, and Breaker to prime a safety cap.'
      };
    }
  }

  if (summary.turnIndex === 0) {
    return {
      title: 'Primary Objective',
      body: summary.nextObjectiveText || 'Complete the listed objectives.',
      meta: summary.teachingGoal || 'Open with Power, route with Firewall, and prime Breakers before risky overload turns.'
    };
  }

  if (summary.lastTurn && summary.lastTurn.explodedNodes && summary.lastTurn.explodedNodes.length > 0) {
    return {
      title: 'Overload Detected',
      body: 'Too much energy passed through an overload node in one turn.',
      meta: 'Split the route, reduce feed, or open another firewall branch.'
    };
  }

  if (summary.lastTurn && summary.lastTurn.breakerDissipation && summary.lastTurn.breakerDissipation.length > 0) {
    const totalDissipated = summary.lastTurn.breakerDissipation
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    return {
      title: 'Breaker Dissipation',
      body: 'A primed breaker capped throughput and safely vented excess energy this turn.',
      meta: `Dissipated: ${totalDissipated} | Breakers trade peak output for safer routing.`
    };
  }

  if (summary.lastTurn && summary.lastTurn.purifiedNodes && summary.lastTurn.purifiedNodes.length > 0) {
    return {
      title: 'Purifier Pulse',
      body: 'Powered purifier nodes reduced local corruption pressure this turn.',
      meta: `Purified: ${summary.lastTurn.purifiedNodes.join(', ')} | Keep purifier lanes energized to stabilize routes.`
    };
  }

  if (summary.lastTurn && summary.lastTurn.cleansedNodes && summary.lastTurn.cleansedNodes.length > 0) {
    const purifiedNodes = Array.isArray(summary.lastTurn.purifiedNodes) ? summary.lastTurn.purifiedNodes : [];
    const directCleansed = summary.lastTurn.cleansedNodes
      .filter((nodeId) => purifiedNodes.indexOf(nodeId) < 0);

    if (directCleansed.length > 0) {
      return {
        title: 'Flow Cleanse',
        body: 'Direct energy flow removed corruption from charged nodes this turn.',
        meta: `Cleansed by flow: ${directCleansed.join(', ')} | Hover nodes to track Corruption progress (X/2).`
      };
    }
  }

  if (summary.lastTurn && summary.lastTurn.corruptionNew && summary.lastTurn.corruptionNew.length > 0) {
    return {
      title: 'Virus Spread',
      body: 'Infection advanced into adjacent nodes after the turn resolved.',
      meta: 'Push energy toward objectives quickly, or avoid feeding infected branches.'
    };
  }

  return {
    title: 'Next Move',
    body: summary.nextObjectiveText || 'Complete the listed objectives.',
    meta: `Par ${summary.parScore} | Desktop hover shows node details. On touch, use Hint and watch neon pulses for flow.`
  };
}

export function createUI(documentRef) {
  const refs = {
    canvas: getEl(documentRef, 'chainlab-canvas'),
    scoreLabel: getEl(documentRef, 'scoreLabel'),
    shotsLabel: getEl(documentRef, 'shotsLabel'),
    targetLabel: getEl(documentRef, 'targetLabel'),
    objectiveLabel: getEl(documentRef, 'objectiveLabel'),
    levelLabel: getEl(documentRef, 'levelLabel'),
    chainStatusLabel: getEl(documentRef, 'chainStatusLabel'),
    campaignStatusLabel: getEl(documentRef, 'campaignStatusLabel'),
    levelSelect: getEl(documentRef, 'levelSelect'),
    helpButton: getEl(documentRef, 'helpButton'),
    retryButton: getEl(documentRef, 'retryButton'),
    hintButton: getEl(documentRef, 'hintButton'),
    soundToggleButton: getEl(documentRef, 'soundToggleButton'),
    coachTitle: getEl(documentRef, 'coachTitle'),
    coachBody: getEl(documentRef, 'coachBody'),
    coachMeta: getEl(documentRef, 'coachMeta'),
    hintTierLabel: getEl(documentRef, 'hintTierLabel'),
    hintTargetLabel: getEl(documentRef, 'hintTargetLabel'),
    hintMessage: getEl(documentRef, 'hintMessage'),
    outcomePanel: getEl(documentRef, 'outcomePanel'),
    outcomeText: getEl(documentRef, 'outcomeText'),
    outcomeReason: getEl(documentRef, 'outcomeReason'),
    outcomeRank: getEl(documentRef, 'outcomeRank'),
    outcomeScoreTotal: getEl(documentRef, 'outcomeScoreTotal'),
    outcomeObjectives: getEl(documentRef, 'outcomeObjectives'),
    outcomeMoves: getEl(documentRef, 'outcomeMoves'),
    outcomeOverload: getEl(documentRef, 'outcomeOverload'),
    outcomeExploded: getEl(documentRef, 'outcomeExploded'),
    outcomeRankReason: getEl(documentRef, 'outcomeRankReason'),
    outcomeBonusList: getEl(documentRef, 'outcomeBonusList'),
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
  let levelSelectKey = '';
  let bonusListKey = '';

  function renderLevelSelect(levels, currentIndex) {
    if (!refs.levelSelect) {
      return;
    }

    const nextKey = JSON.stringify({ levels, currentIndex });
    if (nextKey === levelSelectKey) {
      refs.levelSelect.value = String(currentIndex);
      return;
    }

    levelSelectKey = nextKey;
    refs.levelSelect.innerHTML = '';
    levels.forEach((level) => {
      const option = documentRef.createElement('option');
      option.value = String(level.index);
      option.textContent = buildLevelOptionLabel(level);
      option.disabled = Boolean(level.locked);
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

  function setCampaignStatus(status) {
    if (!refs.campaignStatusLabel) {
      return;
    }

    if (!status || !Number.isFinite(status.total)) {
      setText(textCache, 'campaign-status', refs.campaignStatusLabel, 'Campaign: loading...');
      return;
    }

    setText(
      textCache,
      'campaign-status',
      refs.campaignStatusLabel,
      `Campaign: ${status.total} authored (${status.chapters} chapters) | unlocked ${status.unlocked}/${status.total} | cleared ${status.completed} | perfect ${status.perfect}`
    );
  }

  function renderOutcomeBonusList(summary) {
    if (!refs.outcomeBonusList) {
      return;
    }

    const bonusLines = buildBonusLines(summary);
    const nextKey = JSON.stringify(bonusLines);
    if (nextKey === bonusListKey) {
      return;
    }

    bonusListKey = nextKey;
    refs.outcomeBonusList.innerHTML = '';

    for (let i = 0; i < bonusLines.length; i += 1) {
      const item = documentRef.createElement('li');
      item.textContent = bonusLines[i];
      refs.outcomeBonusList.appendChild(item);
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
          ? 'Protocol complete. Continue to the next sector when ready.'
          : 'Protocol complete. Final sector cleared.'
      );
    } else {
      setToggle(toggleCache, 'outcome-win', refs.outcomePanel, 'win', false);
      setToggle(toggleCache, 'outcome-lose', refs.outcomePanel, 'lose', true);
      setText(textCache, 'outcome-text', refs.outcomeText, 'Operation failed. Retry the current route.');
    }

    setText(textCache, 'outcome-reason', refs.outcomeReason, summary.lastTurn.status || '');
    setText(textCache, 'outcome-rank', refs.outcomeRank, `Rank: ${formatRankLabel(summary.rank)}`);
    setText(textCache, 'outcome-score-total', refs.outcomeScoreTotal, `Total score: ${summary.totalScore}`);
    setText(
      textCache,
      'outcome-objectives',
      refs.outcomeObjectives,
      `Objectives: ${summary.objectivesCompleted}/${summary.objectivesTotal}`
    );
    setText(
      textCache,
      'outcome-moves',
      refs.outcomeMoves,
      `Moves used: ${summary.movesUsed} | Moves left: ${summary.movesRemaining}`
    );
    setText(
      textCache,
      'outcome-overload',
      refs.outcomeOverload,
      `Overload: ${summary.overload}/${summary.overloadLimit}`
    );
    setText(
      textCache,
      'outcome-exploded',
      refs.outcomeExploded,
      `Exploded nodes: ${summary.explodedCount}`
    );
    setText(textCache, 'outcome-rank-reason', refs.outcomeRankReason, buildRankReason(summary));
    renderOutcomeBonusList(summary);

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
      revision: summary.revision,
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
      row.textContent = 'No propagation yet. Tap or click a Power, Firewall, or Breaker node.';
      refs.chainLogList.appendChild(row);
    }
  }

  function syncCoach(snapshot, summary) {
    const coach = getCoachCopy(snapshot, summary);
    setText(textCache, 'coach-title', refs.coachTitle, coach.title);
    setText(textCache, 'coach-body', refs.coachBody, coach.body);
    setText(textCache, 'coach-meta', refs.coachMeta, coach.meta);
  }

  function syncHint(snapshot) {
    if (!snapshot) {
      return;
    }

    const hint = snapshot.hint || null;
    const maxTier = 3;
    const tierShown = hint && Number.isFinite(hint.tierShown) ? Math.max(0, hint.tierShown) : 0;
    const nextTier = Math.min(maxTier, Math.max(1, tierShown + 1));

    setText(textCache, 'hint-tier', refs.hintTierLabel, `Hint tier: ${tierShown}/${maxTier}`);
    setText(textCache, 'hint-target', refs.hintTargetLabel, `Focus: ${buildHintTargetText(hint)}`);
    setText(
      textCache,
      'hint-message',
      refs.hintMessage,
      hint && typeof hint.message === 'string' && hint.message.trim().length > 0
        ? hint.message
        : 'Stuck? Press Hint for a tactical nudge.'
    );

    if (refs.hintButton) {
      refs.hintButton.disabled = snapshot.phase === 'end';
      setText(
        textCache,
        'hint-button',
        refs.hintButton,
        snapshot.phase === 'end' ? 'Hint' : `Hint (${nextTier}/3)`
      );
    }
  }

  function sync({ snapshot, summary, trace }) {
    if (snapshot) {
      setText(textCache, 'hud-turn', refs.scoreLabel, `Turn: ${snapshot.turnIndex}`);
      setText(textCache, 'hud-moves', refs.shotsLabel, `Moves: ${snapshot.movesRemaining}/${snapshot.movesLimit}`);
      setText(textCache, 'hud-overload', refs.targetLabel, `Overload: ${snapshot.overload}/${snapshot.overloadLimit}`);
      setText(
        textCache,
        'hud-level',
        refs.levelLabel,
        `Level ${snapshot.levelIndex + 1}/${snapshot.levelCount}: ${snapshot.levelId} - ${snapshot.levelName} | ${snapshot.chapter}`
      );
      setText(
        textCache,
        'hud-infected',
        refs.chainStatusLabel,
        `Infected: ${snapshot.infectedCount}/${snapshot.collapseLimit} | Threatened: ${snapshot.virusThreatCount || 0} | Virus: ${snapshot.virusCount}`
      );

      if (refs.levelSelect) {
        refs.levelSelect.value = String(snapshot.levelIndex);
      }
    }

    if (summary) {
      setText(
        textCache,
        'hud-objective-type',
        refs.objectiveLabel,
        buildObjectiveTypeText(summary)
      );
      setText(
        textCache,
        'summary-result',
        refs.summaryResult,
        `State: ${formatStateLabel(summary)} | Rank: ${formatRankLabel(summary.rank)}`
      );
      setText(
        textCache,
        'summary-score',
        refs.summaryScore,
        `Score: ${summary.totalScore} | Par: ${summary.parScore}`
      );
      setText(
        textCache,
        'summary-objectives',
        refs.summaryDepth,
        `Objectives: ${summary.objectivesCompleted}/${summary.objectivesTotal} | Next: ${summary.nextObjectiveText}`
      );
      setText(
        textCache,
        'summary-metrics',
        refs.summaryAccuracy,
        `Moves left: ${summary.movesRemaining}/${summary.movesLimit} | Overload: ${summary.overload}/${summary.overloadLimit} | Exploded: ${summary.explodedCount}`
      );

      syncOutcome(summary);
      syncChain(summary, trace || []);
    }

    syncHint(snapshot);
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
    setSoundEnabled,
    setCampaignStatus
  };
}

