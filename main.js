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

  ChainLabGame.initGame(canvas);

  function syncHud() {
    const snapshot = ChainLabGame.getSnapshot();
    if (!snapshot) {
      return;
    }

    scoreLabel.textContent = `Score: ${snapshot.score}`;
    shotsLabel.textContent = `Shots: ${snapshot.shotsRemaining}`;
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

  function doRetry() {
    ChainLabGame.resetLevel();
    syncHud();
    syncSummary();
  }

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
    syncHud();
    syncSummary();
  });

  retryButton.addEventListener('click', () => {
    doRetry();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
      doRetry();
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
    syncHud();
    syncSummary();

    requestAnimationFrame(frame);
  }

  syncHud();
  syncSummary();
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', bootstrap);
