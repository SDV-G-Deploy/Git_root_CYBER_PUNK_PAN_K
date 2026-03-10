const LEVELS = [
  {
    id: 'L1',
    name: 'Boot Link',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Learn the basic route: Power -> Relay -> Core.',
    parScore: 1500,
    movesLimit: 4,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 170, y: 270, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 390, y: 270, threshold: 3, emitPower: 3 },
      { id: 'C1', type: 'core', x: 660, y: 270, targetCharge: 6 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 6 }
    ]
  },
  {
    id: 'L2',
    name: 'Relay Ladder',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Learn that relays chain together and store charge across turns.',
    parScore: 1450,
    movesLimit: 5,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 140, y: 270, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 320, y: 180, threshold: 3, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 520, y: 320, threshold: 3, emitPower: 3 },
      { id: 'C1', type: 'core', x: 760, y: 270, targetCharge: 7 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 7 }
    ]
  },
  {
    id: 'L3',
    name: 'First Firewall',
    chapter: 'Boot Sector',
    difficulty: 'intro',
    difficultyTag: 'intro',
    teachingGoal: 'Click the Firewall to open a route before trying to charge the Core.',
    parScore: 1400,
    movesLimit: 5,
    overloadLimit: 6,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 130, y: 280, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 350, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'C1', type: 'core', x: 690, y: 280, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L4',
    name: 'Split Charge',
    chapter: 'Boot Sector',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Feed both relay branches and stack charge on the core efficiently.',
    parScore: 1375,
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 130, y: 270, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 340, y: 180, threshold: 3, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 340, y: 360, threshold: 3, emitPower: 3 },
      { id: 'C1', type: 'core', x: 700, y: 270, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 12 }
    ]
  },
  {
    id: 'L5',
    name: 'Firewall Router',
    chapter: 'Firewall Ring',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Rotate a firewall between two branches and choose the safer route.',
    parScore: 1325,
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 280, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 280, firewallOpen: false, firewallModes: [['E2', 'E3'], ['E4', 'E5']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 490, y: 170, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 490, y: 390, emitPower: 3 },
      { id: 'C1', type: 'core', x: 760, y: 280, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L6',
    name: 'Branch Lock',
    chapter: 'Firewall Ring',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Use the gate to decide between a short direct route and a slower relay lane.',
    parScore: 1300,
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 280, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 280, firewallOpen: false, firewallModes: [['E2'], ['E3']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 380, emitPower: 3 },
      { id: 'C1', type: 'core', x: 760, y: 280, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 },
      { type: 'activate_all' }
    ]
  },
  {
    id: 'L7',
    name: 'Gate Cascade',
    chapter: 'Firewall Ring',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Coordinate two power inputs through one gate and keep both branches useful.',
    parScore: 1280,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 180, injectPower: 5 },
      { id: 'P2', type: 'power', x: 100, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 280, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 170, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 500, y: 390, emitPower: 3 },
      { id: 'C1', type: 'core', x: 800, y: 280, targetCharge: 9 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 9 }
    ]
  },
  {
    id: 'L8',
    name: 'Activate Grid',
    chapter: 'Firewall Ring',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Finish with every non-virus node active, not just the core charged.',
    parScore: 1250,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 280, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 490, y: 170, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 490, y: 390, emitPower: 3 },
      { id: 'C1', type: 'core', x: 770, y: 280, targetCharge: 18 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 18 },
      { type: 'activate_all' }
    ]
  },
  {
    id: 'L9',
    name: 'Virus Wake',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Intro virus pressure: pick a lane before corruption spreads through the relay.',
    parScore: 1240,
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 280, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 280, firewallOpen: false, firewallModes: [['E2'], ['E3']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 280, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 650, y: 380, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 800, y: 280, targetCharge: 7 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 7 }
    ]
  },
  {
    id: 'L10',
    name: 'Clean Sweep',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Clean infection with repeated energy while still advancing the core.',
    parScore: 1225,
    movesLimit: 7,
    overloadLimit: 7,
    collapseLimit: 3,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 280, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 330, y: 200, emitPower: 3, corrupted: true },
      { id: 'R2', type: 'relay', x: 330, y: 360, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 520, y: 280, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 780, y: 280, targetCharge: 16 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E6', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 16 },
      { type: 'clean_corruption' }
    ]
  },
  {
    id: 'L11',
    name: 'Quarantine Fork',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Clean the corrupted power source, then take the safe branch before virus pressure grows.',
    parScore: 1200,
    movesLimit: 7,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 280, injectPower: 5, corrupted: true },
      { id: 'F1', type: 'firewall', x: 300, y: 280, firewallOpen: false, firewallModes: [['E2'], ['E3']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 180, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 500, y: 380, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 650, y: 380, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 800, y: 280, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L12',
    name: 'Virus Pressure',
    chapter: 'Quarantine Loop',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Two virus fronts force you to route quickly before the budget runs out.',
    parScore: 1180,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 90, y: 180, injectPower: 5 },
      { id: 'P2', type: 'power', x: 90, y: 380, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 290, y: 180, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 290, y: 380, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 480, y: 170, spreadRate: 1 },
      { id: 'V2', type: 'virus', x: 480, y: 390, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 810, y: 280, targetCharge: 7 }
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
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 7 }
    ]
  },
  {
    id: 'L13',
    name: 'Overload Trap',
    chapter: 'Overload Channel',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Spot the dangerous route and avoid feeding the overload node too hard.',
    parScore: 1180,
    movesLimit: 7,
    overloadLimit: 10,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 280, injectPower: 6 },
      { id: 'R1', type: 'relay', x: 290, y: 200, emitPower: 4 },
      { id: 'O1', type: 'overload', x: 500, y: 200, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'R2', type: 'relay', x: 500, y: 380, emitPower: 3 },
      { id: 'C1', type: 'core', x: 780, y: 280, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 10 }
    ]
  },
  {
    id: 'L14',
    name: 'Split Feed',
    chapter: 'Overload Channel',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Send energy around the overload node instead of through it every turn.',
    parScore: 1160,
    movesLimit: 8,
    overloadLimit: 10,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 280, injectPower: 6 },
      { id: 'R1', type: 'relay', x: 270, y: 280, emitPower: 4 },
      { id: 'O1', type: 'overload', x: 470, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'R2', type: 'relay', x: 470, y: 390, emitPower: 3 },
      { id: 'C1', type: 'core', x: 790, y: 280, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 10 },
      { type: 'activate_all' }
    ]
  },
  {
    id: 'L15',
    name: 'Heat Sink',
    chapter: 'Overload Channel',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Use the firewall like a pressure valve to keep the overload route safe.',
    parScore: 1140,
    movesLimit: 8,
    overloadLimit: 12,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 90, y: 280, injectPower: 6 },
      { id: 'F1', type: 'firewall', x: 250, y: 280, firewallOpen: false, injectPower: 2 },
      { id: 'O1', type: 'overload', x: 450, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'R1', type: 'relay', x: 450, y: 390, emitPower: 3 },
      { id: 'C1', type: 'core', x: 790, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 12 }
    ]
  },
  {
    id: 'L16',
    name: 'Pressure Valve',
    chapter: 'Overload Channel',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Balance two power sources across separate overload nodes without blowing the budget.',
    parScore: 1120,
    movesLimit: 9,
    overloadLimit: 12,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 80, y: 180, injectPower: 5 },
      { id: 'P2', type: 'power', x: 80, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 250, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: 'overload', x: 470, y: 170, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'O2', type: 'overload', x: 470, y: 390, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'C1', type: 'core', x: 810, y: 280, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'O2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'O2', to: 'C1', capacity: 2, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 10 }
    ]
  },
  {
    id: 'L17',
    name: 'Dual Feed',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Use the firewall to decide when to burst through overload and when to take the safer relay path under virus pressure.',
    parScore: 1100,
    movesLimit: 9,
    overloadLimit: 10,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 180, injectPower: 5 },
      { id: 'P2', type: 'power', x: 110, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 280, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: 'overload', x: 500, y: 160, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 390, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 660, y: 390, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 830, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 12 }
    ]
  },
  {
    id: 'L18',
    name: 'Crossfire District',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Split power across a gate lane and a virus-pressured relay lane before collapse catches up.',
    parScore: 1080,
    movesLimit: 6,
    overloadLimit: 10,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 180, injectPower: 5 },
      { id: 'P2', type: 'power', x: 100, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 180, firewallOpen: false, firewallModes: [['E3'], ['E4']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 320, y: 380, emitPower: 3 },
      { id: 'O1', type: 'overload', x: 520, y: 180, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'V1', type: 'virus', x: 530, y: 380, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 840, y: 280, targetCharge: 12 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'O1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 12 },
      { type: 'clean_corruption' }
    ]
  },
  {
    id: 'L19',
    name: 'Zero Infection',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Stabilize the corrupted source, then route through a clean relay lane before virus pressure compounds.',
    parScore: 1060,
    movesLimit: 8,
    overloadLimit: 11,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: 'power', x: 90, y: 180, injectPower: 5, corrupted: true },
      { id: 'P2', type: 'power', x: 90, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 260, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 490, y: 170, emitPower: 3 },
      { id: 'R2', type: 'relay', x: 490, y: 390, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 650, y: 390, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 840, y: 280, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'V1', to: 'R2', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 10 }
    ]
  },
  {
    id: 'L20',
    name: 'District Core',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Final exam: cleanse the source, choose between overload burst and safe relay routing, and finish the district core.',
    parScore: 1040,
    movesLimit: 10,
    overloadLimit: 11,
    collapseLimit: 5,
    nodes: [
      { id: 'P1', type: 'power', x: 90, y: 180, injectPower: 5, corrupted: true },
      { id: 'P2', type: 'power', x: 90, y: 380, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 260, y: 280, firewallOpen: false, firewallModes: [['E3', 'E4'], ['E5', 'E6']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: 'overload', x: 490, y: 170, emitPower: 5, overloadThreshold: 5, threshold: 2 },
      { id: 'R1', type: 'relay', x: 490, y: 390, emitPower: 3 },
      { id: 'V1', type: 'virus', x: 650, y: 170, spreadRate: 1 },
      { id: 'R2', type: 'relay', x: 680, y: 170, emitPower: 3 },
      { id: 'C1', type: 'core', x: 860, y: 280, targetCharge: 14 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'O1', to: 'R2', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E8', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 14 }
    ]
  },
  {
    id: 'L21',
    name: 'Twin Injectors',
    chapter: 'Boot Sector',
    difficulty: 'light',
    difficultyTag: 'light',
    teachingGoal: 'Use two power taps in sequence before committing to the relay lane.',
    parScore: 1210,
    movesLimit: 6,
    overloadLimit: 7,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 200, injectPower: 4 },
      { id: 'P2', type: 'power', x: 120, y: 350, injectPower: 4 },
      { id: 'R1', type: 'relay', x: 360, y: 270, threshold: 3, emitPower: 3 },
      { id: 'C1', type: 'core', x: 700, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E2', from: 'P2', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L22',
    name: 'Switchback Gate',
    chapter: 'Firewall Ring',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Switch between safe relay output and overload burst timing.',
    parScore: 1180,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 120, y: 270, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 300, y: 270, firewallOpen: false, firewallModes: [['E2'], ['E4']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 180, threshold: 2, emitPower: 2 },
      { id: 'O1', type: 'overload', x: 500, y: 360, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'C1', type: 'core', x: 760, y: 270, targetCharge: 6 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'F1', to: 'C1', capacity: 1, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 6 }
    ]
  },
  {
    id: 'L23',
    name: 'Median Filter',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Alternate between safe relay output and risky overload burst under virus pressure.',
    parScore: 1150,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 270, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 280, y: 270, firewallOpen: false, firewallModes: [['E2'], ['E4']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 500, y: 170, emitPower: 3 },
      { id: 'O1', type: 'overload', x: 500, y: 370, emitPower: 5, overloadThreshold: 4, threshold: 2 },
      { id: 'V1', type: 'virus', x: 650, y: 370, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 820, y: 270, targetCharge: 6 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 6 }
    ]
  },
  {
    id: 'L24',
    name: 'Purge Junction',
    chapter: 'Quarantine Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Clean a corrupted relay first, then route both branches to finish the core.',
    parScore: 1120,
    movesLimit: 8,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 270, injectPower: 5 },
      { id: 'R1', type: 'relay', x: 340, y: 180, emitPower: 3, threshold: 3, corrupted: true },
      { id: 'R2', type: 'relay', x: 340, y: 360, emitPower: 3, threshold: 3 },
      { id: 'C1', type: 'core', x: 760, y: 270, targetCharge: 10 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 5, attenuation: 0, enabled: true },
      { id: 'E2', from: 'P1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 10 },
      { type: 'clean_corruption' }
    ]
  },
  {
    id: 'L25',
    name: 'Purifier Wake',
    chapter: 'Purifier Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Route energy through the purifier lane to stabilize an infected relay while charging the core.',
    parScore: 1100,
    movesLimit: 7,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 110, y: 270, injectPower: 5 },
      { id: 'P2', type: 'power', x: 110, y: 360, injectPower: 4 },
      { id: 'R1', type: 'relay', x: 340, y: 190, emitPower: 3, threshold: 3, corrupted: true },
      { id: 'U1', type: 'purifier', x: 340, y: 360, emitPower: 2, threshold: 2, purifierStrength: 1 },
      { id: 'V1', type: 'virus', x: 520, y: 190, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 790, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'R1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'P1', to: 'U1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'U1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E5', from: 'U1', to: 'R1', capacity: 1, attenuation: 4, enabled: true },
      { id: 'E6', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E7', from: 'P2', to: 'U1', capacity: 3, attenuation: 1, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L26',
    name: 'Sanitize or Rush',
    chapter: 'Purifier Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Choose between direct core feed and purifier support to control virus pressure.',
    parScore: 1080,
    movesLimit: 9,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 270, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 280, y: 270, firewallOpen: false, firewallModes: [['E2'], ['E3']], activeMode: 0, injectPower: 2 },
      { id: 'R1', type: 'relay', x: 520, y: 180, emitPower: 3, threshold: 3 },
      { id: 'U1', type: 'purifier', x: 520, y: 360, emitPower: 2, threshold: 2, purifierStrength: 1 },
      { id: 'V1', type: 'virus', x: 670, y: 180, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 830, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'F1', to: 'U1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'U1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'U1', to: 'R1', capacity: 1, attenuation: 4, enabled: true },
      { id: 'E7', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  },
  {
    id: 'L27',
    name: 'Sterile Route',
    chapter: 'Purifier Loop',
    difficulty: 'medium',
    difficultyTag: 'medium',
    teachingGoal: 'Keep purifier support online to finish charge while clearing all infection.',
    parScore: 1060,
    movesLimit: 10,
    overloadLimit: 8,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 100, y: 270, injectPower: 5 },
      { id: 'P2', type: 'power', x: 110, y: 360, injectPower: 2 },
      { id: 'U1', type: 'purifier', x: 300, y: 300, emitPower: 2, threshold: 2, purifierStrength: 1 },
      { id: 'R1', type: 'relay', x: 470, y: 180, emitPower: 3, threshold: 3, corrupted: true },
      { id: 'R2', type: 'relay', x: 620, y: 300, emitPower: 3, threshold: 3 },
      { id: 'V1', type: 'virus', x: 620, y: 140, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 840, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'U1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'U1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'R1', to: 'R2', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E4', from: 'R2', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'U1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E6', from: 'V1', to: 'R1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E7', from: 'U1', to: 'R2', capacity: 1, attenuation: 4, enabled: true },
      { id: 'E8', from: 'P2', to: 'U1', capacity: 1, attenuation: 2, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 },
      { type: 'clean_corruption' }
    ]
  },
  {
    id: 'L28',
    name: 'Sanitation Gate',
    chapter: 'District Core',
    difficulty: 'hard',
    difficultyTag: 'hard',
    teachingGoal: 'Balance firewall routing between overload burst and purifier-backed stability.',
    parScore: 1020,
    movesLimit: 9,
    overloadLimit: 9,
    collapseLimit: 4,
    nodes: [
      { id: 'P1', type: 'power', x: 90, y: 270, injectPower: 5 },
      { id: 'F1', type: 'firewall', x: 250, y: 270, firewallOpen: false, firewallModes: [['E2'], ['E4']], activeMode: 0, injectPower: 2 },
      { id: 'O1', type: 'overload', x: 460, y: 170, emitPower: 5, threshold: 2, overloadThreshold: 4 },
      { id: 'U1', type: 'purifier', x: 460, y: 360, emitPower: 2, threshold: 2, purifierStrength: 1 },
      { id: 'R1', type: 'relay', x: 650, y: 360, emitPower: 3, threshold: 3 },
      { id: 'V1', type: 'virus', x: 640, y: 170, spreadRate: 1 },
      { id: 'C1', type: 'core', x: 860, y: 270, targetCharge: 8 }
    ],
    edges: [
      { id: 'E1', from: 'P1', to: 'F1', capacity: 4, attenuation: 1, enabled: true },
      { id: 'E2', from: 'F1', to: 'O1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E3', from: 'O1', to: 'C1', capacity: 2, attenuation: 1, enabled: true },
      { id: 'E4', from: 'F1', to: 'U1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E5', from: 'U1', to: 'R1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E6', from: 'R1', to: 'C1', capacity: 3, attenuation: 1, enabled: true },
      { id: 'E7', from: 'V1', to: 'O1', capacity: 1, attenuation: 0, enabled: true },
      { id: 'E8', from: 'U1', to: 'O1', capacity: 1, attenuation: 4, enabled: true }
    ],
    objectives: [
      { type: 'power_core', nodeId: 'C1', requiredCharge: 8 }
    ]
  }
];

function cloneLevel(level) {
  return {
    ...level,
    nodes: level.nodes.map((node) => ({ ...node })),
    edges: level.edges.map((edge) => ({ ...edge })),
    objectives: level.objectives.map((objective) => ({ ...objective })),
    solverProof: level.solverProof
      ? {
        ...level.solverProof,
        solutionPath: Array.isArray(level.solverProof.solutionPath)
          ? level.solverProof.solutionPath.map((action) => ({ ...action }))
          : []
      }
      : undefined
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
