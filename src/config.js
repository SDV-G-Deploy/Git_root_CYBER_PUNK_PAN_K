export const CONFIG = Object.freeze({
  ARENA: {
    WIDTH: 960,
    HEIGHT: 540,
    BACKGROUND: '#08131d',
    BORDER: '#20445c'
  },
  NODES: {
    RADIUS: 21,
    CLICK_RADIUS: 26,
    COLORS: {
      power: '#4cd2ff',
      relay: '#7ad46f',
      firewall: '#ba9cff',
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
    OVERLOAD_NODE_THRESHOLD: 5,
    OVERLOAD_NODE_EMIT_POWER: 4,
    OVERLOAD_EXPLOSION_PENALTY: 2,
    DECAY_PER_TURN: 1,
    VIRUS_SPREAD_PER_TURN: 1,
    CORRUPTION_THRESHOLD: 2,
    CORRUPTION_ABSORB_FACTOR: 0.5,
    CLEANSE_THRESHOLD: 4
  },
  FEEDBACK: {
    PACKET_SPEED: 0.18,
    PACKET_RADIUS: 4,
    PACKET_TTL: 0.5,
    FLASH_TTL: 0.18,
    FLASH_ALPHA: 0.35,
    TRACE_MAX: 24
  },
  TELEMETRY: {
    MAX_LOG_ENTRIES: 5000
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
  FIREWALL: 'firewall',
  VIRUS: 'virus',
  OVERLOAD: 'overload',
  CORE: 'core',
  INFECTED: 'infected'
});

export const PLAYTEST_MODE_KEY = 'signal_district_chainlab_playtest_mode';
export const TUTORIAL_SEEN_KEY = 'signal_district_chainlab_tutorial_seen';
