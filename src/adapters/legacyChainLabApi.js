import { createChainLabEngine } from '../engine.js';

const engine = createChainLabEngine();

export const legacyChainLabApi = {
  CONFIG: engine.CONFIG,
  initGame: (...args) => engine.initGame(...args),
  resetLevel: (...args) => engine.resetLevel(...args),
  setLevel: (...args) => engine.setLevel(...args),
  nextLevel: (...args) => engine.nextLevel(...args),
  setModifiers: (...args) => engine.setModifiers(...args),
  getModifiers: (...args) => engine.getModifiers(...args),
  setAim: (...args) => engine.setAim(...args),
  fireShot: (...args) => engine.fireShot(...args),
  requestHint: (...args) => engine.requestHint(...args),
  tick: (...args) => engine.tick(...args),
  update: (...args) => engine.update(...args),
  render: (...args) => engine.render(...args),
  getSnapshot: (...args) => engine.getSnapshot(...args),
  getChainTrace: (...args) => engine.getChainTrace(...args),
  getLastShotReport: (...args) => engine.getLastShotReport(...args),
  getRunSummary: (...args) => engine.getRunSummary(...args),
  getLevelList: (...args) => engine.getLevelList(...args),
  getCurrentLevelIndex: (...args) => engine.getCurrentLevelIndex(...args),
  buildRewardPacket: (...args) => engine.buildRewardPacket(...args),
  trackEvent: (...args) => engine.trackEvent(...args),
  exportTelemetry: (...args) => engine.exportTelemetry(...args)
};

if (typeof window !== 'undefined') {
  window.ChainLabGame = legacyChainLabApi;
}

export default legacyChainLabApi;