'use strict';

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
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

  if (!canvas) {
    throw new Error('Canvas #chainlab-canvas not found.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D context from canvas.');
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

  function handleRunEnd() {
    hardSync();
  }

  ChainLabGame.initGame(canvas, { onRunEnd: handleRunEnd });
  renderLevelSelect();

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