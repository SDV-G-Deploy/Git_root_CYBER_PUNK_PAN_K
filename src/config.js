export const CONFIG = Object.freeze({
  ARENA: {
    WIDTH: 960,
    HEIGHT: 540,
    BACKGROUND: '#08131d',
    BORDER: '#20445c'
  },
  UI: {
    MOBILE_BREAKPOINT: 760
  },
  INPUT: {
    TOUCH_RADIUS_BONUS: 12
  },
  NODES: {
    RADIUS: 21,
    CLICK_RADIUS: 26,
    COLORS: {
      power: '#4cd2ff',
      relay: '#7ad46f',
      splitter: '#c6ff6e',
      firewall: '#ba9cff',
      purifier: '#75f2c8',
      virus: '#ff5e7e',
      overload: '#ffb06a',
      core: '#ffd166',
      infected: '#ff82a0',
      broken: '#786f68',
      inactive: '#4a5d69',
      label: '#08131d',
      activeStroke: '#d9fbff',
      hoverStroke: '#ffffff'
    }
  },
  EDGES: {
    BASE_COLOR: '#2a4f66',
    ENABLED_COLOR: '#58b4df',
    OVERLOAD_COLOR: '#ff8a5b',
    DISABLED_ALPHA: 0.25,
    WIDTH: 3
  },
  TURN: {
    MAX_PROPAGATION_STEPS: 256,
    POWER_INJECT_POWER: 5,
    RELAY_THRESHOLD: 3,
    RELAY_EMIT_POWER: 3,
    FIREWALL_THRESHOLD: 2,
    FIREWALL_EMIT_POWER: 3,
    FIREWALL_CLICK_INJECT: 2,
    PURIFIER_THRESHOLD: 2,
    PURIFIER_EMIT_POWER: 2,
    PURIFIER_CLEANSE_POWER: 1,
    OVERLOAD_NODE_THRESHOLD: 5,
    OVERLOAD_NODE_EMIT_POWER: 4,
    OVERLOAD_EXPLOSION_PENALTY: 2,
    DECAY_PER_TURN: 1,
    VIRUS_SPREAD_PER_TURN: 1,
    CORRUPTION_THRESHOLD: 2,
    CORRUPTION_ABSORB_FACTOR: 0.5,
    CLEANSE_THRESHOLD: 2
  },
  SCORING: {
    CLEAR_BONUS: 1000,
    EFFICIENCY_PER_UNUSED_MOVE: 175,
    OVERLOAD_HEADROOM_BONUS: 45,
    CLEAN_NETWORK_BONUS: 250,
    FAILURE_FLOOR: 100,
    STRONG_OVERLOAD_RATIO: 0.5,
    PERFECT_UNUSED_MOVES: 2
  },
  HINT: {
    MAX_TIER: 3
  },
  FEEDBACK: {
    PACKET_SPEED: 0.18,
    PACKET_RADIUS: 4,
    PACKET_TTL: 0.5,
    FLASH_TTL: 0.18,
    FLASH_ALPHA: 0.35,
    DANGER_FLASH_TTL: 0.3,
    DANGER_FLASH_ALPHA: 0.42,
    SHAKE_TTL: 0.22,
    SHAKE_MAGNITUDE: 8,
    PULSE_TTL: 0.22,
    PULSE_SCALE: 18,
    EDGE_BURST_TTL: 0.32,
    EDGE_BURST_WIDTH: 7,
    NODE_BURST_TTL: 0.26,
    NODE_BURST_SCALE: 14,
    PACKET_TRAIL_ALPHA: 0.4,
    MAX_PULSES: 18,
    MAX_EDGE_BURSTS: 24,
    MAX_NODE_BURSTS: 24,
    TRACE_MAX: 24,
    MISS_MARKER_TTL: 0.5,
    MISS_MARKER_SIZE: 16
  },
  SOUND: {
    MASTER_GAIN: 0.18,
    FLOW_DEBOUNCE_MS: 60
  },
  SAVE: {
    KEY: 'signal_district_chainlab_save',
    VERSION: 1
  },
  TELEMETRY: {
    MAX_LOG_ENTRIES: 5000,
    LIFECYCLE_VERSION: 2,
    EPOCH: 'post_lifecycle_fix_2026_03_10'
  }
});

export const OBJECTIVE_TYPES = Object.freeze({
  POWER_CORE: 'power_core',
  ACTIVATE_ALL: 'activate_all',
  CLEAN_CORRUPTION: 'clean_corruption'
});

export const NODE_TYPES = Object.freeze({
  POWER: 'power',
  RELAY: 'relay',
  SPLITTER: 'splitter',
  FIREWALL: 'firewall',
  PURIFIER: 'purifier',
  VIRUS: 'virus',
  OVERLOAD: 'overload',
  CORE: 'core',
  INFECTED: 'infected'
});

export const PLAYTEST_MODE_KEY = 'signal_district_chainlab_playtest_mode';
export const TUTORIAL_SEEN_KEY = 'signal_district_chainlab_tutorial_seen';
