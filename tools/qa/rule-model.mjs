import { CONFIG, NODE_TYPES, OBJECTIVE_TYPES } from '../../src/config.js';

function describeNodeTypes() {
  return {
    [NODE_TYPES.POWER]: {
      behavior: 'Clickable. Injects energy into itself on click, then emits along outgoing edges.',
      interaction: `Inject power defaults to ${CONFIG.TURN.POWER_INJECT_POWER}. Always active unless custom level data changes its inject power.`,
      purpose: 'Primary player-controlled energy source.'
    },
    [NODE_TYPES.RELAY]: {
      behavior: 'Passive. Stores incoming charge and auto-emits once charge reaches threshold.',
      interaction: `Default threshold ${CONFIG.TURN.RELAY_THRESHOLD}, default emit ${CONFIG.TURN.RELAY_EMIT_POWER}. Loses ${CONFIG.TURN.DECAY_PER_TURN} charge after each turn.`,
      purpose: 'Forward energy deeper into the network.'
    },
    [NODE_TYPES.SPLITTER]: {
      behavior: 'Passive branch node. When active, it splits its emit power across active outgoing routes before attenuation is applied.',
      interaction: 'Not clickable. Eligible outputs are enabled outgoing edges. Shares are floor-divided evenly, then any remainder is assigned in ascending edge id order. If one output is active, it receives the full pre-attenuation emit.',
      purpose: 'Creates deterministic multi-route budgeting tradeoffs instead of single-lane forwarding.'
    },
    [NODE_TYPES.FIREWALL]: {
      behavior: 'Clickable. Opens, closes, or rotates route modes and may inject a small charge on click when open.',
      interaction: `Default threshold ${CONFIG.TURN.FIREWALL_THRESHOLD}, click inject ${CONFIG.TURN.FIREWALL_CLICK_INJECT}, emit ${CONFIG.TURN.FIREWALL_EMIT_POWER}. Corrupted firewalls remain clickable but cannot auto-emit until cleansed.`,
      purpose: 'Player-controlled routing and branch selection.'
    },
    [NODE_TYPES.PURIFIER]: {
      behavior: 'Passive support node. When charged above threshold, it reduces corruption on adjacent nodes at end of turn.',
      interaction: `Default threshold ${CONFIG.TURN.PURIFIER_THRESHOLD}, emit ${CONFIG.TURN.PURIFIER_EMIT_POWER}, cleanse power ${CONFIG.TURN.PURIFIER_CLEANSE_POWER}. It is not directly clickable.`,
      purpose: 'Adds tactical counterplay to infection by rewarding purifier route support.'
    },
    [NODE_TYPES.VIRUS]: {
      behavior: 'Passive hazard. Spreads corruption to neighbors at the end of each turn.',
      interaction: `Default spread ${CONFIG.TURN.VIRUS_SPREAD_PER_TURN} per turn. Cannot be directly clicked.`,
      purpose: 'Creates time pressure and routing tension.'
    },
    [NODE_TYPES.OVERLOAD]: {
      behavior: 'Passive relay variant. Auto-emits when charged, but explodes if throughput this turn exceeds its overload threshold.',
      interaction: `Default overload threshold ${CONFIG.TURN.OVERLOAD_NODE_THRESHOLD}, explosion adds ${CONFIG.TURN.OVERLOAD_EXPLOSION_PENALTY} overload and permanently disables connected edges.`,
      purpose: 'Risk-reward routing bottleneck.'
    },
    [NODE_TYPES.CORE]: {
      behavior: 'Passive objective sink. Stores charge and never emits.',
      interaction: 'Not clickable. Usually must be charged to a target amount.',
      purpose: 'Primary victory objective.'
    }
  };
}

export function extractRuleModel() {
  return {
    playerActions: [
      'Click Power nodes.',
      'Click Firewall nodes to open, close, or rotate modes.',
      'No direct interaction with Relay, Splitter, Purifier, Virus, Overload, or Core nodes.'
    ],
    turnFlow: [
      'Player clicks a clickable node.',
      'Turn state resets transient per-turn counters.',
      'Clicked node may inject energy into itself.',
      'Propagation queue resolves until empty or safeguard triggers.',
      'Corruption spreads to neighbors.',
      'Per-turn charge decay is applied to non-core, non-power, non-virus nodes.',
      'Objectives are evaluated, then lose conditions are checked.'
    ],
    objectives: {
      [OBJECTIVE_TYPES.POWER_CORE]: 'Charge a named Core node to a required amount.',
      [OBJECTIVE_TYPES.ACTIVATE_ALL]: 'All non-virus, non-core nodes must be active, non-corrupted, and not exploded.',
      [OBJECTIVE_TYPES.CLEAN_CORRUPTION]: 'No corrupted nodes may remain in the network.'
    },
    loseConditions: {
      energy_overload: 'Global overload reaches or exceeds overloadLimit.',
      network_collapse: 'Corrupted node count reaches or exceeds collapseLimit.',
      out_of_moves: 'movesUsed reaches movesLimit before objectives are complete.',
      simulation_overflow: `Propagation exceeds safeguard of ${CONFIG.TURN.MAX_PROPAGATION_STEPS} steps in one turn.`
    },
    energyRules: {
      attenuation: 'Each edge reduces outgoing node emitPower by its attenuation, then caps to edge capacity.',
      splitterDistribution: 'Splitter nodes divide emit power evenly across enabled outgoing edges; leftover 1-point remainders are assigned by ascending edge id, then attenuation/capacity rules apply per edge.',
      overflowPenalty: 'Any energy above edge capacity is added to global overload and the edge is marked overloaded for the turn.',
      corruptionAbsorbFactor: `Corrupted nodes only accept floor(incoming * ${CONFIG.TURN.CORRUPTION_ABSORB_FACTOR}).`,
      cleanseThreshold: `Corrupted non-virus nodes are cleansed if accumulated accepted energy this turn reaches ${CONFIG.TURN.CLEANSE_THRESHOLD}.`,
      decayPerTurn: CONFIG.TURN.DECAY_PER_TURN
    },
    nodeTypes: describeNodeTypes()
  };
}
