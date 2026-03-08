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
  const AUTO_NEXT_DELAY_MS = 900;

  const canvas = document.getElementById('chainlab-canvas');
  const scoreLabel = document.getElementById('scoreLabel');
  const shotsLabel = document.getElementById('shotsLabel');
  const targetLabel = document.getElementById('targetLabel');
  const levelLabel = document.getElementById('levelLabel');
  const levelSelect = document.getElementById('levelSelect');
  const retryButton = document.getElementById('retryButton');

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

  let pendingAutoNext = null;

  function clearAutoNext() {
    if (pendingAutoNext !== null) {
      clearTimeout(pendingAutoNext);
      pendingAutoNext = null;
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
    const summary = ChainLabGame.getRunSummary();
    if (!summary) {
      return;
    }

    summaryResult.textContent = `Result: ${summary.result}`;
    summaryScore.textContent = `Final Score: ${summary.score}`;
    summaryDepth.textContent = `Chain Depth: ${summary.chainDepth}`;
    summaryAccuracy.textContent = `Accuracy: ${summary.accuracy}%`;
  }

  function hardSync() {
    syncHud();
    syncSummary();
  }

  function restartCurrentLevel() {
    clearAutoNext();
    ChainLabGame.resetLevel();
    hardSync();
  }

  function handleRunEnd(result) {
    hardSync();

    if (result !== 'win') {
      return;
    }

    clearAutoNext();
    pendingAutoNext = setTimeout(() => {
      pendingAutoNext = null;
      const moved = ChainLabGame.nextLevel();
      if (moved) {
        hardSync();
      }
    }, AUTO_NEXT_DELAY_MS);
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
    const point = getCanvasPoint(canvas, event);
    ChainLabGame.fireShot(point.x, point.y);
    hardSync();
  });

  if (levelSelect) {
    levelSelect.addEventListener('change', (event) => {
      clearAutoNext();
      const nextIndex = Number(event.target.value);
      ChainLabGame.setLevel(nextIndex);
      hardSync();
    });
  }

  retryButton.addEventListener('click', () => {
    restartCurrentLevel();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
      restartCurrentLevel();
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