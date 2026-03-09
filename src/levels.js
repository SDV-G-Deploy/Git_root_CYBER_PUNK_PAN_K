import { OBJECTIVE_TYPES, NODE_TYPES } from './config.js';

const LEVELS = [
  {
    id: 'L1',
    name: 'Boot Link',
    difficultyTag: 'intro',
    movesLimit: 4,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 170, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 390, y: 270, threshold: 3, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 660, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L2',
    name: 'First Firewall',
    difficultyTag: 'intro',
    movesLimit: 5,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 130, y: 280, injectPower: 5 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 340, y: 180, firewallOpen: false, injectPower: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 340, y: 370, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 660, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 12 },
      { type: OBJECTIVE_TYPES.ACTIVATE_ALL }
    ]
  },
  {
    id: 'L3',
    name: 'Virus Wake',
    difficultyTag: 'easy',
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 3,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 130, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 310, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 500, y: 270, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 360, y: 360, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 730, y: 270, targetCharge: 13 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E5', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 13 }
    ]
  },
  {
    id: 'L4',
    name: 'Firewall Router',
    difficultyTag: 'easy',
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 120, y: 280, injectPower: 5 },
      {
        id: 'F1',
        type: NODE_TYPES.FIREWALL,
        x: 300,
        y: 280,
        firewallOpen: false,
        firewallModes: [
          ['E2', 'E3'],
          ['E4', 'E5']
        ],
        activeMode: 0,
        injectPower: 2
      },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 490, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 490, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 760, y: 280, targetCharge: 17 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 17 }
    ]
  },
  {
    id: 'L5',
    name: 'Overload Trap',
    difficultyTag: 'medium',
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 280, injectPower: 6 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 290, y: 200, emitPower: 4 },
      {
        id: 'O1',
        type: NODE_TYPES.OVERLOAD,
        x: 500,
        y: 200,
        emitPower: 5,
        overloadThreshold: 4,
        threshold: 2
      },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 500, y: 380, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 780, y: 280, targetCharge: 19 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 19 }
    ]
  },
  {
    id: 'L6',
    name: 'Infected Corridor',
    difficultyTag: 'medium',
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 280, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 270, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 450, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 450, y: 390, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 600, y: 280, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 800, y: 280, targetCharge: 21 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'V1', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E5', from: 'R2', to: 'V1', capacity: 2, attenuation: 0, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 21 }
    ]
  },
  {
    id: 'L7',
    name: 'Dual Feed',
    difficultyTag: 'hard',
    movesLimit: 9,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 180, injectPower: 5 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 110, y: 380, injectPower: 5 },
      {
        id: 'F1',
        type: NODE_TYPES.FIREWALL,
        x: 280,
        y: 280,
        firewallOpen: false,
        firewallModes: [['E3', 'E4'], ['E5', 'E6']],
        activeMode: 0,
        injectPower: 2
      },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 500, y: 160, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 500, y: 390, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 650, y: 280, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 830, y: 280, targetCharge: 24 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E8', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 24 }
    ]
  },
  {
    id: 'L8',
    name: 'District Core',
    difficultyTag: 'hard',
    movesLimit: 10,
    overloadLimit: 9,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 90, y: 160, injectPower: 6 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 90, y: 400, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 240, y: 160, firewallOpen: false, injectPower: 2 },
      {
        id: 'F2',
        type: NODE_TYPES.FIREWALL,
        x: 240,
        y: 400,
        firewallOpen: false,
        firewallModes: [['E5', 'E6'], ['E7', 'E8']],
        activeMode: 0,
        injectPower: 2
      },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 430, y: 160, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'O2', type: NODE_TYPES.OVERLOAD, x: 430, y: 400, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 600, y: 280, spreadRate: 1 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 670, y: 160, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 670, y: 400, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 860, y: 280, targetCharge: 28 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F2', to: 'O2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F2', to: 'R1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'F2', to: 'R2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E8', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E9', from: 'O1', to: 'R1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E10', from: 'O2', to: 'R2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E11', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E12', from: 'V1', to: 'O2', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E13', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E14', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: OBJECTIVE_TYPES.POWER_CORE, nodeId: 'C1', requiredCharge: 28 }
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
