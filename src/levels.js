import { CONFIG } from './config.js';
import { clamp } from './physicsLite.js';

export function normalizeLevelNode(node, idx) {
  const type = Object.prototype.hasOwnProperty.call(CONFIG.NODES.TYPES, node.type)
    ? node.type
    : 'bomb';

  return {
    id: String(node.id || `n${idx + 1}`),
    type,
    x: Number(node.x) || 500,
    y: Number(node.y) || 250
  };
}

export function normalizeLevel(level, idx) {
  const fallbackId = `L${String(idx + 1).padStart(2, '0')}`;
  const rawNodes = Array.isArray(level.nodes) ? level.nodes : [];

  return {
    id: String(level.id || fallbackId),
    shotsLimit: Math.max(1, Number(level.shotsLimit) || 1),
    targetScore: Math.max(0, Number(level.targetScore) || 0),
    difficultyTag: String(level.difficultyTag || 'light'),
    nodes: rawNodes.map((node, nodeIdx) => normalizeLevelNode(node, nodeIdx))
  };
}

export function loadLevels(levelsOverride) {
  const globalLevels =
    typeof window !== 'undefined' && Array.isArray(window.CHAIN_LAB_LEVELS)
      ? window.CHAIN_LAB_LEVELS
      : [CONFIG.DEFAULT_LEVEL];

  const source = Array.isArray(levelsOverride) && levelsOverride.length > 0
    ? levelsOverride
    : globalLevels;

  const levels = source.map((level, index) => normalizeLevel(level, index));
  if (levels.length === 0) {
    return [normalizeLevel(CONFIG.DEFAULT_LEVEL, 0)];
  }

  return levels;
}

export function clampLevelIndex(index, levels) {
  const maxIndex = Math.max(0, levels.length - 1);
  return clamp(index, 0, maxIndex);
}