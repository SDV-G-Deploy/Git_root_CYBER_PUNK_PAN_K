import { getCanvasPoint } from './physicsLite.js';

export function createInputController(options) {
  const {
    windowRef,
    ui,
    enqueueCommand,
    getSummary,
    onQuickAction,
    onRetry,
    onNextLevel,
    onHelpToggle,
    onTutorialDismiss,
    onUserGesture
  } = options;

  const handleUserGesture = typeof onUserGesture === 'function' ? onUserGesture : () => {};
  const canvas = ui.refs.canvas;
  if (!canvas) {
    throw new Error('Canvas #chainlab-canvas not found.');
  }

  canvas.addEventListener('pointerdown', () => {
    handleUserGesture();
  });

  canvas.addEventListener('mousemove', (event) => {
    if (ui.isTutorialVisible()) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    enqueueCommand({
      type: 'aim',
      x: point.x,
      y: point.y,
      active: true
    });
  });

  canvas.addEventListener('mouseleave', () => {
    if (ui.isTutorialVisible()) {
      return;
    }

    enqueueCommand({
      type: 'aim',
      x: 0,
      y: 0,
      active: false
    });
  });

  canvas.addEventListener('click', (event) => {
    handleUserGesture();

    if (ui.isTutorialVisible()) {
      return;
    }

    if (onQuickAction()) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    enqueueCommand({
      type: 'fire',
      targetX: point.x,
      targetY: point.y
    });
  });

  if (ui.refs.helpButton) {
    ui.refs.helpButton.addEventListener('click', () => {
      handleUserGesture();
      onHelpToggle();
    });
  }

  if (ui.refs.tutorialStartButton) {
    ui.refs.tutorialStartButton.addEventListener('click', () => {
      handleUserGesture();
      onTutorialDismiss();
    });
  }

  if (ui.refs.tutorialOverlay) {
    ui.refs.tutorialOverlay.addEventListener('click', (event) => {
      if (event.target === ui.refs.tutorialOverlay) {
        handleUserGesture();
        onTutorialDismiss();
      }
    });
  }

  windowRef.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    handleUserGesture();

    if (ui.isTutorialVisible()) {
      if (key === 'escape' || key === 'enter' || key === ' ') {
        event.preventDefault();
        onTutorialDismiss();
      }
      return;
    }

    if (key === 'r') {
      onRetry('hotkey_retry', true);
      return;
    }

    if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      onQuickAction();
      return;
    }

    if (key === 'enter') {
      const summary = getSummary();
      if (summary && summary.phase === 'end' && summary.result === 'win') {
        onNextLevel();
      }
    }
  });
}
