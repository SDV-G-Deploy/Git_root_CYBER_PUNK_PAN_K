import {
  CHAIN_REASON_LABELS,
  MISS_REASON_LABELS,
  NODE_TYPE_LABELS,
  UPGRADE_DEFS
} from './config.js';

function getElement(documentRef, id) {
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

function setClass(cache, key, element, className, enabled) {
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

function formatChainReason(reason) {
  return CHAIN_REASON_LABELS[reason] || String(reason || 'trigger');
}

function formatNodeType(type) {
  return NODE_TYPE_LABELS[type] || String(type || 'node');
}

function formatMissReason(reason) {
  return MISS_REASON_LABELS[reason] || 'no active target was hit';
}

export function createUI(documentRef) {
  const refs = {
    canvas: getElement(documentRef, 'chainlab-canvas'),
    scoreLabel: getElement(documentRef, 'scoreLabel'),
    shotsLabel: getElement(documentRef, 'shotsLabel'),
    targetLabel: getElement(documentRef, 'targetLabel'),
    levelLabel: getElement(documentRef, 'levelLabel'),
    chainStatusLabel: getElement(documentRef, 'chainStatusLabel'),
    levelSelect: getElement(documentRef, 'levelSelect'),
    helpButton: getElement(documentRef, 'helpButton'),
    retryButton: getElement(documentRef, 'retryButton'),
    outcomePanel: getElement(documentRef, 'outcomePanel'),
    outcomeText: getElement(documentRef, 'outcomeText'),
    outcomeReason: getElement(documentRef, 'outcomeReason'),
    summaryRetryButton: getElement(documentRef, 'summaryRetryButton'),
    nextButton: getElement(documentRef, 'nextButton'),
    summaryResult: getElement(documentRef, 'summaryResult'),
    summaryScore: getElement(documentRef, 'summaryScore'),
    summaryDepth: getElement(documentRef, 'summaryDepth'),
    summaryAccuracy: getElement(documentRef, 'summaryAccuracy'),
    chainFeedStatus: getElement(documentRef, 'chainFeedStatus'),
    chainLogList: getElement(documentRef, 'chainLogList'),
    tutorialOverlay: getElement(documentRef, 'tutorialOverlay'),
    tutorialStartButton: getElement(documentRef, 'tutorialStartButton'),
    techPartsLabel: getElement(documentRef, 'techPartsLabel'),
    metaStatus: getElement(documentRef, 'metaStatus'),
    buyScoreBonusButton: getElement(documentRef, 'buyScoreBonusButton'),
    buyChainGrowthButton: getElement(documentRef, 'buyChainGrowthButton'),
    playtestModeToggle: getElement(documentRef, 'playtestModeToggle'),
    exportTelemetryJsonButton: getElement(documentRef, 'exportTelemetryJsonButton'),
    exportTelemetryJsonlButton: getElement(documentRef, 'exportTelemetryJsonlButton'),
    buildReportButton: getElement(documentRef, 'buildReportButton'),
    telemetryReportOutput: getElement(documentRef, 'telemetryReportOutput')
  };

  const textCache = new Map();
  const classCache = new Map();
  let tutorialVisible = false;
  let lastChainKey = '';

  function renderLevelSelect(levels, currentIndex) {
    if (!refs.levelSelect) {
      return;
    }

    refs.levelSelect.innerHTML = '';

    levels.forEach((level) => {
      const option = documentRef.createElement('option');
      option.value = String(level.index);
      option.textContent = `${level.id} (${level.difficultyTag})`;
      refs.levelSelect.appendChild(option);
    });

    refs.levelSelect.value = String(currentIndex);
  }

  function setTutorialVisible(visible) {
    tutorialVisible = Boolean(visible);
    setClass(classCache, 'tutorial-hidden', refs.tutorialOverlay, 'hidden', !tutorialVisible);
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

  function syncMetaPanel(metaState) {
    if (!metaState) {
      return;
    }

    setText(textCache, 'meta-tech-parts', refs.techPartsLabel, `Tech Parts: ${metaState.techParts}`);
    setText(textCache, 'meta-status', refs.metaStatus, metaState.lastStatus);

    if (refs.buyScoreBonusButton) {
      if (metaState.upgrades.score_bonus) {
        refs.buyScoreBonusButton.disabled = true;
        setText(textCache, 'btn-score', refs.buyScoreBonusButton, 'Owned');
      } else {
        const canBuy = metaState.techParts >= UPGRADE_DEFS.score_bonus.cost;
        refs.buyScoreBonusButton.disabled = !canBuy;
        setText(
          textCache,
          'btn-score',
          refs.buyScoreBonusButton,
          canBuy ? `Buy (-${UPGRADE_DEFS.score_bonus.cost})` : `Need ${UPGRADE_DEFS.score_bonus.cost}`
        );
      }
    }

    if (refs.buyChainGrowthButton) {
      if (metaState.upgrades.chain_growth) {
        refs.buyChainGrowthButton.disabled = true;
        setText(textCache, 'btn-chain', refs.buyChainGrowthButton, 'Owned');
      } else {
        const canBuy = metaState.techParts >= UPGRADE_DEFS.chain_growth.cost;
        refs.buyChainGrowthButton.disabled = !canBuy;
        setText(
          textCache,
          'btn-chain',
          refs.buyChainGrowthButton,
          canBuy ? `Buy (-${UPGRADE_DEFS.chain_growth.cost})` : `Need ${UPGRADE_DEFS.chain_growth.cost}`
        );
      }
    }
  }

  function syncOutcome(summary) {
    if (!summary || !refs.outcomePanel || !refs.outcomeText || !refs.nextButton) {
      return;
    }

    const report = summary.lastShotReport || null;

    if (summary.phase !== 'end') {
      setClass(classCache, 'outcome-hidden', refs.outcomePanel, 'hidden', true);
      setClass(classCache, 'outcome-win', refs.outcomePanel, 'win', false);
      setClass(classCache, 'outcome-lose', refs.outcomePanel, 'lose', false);
      refs.nextButton.disabled = false;
      setText(
        textCache,
        'outcome-reason',
        refs.outcomeReason,
        'Reach target score before shots run out.'
      );
      return;
    }

    const hasNextLevel = summary.levelIndex < summary.levelCount - 1;
    const pointsMissing = Math.max(0, summary.targetScore - summary.score);

    setClass(classCache, 'outcome-hidden', refs.outcomePanel, 'hidden', false);

    if (summary.result === 'win') {
      setClass(classCache, 'outcome-win', refs.outcomePanel, 'win', true);
      setClass(classCache, 'outcome-lose', refs.outcomePanel, 'lose', false);
      setText(
        textCache,
        'outcome-text',
        refs.outcomeText,
        hasNextLevel
          ? 'Victory: target reached. Press Enter or click arena for next level.'
          : 'Victory: campaign complete. Press R to replay level.'
      );

      const hitHint = report && report.hit ? ' Final shot connected and resolved a chain.' : '';
      setText(
        textCache,
        'outcome-reason',
        refs.outcomeReason,
        `Target ${summary.targetScore} reached with ${summary.score} score.${hitHint}`
      );
    } else {
      setClass(classCache, 'outcome-win', refs.outcomePanel, 'win', false);
      setClass(classCache, 'outcome-lose', refs.outcomePanel, 'lose', true);
      setText(
        textCache,
        'outcome-text',
        refs.outcomeText,
        'Defeat: shots exhausted. Press Space or click arena to retry.'
      );

      if (report && report.hit) {
        setText(
          textCache,
          'outcome-reason',
          refs.outcomeReason,
          `Hit confirmed, but not enough score: ${summary.score}/${summary.targetScore} (missing ${pointsMissing}).`
        );
      } else {
        const missReason = formatMissReason(report && report.missReason);
        setText(
          textCache,
          'outcome-reason',
          refs.outcomeReason,
          `Missed shot: ${missReason}. Score ${summary.score}/${summary.targetScore} (missing ${pointsMissing}).`
        );
      }
    }

    refs.nextButton.disabled = !hasNextLevel || summary.result !== 'win';
  }

  function syncChainFeed(summary, trace) {
    if (!summary || !refs.chainFeedStatus || !refs.chainLogList) {
      return;
    }

    const report = summary.lastShotReport || null;

    if (summary.phase === 'resolve') {
      setText(
        textCache,
        'chain-feed-status',
        refs.chainFeedStatus,
        `Chain resolving... step ${summary.chainSteps}, depth ${summary.chainDepth}.`
      );
    } else if (summary.phase === 'simulate') {
      setText(textCache, 'chain-feed-status', refs.chainFeedStatus, 'Projectile in flight...');
    } else if (summary.phase === 'end') {
      if (summary.chainSteps > 0) {
        setText(
          textCache,
          'chain-feed-status',
          refs.chainFeedStatus,
          `Chain ended at depth ${summary.chainDepth}.`
        );
      } else if (report && report.hit) {
        setText(
          textCache,
          'chain-feed-status',
          refs.chainFeedStatus,
          `Hit confirmed on ${report.targetNodeId || 'target'}, but no chain expansion.`
        );
      } else {
        setText(
          textCache,
          'chain-feed-status',
          refs.chainFeedStatus,
          `No chain triggered: ${formatMissReason(report && report.missReason)}.`
        );
      }
    } else if (report && report.fired && !report.hit) {
      setText(
        textCache,
        'chain-feed-status',
        refs.chainFeedStatus,
        `Last shot missed: ${formatMissReason(report.missReason)}.`
      );
    } else if (report && report.hit) {
      setText(
        textCache,
        'chain-feed-status',
        refs.chainFeedStatus,
        `Last shot hit ${report.targetNodeId || 'target'} (+${report.scoreGain}).`
      );
    } else {
      setText(textCache, 'chain-feed-status', refs.chainFeedStatus, 'Waiting for shot...');
    }

    const reportKey = report ? `${report.fired}|${report.hit}|${report.targetNodeId || ''}|${report.missReason || ''}|${report.scoreGain}` : 'none';
    const traceKey = JSON.stringify(trace || []) + `|${summary.phase}|${reportKey}`;
    if (traceKey === lastChainKey) {
      return;
    }

    lastChainKey = traceKey;
    refs.chainLogList.innerHTML = '';

    if (!Array.isArray(trace) || trace.length === 0) {
      const empty = documentRef.createElement('li');
      empty.className = 'chain-log-empty';
      if (report && report.fired && !report.hit) {
        empty.textContent = `No target activated. Reason: ${formatMissReason(report.missReason)}.`;
      } else if (report && report.hit) {
        empty.textContent = `Direct reaction on ${report.targetNodeId || 'target'}: +${report.scoreGain} points.`;
      } else {
        empty.textContent = 'Hit a node to see causal chain events.';
      }
      refs.chainLogList.appendChild(empty);
      return;
    }

    for (let i = trace.length - 1; i >= 0; i -= 1) {
      const item = trace[i];
      const source = item.sourceId === 'projectile' ? 'shot' : item.sourceId;
      const reason = formatChainReason(item.reason);
      const nodeType = formatNodeType(item.nodeType);

      const row = documentRef.createElement('li');
      row.textContent = `#${item.step} ${source} -> ${item.targetId} (${nodeType}) via ${reason}, +${item.points}`;
      refs.chainLogList.appendChild(row);
    }
  }

  function sync({ snapshot, summary, trace, metaState }) {
    if (snapshot) {
      setText(textCache, 'score', refs.scoreLabel, `Score: ${snapshot.score}`);
      setText(textCache, 'shots', refs.shotsLabel, `Shots: ${snapshot.shotsRemaining}`);
      setText(textCache, 'target', refs.targetLabel, `Target: ${snapshot.targetScore}`);
      setText(textCache, 'level', refs.levelLabel, `Level: ${snapshot.levelId}`);

      let status = 'Chain: idle';
      if (snapshot.phase === 'simulate') {
        status = 'Chain: projectile in flight';
      } else if (snapshot.phase === 'resolve') {
        status = `Chain: resolving (step ${snapshot.chainSteps})`;
      } else if (snapshot.phase === 'end') {
        status = `Chain: resolved depth ${snapshot.chainDepth}`;
      }
      setText(textCache, 'chain-status', refs.chainStatusLabel, status);

      if (refs.levelSelect) {
        refs.levelSelect.value = String(snapshot.levelIndex);
      }
    }

    if (summary) {
      const report = summary.lastShotReport || null;
      const hitStatus = report && report.fired ? (report.hit ? 'hit' : 'miss') : 'no-shot';

      setText(textCache, 'summary-result', refs.summaryResult, `Result: ${summary.result} (${hitStatus})`);
      setText(textCache, 'summary-score', refs.summaryScore, `Final Score: ${summary.score}`);
      setText(textCache, 'summary-depth', refs.summaryDepth, `Chain Depth: ${summary.chainDepth}`);
      setText(
        textCache,
        'summary-accuracy',
        refs.summaryAccuracy,
        `Accuracy: ${summary.accuracy}% (${summary.shotsHit}/${summary.shotsFired})`
      );

      syncOutcome(summary);
      syncChainFeed(summary, trace || []);
    }

    syncMetaPanel(metaState);
  }

  function setTelemetryReport(text) {
    if (!refs.telemetryReportOutput) {
      return;
    }

    refs.telemetryReportOutput.textContent = text;
    refs.telemetryReportOutput.classList.remove('hidden');
  }

  return {
    refs,
    sync,
    renderLevelSelect,
    setTutorialVisible,
    isTutorialVisible,
    applyPlaytestMode,
    setTelemetryReport
  };
}
