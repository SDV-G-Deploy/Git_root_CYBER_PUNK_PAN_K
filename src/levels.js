import { OBJECTIVE_TYPES, NODE_TYPES } from './config.js';

const LEVELS = [
  {
    id: 'L1',
    name: 'Boot Sequence',
    difficultyTag: 'intro',
    movesLimit: 4,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 180, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 390, y: 270, threshold: 3, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 640, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L2',
    name: 'Branch Choice',
    difficultyTag: 'intro',
    movesLimit: 5,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 150, y: 280 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 350, y: 190 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 350, y: 370 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 620, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 5, attenuation: 1, enabled: true },
      { id: 'E2', from: 'S1', to: 'R2', capacity: 3, attenuation: 0, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 4, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 12 }
    ]
  },
  {
    id: 'L3',
    name: 'Relay Calibration',
    difficultyTag: 'easy',
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 160, y: 270 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 330, y: 170 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 330, y: 370 },
      { id: 'R3', type: NODE_TYPES.RELAY, x: 520, y: 270 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 720, y: 270, targetCharge: 14 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'S1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R3', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'R3', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R3', to: 'C1', capacity: 4, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.ACTIVATE_ALL },
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 14 }
    ]
  },
  {
    id: 'L4',
    name: 'Corruption Alert',
    difficultyTag: 'easy',
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 150, y: 270 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 320, y: 200 },
      { id: 'X1', type: NODE_TYPES.CORRUPTED, x: 460, y: 320 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 540, y: 180 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 730, y: 260, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'X1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'X1', to: 'R2', capacity: 3, attenuation: 0, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.CLEAN_CORRUPTION },
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 10 }
    ]
  },
  {
    id: 'L5',
    name: 'Load Balancer',
    difficultyTag: 'medium',
    movesLimit: 7,
    overloadLimit: 5,
    collapseLimit: 5,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 140, y: 270, injectPower: 6 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 320, y: 150, emitPower: 4 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 320, y: 390, emitPower: 4 },
      { id: 'R3', type: NODE_TYPES.RELAY, x: 520, y: 270, emitPower: 4 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 730, y: 270, targetCharge: 16 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E2', from: 'S1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R3', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'R3', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R3', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 16 }
    ]
  },
  {
    id: 'L6',
    name: 'Switch Yard',
    difficultyTag: 'medium',
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 5,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 130, y: 280 },
      {
        id: 'SW1',
        type: NODE_TYPES.SWITCH,
        x: 320,
        y: 280,
        threshold: 2,
        emitPower: 3,
        switchModes: [
          ['E2', 'E3'],
          ['E4', 'E5']
        ],
        activeMode: 0,
        injectOnClick: true
      },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 520, y: 170 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 520, y: 390 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 750, y: 280, targetCharge: 18 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'SW1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'SW1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'SW1', to: 'R2', capacity: 3, attenuation: 1, enabled: false },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: false }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 18 },
      { type: OBJECTIVE_TYPES.ACTIVATE_ALL }
    ]
  },
  {
    id: 'L7',
    name: 'Virus Bloom',
    difficultyTag: 'hard',
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 120, y: 280 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 300, y: 150 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 300, y: 410 },
      { id: 'X1', type: NODE_TYPES.CORRUPTED, x: 470, y: 280 },
      { id: 'R3', type: NODE_TYPES.RELAY, x: 620, y: 160 },
      { id: 'R4', type: NODE_TYPES.RELAY, x: 620, y: 400 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 790, y: 280, targetCharge: 20 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'S1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'X1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'X1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'X1', to: 'R3', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E6', from: 'X1', to: 'R4', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E7', from: 'R3', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E8', from: 'R4', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.CLEAN_CORRUPTION },
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 20 }
    ]
  },
  {
    id: 'L8',
    name: 'District Purge',
    difficultyTag: 'hard',
    movesLimit: 9,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'S1', type: NODE_TYPES.SOURCE, x: 110, y: 280, injectPower: 6 },
      {
        id: 'SW1',
        type: NODE_TYPES.SWITCH,
        x: 270,
        y: 280,
        switchModes: [
          ['E2', 'E3'],
          ['E4', 'E5']
        ],
        activeMode: 0,
        injectOnClick: true,
        emitPower: 4,
        threshold: 2
      },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 430, y: 140, emitPower: 4 },
      { id: 'X1', type: NODE_TYPES.CORRUPTED, x: 430, y: 280 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 430, y: 420, emitPower: 4 },
      { id: 'R3', type: NODE_TYPES.RELAY, x: 620, y: 190 },
      { id: 'R4', type: NODE_TYPES.RELAY, x: 620, y: 370 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 810, y: 280, targetCharge: 24 }
    ],
    edges: [
      { id: 'E1', from: 'S1', to: 'SW1', capacity: 5, attenuation: 1, enabled: true },
      { id: 'E2', from: 'SW1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R3', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'SW1', to: 'R2', capacity: 3, attenuation: 1, enabled: false },
      { id: 'E5', from: 'R2', to: 'R4', capacity: 3, attenuation: 1, enabled: false },
      { id: 'E6', from: 'R3', to: 'X1', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E7', from: 'R4', to: 'X1', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E8', from: 'R3', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E9', from: 'R4', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.CLEAN_CORRUPTION },
      { type: OBJECTIVE_TYPES.ACTIVATE_ALL },
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 24 }
    ]
  }
];

function cloneLevel(level) {
  return {
    ...level,
    nodes: level.nodes.map((node) => ({ ...node })),
    edges: level.edges.map((edge) => ({ ...edge })),
    objectives: level.objectives.map((objective) => ({ ...objective }))
  };
}

export function loadLevels(levelsOverride) {
  if (Array.isArray(levelsOverride) && levelsOverride.length > 0) {
    return levelsOverride.map(cloneLevel);
  }

  return LEVELS.map(cloneLevel);
}

export function clampLevelIndex(index, levels) {
  if (!Array.isArray(levels) || levels.length === 0) {
    return 0;
  }

  return Math.min(levels.length - 1, Math.max(0, Number(index) || 0));
}