export const CONFIG = Object.freeze({
  ARENA: {
    WIDTH: 960,
    HEIGHT: 540,
    BACKGROUND: '#0c1f2b',
    BORDER: '#26465a'
  },
  SHOOTER: {
    X: 100,
    Y: 270,
    RADIUS: 10,
    COLOR: '#9be7ff'
  },
  PROJECTILE: {
    SPEED: 620,
    RADIUS: 7,
    DRAG_PER_SECOND: 0.18,
    MIN_SPEED: 24,
    MAX_LIFETIME: 2.8,
    COLOR: '#ffd75e'
  },
  NODES: {
    RADIUS: 20,
    RESOLVED_COLOR: '#3a4751',
    TYPES: {
      bomb: {
        color: '#ff5d73',
        label: 'B',
        score: 110
      },
      pusher: {
        color: '#5cc8ff',
        label: 'P',
        score: 100
      },
      multiplier: {
        color: '#9bff8a',
        label: 'M',
        score: 95
      }
    }
  },
  DEFAULT_LEVEL: {
    id: 'L01',
    shotsLimit: 1,
    targetScore: 120,
    difficultyTag: 'light',
    nodes: [
      { id: 'n1', type: 'bomb', x: 560, y: 180 },
      { id: 'n2', type: 'multiplier', x: 680, y: 260 },
      { id: 'n3', type: 'pusher', x: 760, y: 320 }
    ]
  },
  TRAJECTORY: {
    STEPS: 36,
    STEP_TIME: 0.05,
    WIDTH: 2,
    DASH_PATTERN: [7, 7],
    COLOR: '#b5f3ff'
  },
  CHAIN: {
    MAX_QUEUE_SIZE: 256,
    MAX_STEPS: 96,
    RESOLVE_BATCH_SIZE: 10,
    BOMB_RADIUS: 150,
    PUSHER_RADIUS: 130,
    PUSHER_FORCE: 42,
    MULTIPLIER_STEP: 1,
    MAX_MULTIPLIER: 6,
    DEPTH_BONUS: 12,
    START_MULTIPLIER: 1,
    TRACE_MAX: 12
  },
  RUN: {
    WIN_TEXT: 'Target reached. Continue to next level.',
    LOSE_TEXT: 'Shots depleted. Retry current level.',
    WIN_COLOR: '#8dffba',
    LOSE_COLOR: '#ff9fa9',
    LABEL_X: 245,
    LABEL_Y: 40,
    LABEL_FONT: 'bold 20px monospace'
  },
  REWARD: {
    CREDIT_PER_SCORE: 0.12,
    WIN_BONUS_CREDITS: 25,
    SCORE_PER_PART: 140,
    BASE_MODULE_CHANCE: 0.05,
    DEPTH_MODULE_STEP: 0.05,
    MAX_MODULE_CHANCE: 0.8
  },
  MODIFIERS: {
    SCORE_BONUS_MIN: 0,
    SCORE_BONUS_MAX: 0.5,
    CHAIN_GROWTH_MIN: 0,
    CHAIN_GROWTH_MAX: 0.25
  },
  VISUAL: {
    MAX_CHAIN_LINKS: 16,
    CHAIN_LINK_TTL: 0.7,
    CHAIN_LINK_WIDTH: 2,
    CHAIN_LINK_COLOR: '#ffe082',
    HIT_FLASH_TTL: 0.22,
    HIT_FLASH_MAX_ALPHA: 0.42,
    SCREEN_SHAKE_TTL: 0.18,
    SCREEN_SHAKE_POWER: 7,
    PARTICLE_TTL: 0.55,
    PARTICLE_DRAG_PER_SECOND: 1.7,
    PARTICLE_SPEED_MIN: 65,
    PARTICLE_SPEED_MAX: 210,
    PARTICLE_RADIUS: 2.5,
    PARTICLE_COUNT_MIN: 8,
    PARTICLE_COUNT_MAX: 14,
    CHAIN_CUE_TTL: 0.75,
    CHAIN_CUE_FONT: 'bold 14px monospace',
    CHAIN_CUE_COLOR: '#fff4bc',
    TRAJECTORY_UNDERLAY_WIDTH: 5,
    TRAJECTORY_UNDERLAY_COLOR: 'rgba(181, 243, 255, 0.26)',
    TRAJECTORY_DOT_RADIUS: 2,
    TRAJECTORY_DOT_STEP: 4,
    AIM_END_RADIUS: 8,
    AIM_END_COLOR: '#d8f6ff'
  },
  LABEL: {
    FONT: 'bold 12px monospace',
    COLOR: '#0c1f2b'
  },
  SIMULATION: {
    FIXED_DT: 1 / 120,
    MAX_DT: 0.25,
    MAX_STEPS: 12,
    MS_THRESHOLD: 10
  },
  TELEMETRY: {
    MAX_LOG_ENTRIES: 5000
  },
  EPSILON: 0.0001
});

export const NODE_TYPE_LABELS = Object.freeze({
  bomb: 'Bomb',
  pusher: 'Pusher',
  multiplier: 'Multiplier'
});

export const CHAIN_REASON_LABELS = Object.freeze({
  direct_hit: 'direct hit',
  bomb_aoe: 'bomb AOE',
  pusher_impulse: 'pusher impulse'
});

export const MISS_REASON_LABELS = Object.freeze({
  out_of_bounds: 'projectile left arena bounds',
  max_lifetime: 'projectile expired before contact',
  speed_drop: 'projectile slowed down before contact',
  no_active_target: 'no active target was hit'
});

export const META_SAVE_KEY = 'signal_district_chainlab_meta_v1';
export const META_SAVE_VERSION = 1;
export const PLAYTEST_MODE_KEY = 'signal_district_chainlab_playtest_mode';
export const TUTORIAL_SEEN_KEY = 'signal_district_chainlab_tutorial_seen';

export const UPGRADE_DEFS = Object.freeze({
  score_bonus: {
    cost: 8,
    label: '+5% score bonus',
    scoreBonus: 0.05,
    chainGrowthBonus: 0
  },
  chain_growth: {
    cost: 10,
    label: '+1% chain growth',
    scoreBonus: 0,
    chainGrowthBonus: 0.01
  }
});