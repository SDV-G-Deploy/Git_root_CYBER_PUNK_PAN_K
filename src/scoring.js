import { CONFIG } from './config.js';
import { clamp } from './physicsLite.js';

export function getAccuracy(state) {
  if (!state || state.shotsFired <= 0) {
    return 0;
  }

  return state.shotsHit / state.shotsFired;
}

export function applyNodeScore(state, nodeType, depth, modifiers) {
  const typeConfig = CONFIG.NODES.TYPES[nodeType];
  const depthBonus = depth * CONFIG.CHAIN.DEPTH_BONUS;
  const basePoints = typeConfig.score + depthBonus;
  const scoreFactor = 1 + (modifiers ? modifiers.scoreBonus : 0);
  const points = Math.round(basePoints * state.chain.multiplier * scoreFactor);

  state.score += points;
  return points;
}

export function applyMultiplierGrowth(state, modifiers) {
  const growthStep = CONFIG.CHAIN.MULTIPLIER_STEP * (1 + (modifiers ? modifiers.chainGrowthBonus : 0));
  state.chain.multiplier = clamp(
    state.chain.multiplier + growthStep,
    CONFIG.CHAIN.START_MULTIPLIER,
    CONFIG.CHAIN.MAX_MULTIPLIER
  );
}

export function finalizeLastShotReport(state, resolution) {
  const report = state.lastShotReport;

  report.scoreAfter = state.score;
  report.scoreGain = Math.max(0, state.score - report.scoreBefore);
  report.chainSteps = state.chain.steps;
  report.chainDepth = state.chain.maxDepth;
  report.pointsMissing = Math.max(0, state.targetScore - state.score);
  report.resolution = resolution;

  if (!report.hit && !report.missReason) {
    report.missReason = 'no_active_target';
  }
}

export function buildRewardPacket(state) {
  const creditsBase = Math.floor(state.score * CONFIG.REWARD.CREDIT_PER_SCORE);
  const credits = creditsBase + (state.result === 'win' ? CONFIG.REWARD.WIN_BONUS_CREDITS : 0);

  const techParts = Math.max(0, Math.floor(state.score / CONFIG.REWARD.SCORE_PER_PART));

  const moduleChanceRaw = CONFIG.REWARD.BASE_MODULE_CHANCE + state.chain.maxDepth * CONFIG.REWARD.DEPTH_MODULE_STEP;
  const moduleChance = clamp(moduleChanceRaw, 0, CONFIG.REWARD.MAX_MODULE_CHANCE);

  const tags = [];
  if (state.result === 'win') {
    tags.push('run_complete');
  }
  if (state.chain.maxDepth >= 2) {
    tags.push('deep_chain');
  }
  if (getAccuracy(state) >= 1) {
    tags.push('accurate');
  }

  return {
    credits,
    tech_parts: techParts,
    tech_module_chance: Number(moduleChance.toFixed(3)),
    performance_tags: tags
  };
}