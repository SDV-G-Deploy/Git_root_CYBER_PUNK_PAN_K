import { OBJECTIVE_TYPES, NODE_TYPES } from './config.js';

function objectivePowerCore(nodeId, requiredCharge) {
  return {
    type: OBJECTIVE_TYPES.POWER_CORE,
    nodeId,
    requiredCharge
  };
}

function objectiveActivateAll() {
  return {
    type: OBJECTIVE_TYPES.ACTIVATE_ALL
  };
}

function objectiveCleanCorruption() {
  return {
    type: OBJECTIVE_TYPES.CLEAN_CORRUPTION
  };
}

function defineLevel(level) {
  return {
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Charge the core.',
    parScore: 1200,
    collapseLimit: 4,
    ...level
  };
}

const LEVELS = [
  defineLevel({
    id: 'L1',
    name: 'Boot Link',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Learn the basic route: Power -> Relay -> Core.',
    parScore: 1520,
    movesLimit: 4,
    overloadLimit: 6,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 170, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 390, y: 270, threshold: 3, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 660, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 8)]
  }),
  defineLevel({
    id: 'L2',
    name: 'Relay Ladder',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Learn that relays chain together and store charge across turns.',
    parScore: 1450,
    movesLimit: 5,
    overloadLimit: 6,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 140, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 320, y: 180, threshold: 3, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 520, y: 320, threshold: 3, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 760, y: 270, targetCharge: 11 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 11)]
  }),
  defineLevel({
    id: 'L3',
    name: 'First Firewall',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Click the Firewall to open a route before trying to charge the Core.',
    parScore: 1385,
    movesLimit: 5,
    overloadLimit: 6,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 130, y: 280, injectPower: 5 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 350, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 690, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 12)]
  }),
  defineLevel({
    id: 'L4',
    name: 'Split Charge',
    chapter: 'Boot Sector',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Feed both relay branches and stack charge on the core efficiently.',
    parScore: 1365,
    movesLimit: 6,
    overloadLimit: 7,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 130, y: 270, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 340, y: 180, threshold: 3, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 340, y: 360, threshold: 3, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 700, y: 270, targetCharge: 16 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 16)]
  }),
  defineLevel({
    id: 'L5',
    name: 'Firewall Router',
    chapter: 'Firewall Ring',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Rotate a firewall between two branches and choose the safer route.',
    parScore: 1320,
    movesLimit: 7,
    overloadLimit: 7,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 120, y: 280, injectPower: 5 },
      {
        id: 'F1',
        type: NODE_TYPES.FIREWALL,
        x: 300,
        y: 280,
        firewallOpen: false,
        firewallModes: [['E2', 'E3'], ['E4', 'E5']],
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
    objectives: [objectivePowerCore('C1', 17)]
  }),
  defineLevel({
    id: 'L6',
    name: 'Branch Lock',
    chapter: 'Firewall Ring',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Use the gate to choose between a short path and a longer but steadier branch.',
    parScore: 1285,
    movesLimit: 7,
    overloadLimit: 7,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 280, injectPower: 5 },
      {
        id: 'F1',
        type: NODE_TYPES.FIREWALL,
        x: 280,
        y: 280,
        firewallOpen: false,
        firewallModes: [['E2'], ['E3']],
        activeMode: 0,
        injectPower: 2
      },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 470, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 470, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 760, y: 280, targetCharge: 18 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 18)]
  }),
  defineLevel({
    id: 'L7',
    name: 'Gate Cascade',
    chapter: 'Firewall Ring',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Coordinate two power inputs through one gate and keep both branches useful.',
    parScore: 1270,
    movesLimit: 8,
    overloadLimit: 8,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 100, y: 180, injectPower: 5 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 100, y: 380, injectPower: 5 },
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
      { id: 'R1', type: NODE_TYPES.RELAY, x: 500, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 500, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 800, y: 280, targetCharge: 20 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 20)]
  }),
  defineLevel({
    id: 'L8',
    name: 'Activate Grid',
    chapter: 'Firewall Ring',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Finish with every non-virus node active, not just the core charged.',
    parScore: 1240,
    movesLimit: 8,
    overloadLimit: 8,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 120, y: 280, injectPower: 5 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 300, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 490, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 490, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 770, y: 280, targetCharge: 18 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 18), objectiveActivateAll()]
  }),
  defineLevel({
    id: 'L9',
    name: 'Virus Wake',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Learn the virus tempo: if you stall, nearby nodes become infected.',
    parScore: 1210,
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
    objectives: [objectivePowerCore('C1', 13)]
  }),
  defineLevel({
    id: 'L10',
    name: 'Clean Sweep',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Clean infection with repeated energy while still advancing the core.',
    parScore: 1180,
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 3,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 120, y: 280, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 330, y: 200, emitPower: 3, corrupted: true },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 330, y: 360, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 520, y: 280, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 780, y: 280, targetCharge: 16 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E6', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 16), objectiveCleanCorruption()]
  }),
  defineLevel({
    id: 'L11',
    name: 'Quarantine Fork',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Use a firewall to avoid feeding a branch while you clear infection elsewhere.',
    parScore: 1160,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 3,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 100, y: 280, injectPower: 5 },
      {
        id: 'F1',
        type: NODE_TYPES.FIREWALL,
        x: 280,
        y: 280,
        firewallOpen: false,
        firewallModes: [['E2', 'E3'], ['E4', 'E5']],
        activeMode: 0,
        injectPower: 2
      },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 470, y: 170, emitPower: 3, corrupted: true },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 470, y: 390, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 620, y: 280, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 830, y: 280, targetCharge: 18 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E7', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 18), objectiveCleanCorruption()]
  }),
  defineLevel({
    id: 'L12',
    name: 'Virus Pressure',
    chapter: 'Quarantine Loop',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Two virus fronts force you to route quickly and contain collateral infection.',
    parScore: 1120,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 90, y: 180, injectPower: 5 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 90, y: 380, injectPower: 5 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 290, y: 180, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 290, y: 380, emitPower: 3 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 480, y: 170, spreadRate: 1 },
      { id: 'V2', type: NODE_TYPES.VIRUS, x: 480, y: 390, spreadRate: 1 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 810, y: 280, targetCharge: 20 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E6', from: 'V2', to: 'R2', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E7', from: 'V1', to: 'C1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E8', from: 'V2', to: 'C1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 20)]
  }),
  defineLevel({
    id: 'L13',
    name: 'Overload Trap',
    chapter: 'Overload Channel',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Spot the dangerous route and avoid feeding the overload node too hard.',
    parScore: 1180,
    movesLimit: 7,
    overloadLimit: 7,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 280, injectPower: 6 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 290, y: 200, emitPower: 4 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 500, y: 200, emitPower: 5, overloadThreshold: 4, threshold: 2 },
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
    objectives: [objectivePowerCore('C1', 19)]
  }),
  defineLevel({
    id: 'L14',
    name: 'Split Feed',
    chapter: 'Overload Channel',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Send energy around the overload node instead of through it every turn.',
    parScore: 1150,
    movesLimit: 8,
    overloadLimit: 8,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 100, y: 280, injectPower: 6 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 270, y: 280, emitPower: 4 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 470, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 470, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 790, y: 280, targetCharge: 20 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 20)]
  }),
  defineLevel({
    id: 'L15',
    name: 'Heat Sink',
    chapter: 'Overload Channel',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Use the firewall like a pressure valve to keep the overload route safe.',
    parScore: 1115,
    movesLimit: 8,
    overloadLimit: 8,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 90, y: 280, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 250, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 450, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 450, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 790, y: 280, targetCharge: 22 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 22)]
  }),
  defineLevel({
    id: 'L16',
    name: 'Pressure Valve',
    chapter: 'Overload Channel',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Balance two power sources across separate overload nodes without blowing the budget.',
    parScore: 1090,
    movesLimit: 9,
    overloadLimit: 8,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 80, y: 180, injectPower: 5 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 80, y: 380, injectPower: 5 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 250, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 470, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'O2', type: NODE_TYPES.OVERLOAD, x: 470, y: 390, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 810, y: 280, targetCharge: 23 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'O2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'O2', to: 'C1', capacity: 2, attenuation: 1, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 23)]
  }),
  defineLevel({
    id: 'L17',
    name: 'Dual Feed',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Combine firewall routing, overload control, and virus pressure in one run.',
    parScore: 1070,
    movesLimit: 9,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 110, y: 180, injectPower: 5 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 110, y: 380, injectPower: 5 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 280, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
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
    objectives: [objectivePowerCore('C1', 24)]
  }),
  defineLevel({
    id: 'L18',
    name: 'Crossfire District',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Two firewalls let you route around both virus pressure and overload bottlenecks.',
    parScore: 1045,
    movesLimit: 10,
    overloadLimit: 9,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 80, y: 170, injectPower: 6 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 80, y: 390, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 230, y: 170, firewallOpen: false, injectPower: 2 },
      { id: 'F2', type: NODE_TYPES.FIREWALL, x: 230, y: 390, firewallOpen: false, firewallModes: [['E5', 'E6'], ['E7', 'E8']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 430, y: 170, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'O2', type: NODE_TYPES.OVERLOAD, x: 430, y: 390, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 600, y: 280, spreadRate: 1 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 690, y: 170, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 690, y: 390, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 870, y: 280, targetCharge: 27 }
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
    objectives: [objectivePowerCore('C1', 27)]
  }),
  defineLevel({
    id: 'L19',
    name: 'Zero Infection',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'End clean: charge the core while removing every infection marker from the network.',
    parScore: 1020,
    movesLimit: 10,
    overloadLimit: 9,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 90, y: 170, injectPower: 6 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 90, y: 390, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 250, y: 170, firewallOpen: false, injectPower: 2 },
      { id: 'F2', type: NODE_TYPES.FIREWALL, x: 250, y: 390, firewallOpen: false, injectPower: 2 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 440, y: 170, emitPower: 3, corrupted: true },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 440, y: 390, emitPower: 3, corrupted: true },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 600, y: 280, spreadRate: 1 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 690, y: 280, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 860, y: 280, targetCharge: 28 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F2', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R2', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E7', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E8', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E9', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E10', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [objectivePowerCore('C1', 28), objectiveCleanCorruption()]
  }),
  defineLevel({
    id: 'L20',
    name: 'District Core',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Final exam: route, contain, and stabilize the entire district in one clean run.',
    parScore: 1000,
    movesLimit: 10,
    overloadLimit: 9,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: NODE_TYPES.POWER, x: 90, y: 160, injectPower: 6 },
      { id: 'P2', type: NODE_TYPES.POWER, x: 90, y: 400, injectPower: 6 },
      { id: 'F1', type: NODE_TYPES.FIREWALL, x: 240, y: 160, firewallOpen: false, injectPower: 2 },
      { id: 'F2', type: NODE_TYPES.FIREWALL, x: 240, y: 400, firewallOpen: false, firewallModes: [['E5', 'E6'], ['E7', 'E8']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: NODE_TYPES.OVERLOAD, x: 430, y: 160, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'O2', type: NODE_TYPES.OVERLOAD, x: 430, y: 400, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'V1', type: NODE_TYPES.VIRUS, x: 600, y: 280, spreadRate: 1 },
      { id: 'R1', type: NODE_TYPES.RELAY, x: 670, y: 160, emitPower: 3 },
      { id: 'R2', type: NODE_TYPES.RELAY, x: 670, y: 400, emitPower: 3 },
      { id: 'C1', type: NODE_TYPES.CORE, x: 860, y: 280, targetCharge: 30 }
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
    objectives: [objectivePowerCore('C1', 30), objectiveActivateAll()]
  })
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
