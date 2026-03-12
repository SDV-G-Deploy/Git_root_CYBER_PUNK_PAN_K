# Chain Lab QA Report

Generated levels checked: 44
Solvable: 44
Unsolvable: 0
Search cutoffs: 0
Total states explored: 54451

## Gameplay Rules Summary

### Player Actions
- Click Power nodes.
- Click Firewall nodes to open, close, or rotate modes.
- Click Breaker nodes to prime a one-turn safety cap for the next turn.
- No direct interaction with Relay, Splitter, Purifier, Virus, Overload, or Core nodes (except Breaker, which is clickable).

### Turn Flow
- Player clicks a clickable node.
- Turn state resets transient per-turn counters.
- Clicked node may inject energy into itself.
- Propagation queue resolves until empty or safeguard triggers.
- Corruption spreads to neighbors.
- Per-turn charge decay is applied to non-core, non-power, non-virus nodes.
- Objectives are evaluated, then lose conditions are checked.

### Objectives
- `power_core`: Charge a named Core node to a required amount.
- `activate_all`: All non-virus, non-core nodes must be active, non-corrupted, and not exploded.
- `clean_corruption`: No corrupted nodes may remain in the network.

### Lose Conditions
- `energy_overload`: Global overload reaches or exceeds overloadLimit.
- `network_collapse`: Corrupted node count reaches or exceeds collapseLimit.
- `out_of_moves`: movesUsed reaches movesLimit before objectives are complete.
- `simulation_overflow`: Propagation exceeds safeguard of 256 steps in one turn.

### Node Types
- `power`: Clickable. Injects energy into itself on click, then emits along outgoing edges. Inject power defaults to 5. Always active unless custom level data changes its inject power. Purpose: Primary player-controlled energy source.
- `relay`: Passive. Stores incoming charge and auto-emits once charge reaches threshold. Default threshold 3, default emit 3. Loses 1 charge after each turn. Purpose: Forward energy deeper into the network.
- `splitter`: Passive branch node. When active, it splits its emit power across active outgoing routes before attenuation is applied. Not clickable. Eligible outputs are enabled outgoing edges. Shares are floor-divided evenly, then any remainder is assigned in ascending edge id order. If one output is active, it receives the full pre-attenuation emit. Purpose: Creates deterministic multi-route budgeting tradeoffs instead of single-lane forwarding.
- `breaker`: Clickable timing tool. Click primes it for the next turn; while armed, it caps outgoing packet energy per edge and dissipates excess safely. Default threshold 2, emit 5, armed cap 2. Primed state is consumed at next turn start and armed state resets after that turn resolves. Purpose: Trade throughput for one-turn safety in overload-heavy lanes.
- `firewall`: Clickable. Opens, closes, or rotates route modes and may inject a small charge on click when open. Default threshold 2, click inject 2, emit 3. Corrupted firewalls remain clickable but cannot auto-emit until cleansed. Purpose: Player-controlled routing and branch selection.
- `purifier`: Passive support node. When charged above threshold, it reduces corruption on adjacent nodes at end of turn. Default threshold 2, emit 2, cleanse power 1. It is not directly clickable. Purpose: Adds tactical counterplay to infection by rewarding purifier route support.
- `virus`: Passive hazard. Spreads corruption to neighbors at the end of each turn. Default spread 1 per turn. Cannot be directly clicked. Purpose: Creates time pressure and routing tension.
- `overload`: Passive relay variant. Auto-emits when charged, but explodes if throughput this turn exceeds its overload threshold. Default overload threshold 5, explosion adds 2 overload and permanently disables connected edges. Purpose: Risk-reward routing bottleneck.
- `core`: Passive objective sink. Stores charge and never emits. Not clickable. Usually must be charged to a target amount. Purpose: Primary victory objective.

### Energy Rules
- `attenuation`: Each edge reduces outgoing node emitPower by its attenuation, then caps to edge capacity.
- `splitterDistribution`: Splitter nodes divide emit power evenly across enabled outgoing edges; leftover 1-point remainders are assigned by ascending edge id, then attenuation/capacity rules apply per edge.
- `overflowPenalty`: Any energy above edge capacity is added to global overload and the edge is marked overloaded for the turn.
- `corruptionAbsorbFactor`: Corrupted nodes only accept floor(incoming * 0.5).
- `cleanseThreshold`: Corrupted non-virus nodes are cleansed if accumulated accepted energy this turn reaches 2.
- `breakerDissipation`: Armed breakers cap outgoing per-edge packet energy to breakerCap and dissipate the excess before edge capacity and downstream throughput checks.
- `decayPerTurn`: 1

## Solvability Verification

| Level | Status | Authored | Estimated | Min moves | Solutions | Branching | Issues |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| L1 | Solvable | intro | Easy | 3 | 1 | 1 | single_opening_solution, single_solution_path |
| L2 | Solvable | intro | Medium | 3 | 22 | 2 | none |
| L3 | Solvable | intro | Medium | 4 | 15 | 2 | none |
| L4 | Solvable | light | Easy | 3 | 27 | 2 | none |
| L5 | Solvable | light | Hard | 5 | 37 | 2 | none |
| L6 | Solvable | light | Hard | 5 | 18 | 2 | none |
| L7 | Solvable | medium | Hard | 6 | 1648 | 3 | none |
| L8 | Solvable | medium | Hard | 6 | 21 | 2 | none |
| L9 | Solvable | medium | Hard | 5 | 9 | 2 | tight_move_budget |
| L10 | Solvable | medium | Medium | 5 | 1 | 1 | single_opening_solution, single_solution_path |
| L11 | Solvable | medium | Hard | 5 | 15 | 2 | none |
| L12 | Solvable | hard | Medium | 6 | 116 | 2 | none |
| L13 | Solvable | medium | Easy | 3 | 1 | 1 | single_opening_solution, single_solution_path |
| L14 | Solvable | medium | Easy | 3 | 1 | 1 | single_opening_solution, single_solution_path |
| L15 | Solvable | hard | Medium | 4 | 54 | 2 | none |
| L16 | Solvable | hard | Hard | 5 | 2511 | 3 | none |
| L17 | Solvable | hard | Medium | 4 | 2767 | 3 | none |
| L18 | Solvable | hard | Hard | 5 | 84 | 3 | tight_move_budget |
| L19 | Solvable | hard | Hard | 6 | 592 | 3 | none |
| L20 | Solvable | hard | Hard | 9 | 1472 | 3 | tight_move_budget |
| L21 | Solvable | light | Medium | 4 | 16 | 2 | none |
| L22 | Solvable | medium | Medium | 4 | 54 | 2 | none |
| L23 | Solvable | medium | Medium | 4 | 42 | 2 | none |
| L24 | Solvable | medium | Easy | 3 | 1 | 1 | single_opening_solution, single_solution_path |
| L25 | Solvable | medium | Medium | 4 | 39 | 2 | none |
| L26 | Solvable | medium | Hard | 7 | 54 | 2 | none |
| L27 | Solvable | medium | Hard | 8 | 45 | 2 | none |
| L28 | Solvable | hard | Hard | 6 | 72 | 2 | none |
| L29 | Solvable | medium | Hard | 8 | 108 | 2 | none |
| L30 | Solvable | medium | Hard | 5 | 1016 | 3 | none |
| L31 | Solvable | hard | Hard | 7 | 308 | 2 | none |
| L32 | Solvable | hard | Hard | 7 | 256 | 3 | none |
| L33 | Solvable | hard | Hard | 4 | 3907 | 3 | none |
| L34 | Solvable | challenge | Hard | 10 | 188 | 2 | none |
| L35 | Solvable | challenge | Hard | 7 | 1005 | 3 | none |
| L36 | Solvable | boss | Hard | 7 | 1422 | 3 | none |
| L37 | Solvable | intro | Easy | 3 | 1 | 1 | single_opening_solution, single_solution_path |
| L38 | Solvable | medium | Medium | 5 | 28 | 2 | tight_move_budget |
| L39 | Solvable | medium | Medium | 5 | 1 | 1 | single_opening_solution, single_solution_path |
| L40 | Solvable | hard | Medium | 4 | 58 | 2 | none |
| L41 | Solvable | intro | Medium | 2 | 3 | 2 | single_opening_solution |
| L42 | Solvable | hard | Hard | 5 | 15 | 2 | none |
| L43 | Solvable | hard | Hard | 4 | 10 | 2 | single_opening_solution |
| L44 | Solvable | hard | Hard | 6 | 392 | 3 | none |

## Level Details

### L1 Boot Link

- Chapter: Boot Sector
- Teaching goal: Learn the basic route: Power -> Relay -> Core.
- Status: Solvable
- Authored difficulty: intro
- Estimated difficulty: Easy (5.5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 5
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 4
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1

### L2 Relay Ladder

- Chapter: Boot Sector
- Teaching goal: Learn that relays chain together and store charge across turns.
- Status: Solvable
- Authored difficulty: intro
- Estimated difficulty: Medium (5.51)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 6
- Solution count (capped): 22
- Average branching factor: 2
- Explored states: 71
- Dead states: 6
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1
  - P2: keeps a win alive; minMoves=4; path=P2
- Dead state examples:
  - moves=4, overload=0, infected=0, path=P2 -> P2 -> P2 -> P2
  - moves=5, overload=0, infected=0, path=P1 -> P2 -> P2 -> P2 -> P2
  - moves=5, overload=0, infected=0, path=P2 -> P2 -> P1 -> P2 -> P2

### L3 First Firewall

- Chapter: Boot Sector
- Teaching goal: Click the Firewall to open a route before trying to charge the Core.
- Status: Solvable
- Authored difficulty: intro
- Estimated difficulty: Medium (7.2)
- Minimal winning path: F1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 6
- Solution count (capped): 15
- Average branching factor: 2
- Explored states: 55
- Dead states: 11
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=5; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=F1 -> F1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=P1 -> P1 -> P1 -> F1

### L4 Split Charge

- Chapter: Boot Sector
- Teaching goal: Feed both relay branches and stack charge on the core efficiently.
- Status: Solvable
- Authored difficulty: light
- Estimated difficulty: Easy (5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 6
- Solution count (capped): 27
- Average branching factor: 2
- Explored states: 45
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1
  - P2: keeps a win alive; minMoves=4; path=P2

### L5 Firewall Router

- Chapter: Firewall Ring
- Teaching goal: Rotate a firewall between two branches and choose the safer route.
- Status: Solvable
- Authored difficulty: light
- Estimated difficulty: Hard (8.56)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 37
- Average branching factor: 2
- Explored states: 188
- Dead states: 49
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=F1 -> F1 -> F1 -> F1
  - moves=4, overload=0, infected=0, path=P1 -> F1 -> F1 -> F1

### L6 Branch Lock

- Chapter: Firewall Ring
- Teaching goal: Use the gate to decide between a short direct route and a slower relay lane.
- Status: Solvable
- Authored difficulty: light
- Estimated difficulty: Hard (8.62)
- Minimal winning path: F1 -> F1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 18
- Average branching factor: 2
- Explored states: 156
- Dead states: 42
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=P1 -> P1 -> P1 -> F1
  - moves=4, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1

### L7 Gate Cascade

- Chapter: Firewall Ring
- Teaching goal: Coordinate two power inputs through one gate and keep both branches useful.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (10.79)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 6 / 8
- Solution count (capped): 1648
- Average branching factor: 3
- Explored states: 1487
- Dead states: 443
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
  - P2: keeps a win alive; minMoves=7; path=P2
- Dead state examples:
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P2
  - moves=3, overload=0, infected=0, path=P1 -> P2 -> P2

### L8 Activate Grid

- Chapter: Firewall Ring
- Teaching goal: Finish with every non-virus node active, not just the core charged.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (10.47)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 6 / 8
- Solution count (capped): 21
- Average branching factor: 2
- Explored states: 219
- Dead states: 90
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=0, path=F1 -> F1 -> P1
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=F1 -> F1 -> F1 -> F1

### L9 Virus Wake

- Chapter: Quarantine Loop
- Teaching goal: Intro virus pressure: pick a lane before corruption spreads through the relay.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (9.13)
- Minimal winning path: F1 -> F1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 6
- Solution count (capped): 9
- Average branching factor: 2
- Explored states: 62
- Dead states: 22
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: tight_move_budget
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> F1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> F1

### L10 Clean Sweep

- Chapter: Quarantine Loop
- Teaching goal: Clean infection with repeated energy while still advancing the core.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (7.5)
- Minimal winning path: P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 6
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=5; path=P1

### L11 Quarantine Fork

- Chapter: Quarantine Loop
- Teaching goal: Clean the corrupted power source, then take the safe branch before virus pressure grows.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (9.12)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 15
- Average branching factor: 2
- Explored states: 139
- Dead states: 49
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=1, path=F1 -> F1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> F1 -> F1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1

### L12 Virus Pressure

- Chapter: Quarantine Loop
- Teaching goal: Two virus fronts force you to route quickly before the budget runs out.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Medium (8.06)
- Minimal winning path: P1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 6 / 8
- Solution count (capped): 116
- Average branching factor: 2
- Explored states: 202
- Dead states: 2
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=6; path=P1
  - P2: keeps a win alive; minMoves=6; path=P2
- Dead state examples:
  - moves=7, overload=0, infected=2, path=P1 -> P1 -> P2 -> P1 -> P2 -> P1 -> P2
  - moves=7, overload=0, infected=2, path=P2 -> P2 -> P1 -> P2 -> P1 -> P2 -> P1

### L13 Overload Trap

- Chapter: Overload Channel
- Teaching goal: Spot the dangerous route and avoid feeding the overload node too hard.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Easy (5.5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 7
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 4
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1

### L14 Split Feed

- Chapter: Overload Channel
- Teaching goal: Send energy around the overload node instead of through it every turn.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Easy (5.5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 8
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 4
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1

### L15 Heat Sink

- Chapter: Overload Channel
- Teaching goal: Use the firewall like a pressure valve to keep the overload route safe.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Medium (6.89)
- Minimal winning path: F1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 8
- Solution count (capped): 54
- Average branching factor: 2
- Explored states: 169
- Dead states: 25
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=5; path=P1
- Dead state examples:
  - moves=4, overload=4, infected=0, path=P1 -> P1 -> P1 -> P1
  - moves=5, overload=6, infected=0, path=P1 -> P1 -> P1 -> P1 -> F1
  - moves=5, overload=5, infected=0, path=P1 -> P1 -> P1 -> P1 -> P1

### L16 Pressure Valve

- Chapter: Overload Channel
- Teaching goal: Balance two power sources across separate overload nodes without blowing the budget.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (8.76)
- Minimal winning path: F1 -> F1 -> F1 -> F1 -> F1
- Minimal moves: 5 / 9
- Solution count (capped): 2511
- Average branching factor: 3
- Explored states: 843
- Dead states: 107
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
  - P2: keeps a win alive; minMoves=6; path=P2
- Dead state examples:
  - moves=5, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1 -> P1
  - moves=5, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1 -> P2
  - moves=5, overload=0, infected=0, path=P1 -> P1 -> P1 -> P2 -> P2

### L17 Dual Feed

- Chapter: District Core
- Teaching goal: Use the firewall to decide when to burst through overload and when to take the safer relay path under virus pressure.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Medium (7.82)
- Minimal winning path: F1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 9
- Solution count (capped): 2767
- Average branching factor: 3
- Explored states: 714
- Dead states: 98
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=5; path=P1
  - P2: keeps a win alive; minMoves=5; path=P2
- Dead state examples:
  - moves=6, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1 -> P1 -> P1
  - moves=6, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1 -> P1 -> P2
  - moves=6, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1 -> P2 -> P2

### L18 Crossfire District

- Chapter: District Core
- Teaching goal: Split power across a gate lane and a virus-pressured relay lane before collapse catches up.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (9.28)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P2
- Minimal moves: 5 / 6
- Solution count (capped): 84
- Average branching factor: 3
- Explored states: 829
- Dead states: 177
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: tight_move_budget
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
  - P2: keeps a win alive; minMoves=5; path=P2
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=3, overload=1, infected=1, path=P1 -> F1 -> F1
  - moves=3, overload=1, infected=0, path=P1 -> F1 -> P2

### L19 Zero Infection

- Chapter: District Core
- Teaching goal: Stabilize the corrupted source, then route through a clean relay lane before virus pressure compounds.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (11.36)
- Minimal winning path: F1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 6 / 8
- Solution count (capped): 592
- Average branching factor: 3
- Explored states: 990
- Dead states: 390
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
  - P2: keeps a win alive; minMoves=7; path=P2
- Dead state examples:
  - moves=3, overload=0, infected=1, path=F1 -> F1 -> P1
  - moves=3, overload=0, infected=2, path=F1 -> F1 -> P2
  - moves=3, overload=0, infected=1, path=P1 -> F1 -> F1

### L20 District Core

- Chapter: District Core
- Teaching goal: Final exam: cleanse the source, choose between overload burst and safe relay routing, and finish the district core.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (15.15)
- Minimal winning path: F1 -> F1 -> P1 -> P1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 9 / 10
- Solution count (capped): 1472
- Average branching factor: 3
- Explored states: 3874
- Dead states: 2032
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: tight_move_budget
- Root branch analysis:
  - F1: keeps a win alive; minMoves=9; path=F1
  - P1: keeps a win alive; minMoves=10; path=P1
  - P2: keeps a win alive; minMoves=10; path=P2
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=2, overload=0, infected=1, path=P1 -> P2
  - moves=2, overload=0, infected=2, path=P2 -> P2

### L21 Twin Injectors

- Chapter: Boot Sector
- Teaching goal: Use two power taps in sequence before committing to the relay lane.
- Status: Solvable
- Authored difficulty: light
- Estimated difficulty: Medium (6)
- Minimal winning path: P1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 6
- Solution count (capped): 16
- Average branching factor: 2
- Explored states: 15
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=4; path=P1
  - P2: keeps a win alive; minMoves=4; path=P2

### L22 Switchback Gate

- Chapter: Firewall Ring
- Teaching goal: Switch between safe relay output and overload burst timing.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (6.41)
- Minimal winning path: F1 -> F1 -> F1 -> F1
- Minimal moves: 4 / 8
- Solution count (capped): 54
- Average branching factor: 2
- Explored states: 116
- Dead states: 8
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=5; path=P1
- Dead state examples:
  - moves=5, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1 -> P1
  - moves=6, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1 -> P1 -> F1
  - moves=6, overload=0, infected=0, path=P1 -> P1 -> P1 -> P1 -> P1 -> P1

### L23 Median Filter

- Chapter: Quarantine Loop
- Teaching goal: Alternate between safe relay output and risky overload burst under virus pressure.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (7.19)
- Minimal winning path: F1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 8
- Solution count (capped): 42
- Average branching factor: 2
- Explored states: 197
- Dead states: 39
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=5; path=P1
- Dead state examples:
  - moves=5, overload=0, infected=1, path=P1 -> F1 -> F1 -> F1 -> F1
  - moves=5, overload=0, infected=1, path=P1 -> F1 -> F1 -> P1 -> P1
  - moves=5, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1 -> P1

### L24 Purge Junction

- Chapter: Quarantine Loop
- Teaching goal: Clean a corrupted relay first, then route both branches to finish the core.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Easy (5.5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 8
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 4
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1

### L25 Purifier Wake

- Chapter: Purifier Loop
- Teaching goal: Route energy through the purifier lane to stabilize an infected relay while charging the core.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (6)
- Minimal winning path: P1 -> P1 -> P1 -> P1
- Minimal moves: 4 / 7
- Solution count (capped): 39
- Average branching factor: 2
- Explored states: 58
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=4; path=P1
  - P2: keeps a win alive; minMoves=4; path=P2

### L26 Sanitize or Rush

- Chapter: Purifier Loop
- Teaching goal: Choose between direct core feed and purifier support to control virus pressure.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (11.14)
- Minimal winning path: F1 -> P1 -> F1 -> P1 -> F1 -> P1 -> P1
- Minimal moves: 7 / 9
- Solution count (capped): 54
- Average branching factor: 2
- Explored states: 370
- Dead states: 132
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=7; path=F1
  - P1: keeps a win alive; minMoves=9; path=P1
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> F1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> F1

### L27 Sterile Route

- Chapter: Purifier Loop
- Teaching goal: Keep purifier support online to finish charge while clearing all infection.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (13.34)
- Minimal winning path: P1 -> P1 -> P1 -> P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 8 / 10
- Solution count (capped): 45
- Average branching factor: 2
- Explored states: 219
- Dead states: 122
- Overflow paths: 0
- Clickable nodes at start: P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - P1: keeps a win alive; minMoves=8; path=P1
  - P2: keeps a win alive; minMoves=9; path=P2
- Dead state examples:
  - moves=3, overload=0, infected=1, path=P2 -> P2 -> P2
  - moves=4, overload=0, infected=0, path=P1 -> P2 -> P2 -> P2
  - moves=4, overload=0, infected=0, path=P2 -> P1 -> P2 -> P2

### L28 Sanitation Gate

- Chapter: District Core
- Teaching goal: Balance firewall routing between overload burst and purifier-backed stability.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (9.84)
- Minimal winning path: F1 -> F1 -> P1 -> F1 -> P1 -> P1
- Minimal moves: 6 / 9
- Solution count (capped): 72
- Average branching factor: 2
- Explored states: 428
- Dead states: 131
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> F1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1

### L29 Purity Switch

- Chapter: Purifier Loop
- Teaching goal: Use a firewall gate to decide when purifier support outranks raw relay throughput.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (11.89)
- Minimal winning path: F1 -> F1 -> P1 -> F1 -> P1 -> P1 -> F1 -> P1
- Minimal moves: 8 / 10
- Solution count (capped): 108
- Average branching factor: 2
- Explored states: 371
- Dead states: 117
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=8; path=F1
  - P1: keeps a win alive; minMoves=9; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=F1 -> P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1

### L30 Patch Window

- Chapter: Purifier Loop
- Teaching goal: Choose between overload burst and purifier cleanse windows while finishing the core objective.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Hard (9.1)
- Minimal winning path: P2 -> P2 -> F1 -> F1 -> F1
- Minimal moves: 5 / 8
- Solution count (capped): 1016
- Average branching factor: 3
- Explored states: 2421
- Dead states: 445
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
  - P2: keeps a win alive; minMoves=5; path=P2
- Dead state examples:
  - moves=4, overload=0, infected=1, path=F1 -> P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1
  - moves=4, overload=0, infected=0, path=P1 -> P2 -> P1 -> P1

### L31 Sterile Lattice

- Chapter: Purifier Loop
- Teaching goal: Rotate firewall modes to keep purifier support online while cleansing and routing through relay chains.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (10.31)
- Minimal winning path: F1 -> F1 -> F1 -> P1 -> F1 -> F1 -> F1
- Minimal moves: 7 / 10
- Solution count (capped): 308
- Average branching factor: 2
- Explored states: 485
- Dead states: 106
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=7; path=F1
  - P1: keeps a win alive; minMoves=8; path=P1
- Dead state examples:
  - moves=4, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1
  - moves=5, overload=0, infected=1, path=F1 -> P1 -> P1 -> P1 -> P1
  - moves=5, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1 -> P1

### L32 Quarantine Bypass

- Chapter: District Core
- Teaching goal: Alternate firewall routes to keep overload under control while purifier support preserves full activation.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (12.78)
- Minimal winning path: F1 -> F1 -> P1 -> P1 -> P1 -> F1 -> P1
- Minimal moves: 7 / 9
- Solution count (capped): 256
- Average branching factor: 3
- Explored states: 5996
- Dead states: 2276
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=7; path=F1
  - P1: dead branch; minMoves=n/a; path=P1
  - P2: keeps a win alive; minMoves=8; path=P2
- Dead state examples:
  - moves=1, overload=0, infected=0, path=P1
  - moves=2, overload=2, infected=1, path=P1 -> F1
  - moves=2, overload=0, infected=1, path=P1 -> P1

### L33 Containment Broker

- Chapter: District Core
- Teaching goal: Coordinate dual sources so purifier upkeep and core throughput do not fight each other.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (8.6)
- Minimal winning path: P2 -> F1 -> F1 -> P2
- Minimal moves: 4 / 10
- Solution count (capped): 3907
- Average branching factor: 3
- Explored states: 8459
- Dead states: 2260
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
  - P2: keeps a win alive; minMoves=4; path=P2
- Dead state examples:
  - moves=4, overload=0, infected=2, path=P1 -> P1 -> P1 -> P1
  - moves=4, overload=1, infected=2, path=P1 -> P1 -> P1 -> P2
  - moves=4, overload=1, infected=2, path=P1 -> P1 -> P2 -> P1

### L34 Vector Balance

- Chapter: District Core
- Teaching goal: Balance route activation and full sanitation in the same run under two-lane pressure.
- Status: Solvable
- Authored difficulty: challenge
- Estimated difficulty: Hard (14.86)
- Minimal winning path: F1 -> F1 -> P1 -> P1 -> F1 -> F1 -> F1 -> F1 -> F1 -> F1
- Minimal moves: 10 / 12
- Solution count (capped): 188
- Average branching factor: 2
- Explored states: 2011
- Dead states: 960
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=10; path=F1
  - P1: keeps a win alive; minMoves=11; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=F1 -> F1 -> F1 -> P1
  - moves=4, overload=0, infected=1, path=F1 -> P1 -> F1 -> F1

### L35 Sanitation Circuit

- Chapter: District Core
- Teaching goal: Chain two firewall decisions so purifier cleanup and overload lanes stay synchronized.
- Status: Solvable
- Authored difficulty: challenge
- Estimated difficulty: Hard (11.95)
- Minimal winning path: F1 -> F1 -> P1 -> F2 -> F2 -> F1 -> F2
- Minimal moves: 7 / 9
- Solution count (capped): 1005
- Average branching factor: 3
- Explored states: 10927
- Dead states: 3553
- Overflow paths: 0
- Clickable nodes at start: F1, F2, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=7; path=F1
  - F2: keeps a win alive; minMoves=7; path=F2
  - P1: keeps a win alive; minMoves=8; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=F1 -> F1 -> F1 -> F2
  - moves=4, overload=0, infected=1, path=F1 -> F1 -> F1 -> P1

### L36 Protocol Apex

- Chapter: District Core
- Teaching goal: Final gauntlet: firewall routing must balance overload burst with purifier-backed sanitation.
- Status: Solvable
- Authored difficulty: boss
- Estimated difficulty: Hard (12.07)
- Minimal winning path: F1 -> F1 -> F1 -> P1 -> F1 -> P1 -> P1
- Minimal moves: 7 / 9
- Solution count (capped): 1422
- Average branching factor: 3
- Explored states: 6527
- Dead states: 2248
- Overflow paths: 0
- Clickable nodes at start: F1, P1, P2
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=7; path=F1
  - P1: keeps a win alive; minMoves=8; path=P1
  - P2: keeps a win alive; minMoves=8; path=P2
- Dead state examples:
  - moves=2, overload=0, infected=1, path=P1 -> P1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> F1
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1

### L37 Splitter Primer

- Chapter: Splitter Lab
- Teaching goal: Feed one splitter to power two relay lanes in the same turn.
- Status: Solvable
- Authored difficulty: intro
- Estimated difficulty: Easy (5.5)
- Minimal winning path: P1 -> P1 -> P1
- Minimal moves: 3 / 6
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 4
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=3; path=P1

### L38 Forked Budget

- Chapter: Splitter Lab
- Teaching goal: Choose between a direct overloaded lane and a safer but weaker splitter lane.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (8.03)
- Minimal winning path: F1 -> F1 -> F1 -> F1 -> F1
- Minimal moves: 5 / 6
- Solution count (capped): 28
- Average branching factor: 2
- Explored states: 87
- Dead states: 15
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: tight_move_budget
- Root branch analysis:
  - F1: keeps a win alive; minMoves=5; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=2, overload=0, infected=0, path=P1 -> P1
  - moves=3, overload=1, infected=0, path=P1 -> P1 -> F1
  - moves=3, overload=0, infected=0, path=P1 -> P1 -> P1

### L39 Cleansing Split

- Chapter: Splitter Lab
- Teaching goal: Use splitter coverage to keep purifier support online while clearing corruption and charging the core.
- Status: Solvable
- Authored difficulty: medium
- Estimated difficulty: Medium (7.5)
- Minimal winning path: P1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 1
- Average branching factor: 1
- Explored states: 6
- Dead states: 0
- Overflow paths: 0
- Clickable nodes at start: P1
- Non-interactable clickables: none
- Issues: single_opening_solution, single_solution_path
- Root branch analysis:
  - P1: keeps a win alive; minMoves=5; path=P1

### L40 Split Containment

- Chapter: Splitter Lab
- Teaching goal: Alternate firewall lanes so splitter support can stabilize virus pressure while overload remains useful.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Medium (7.04)
- Minimal winning path: F1 -> F1 -> F1 -> P1
- Minimal moves: 4 / 8
- Solution count (capped): 58
- Average branching factor: 2
- Explored states: 197
- Dead states: 34
- Overflow paths: 0
- Clickable nodes at start: F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - F1: keeps a win alive; minMoves=4; path=F1
  - P1: keeps a win alive; minMoves=6; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=1, path=P1 -> P1 -> P1
  - moves=4, overload=0, infected=1, path=P1 -> P1 -> F1 -> P1
  - moves=4, overload=0, infected=1, path=P1 -> P1 -> P1 -> P1

### L41 Breaker Primer

- Chapter: Breaker Node
- Teaching goal: Prime the breaker before feeding an overload lane, or the route blows out.
- Status: Solvable
- Authored difficulty: intro
- Estimated difficulty: Medium (7.25)
- Minimal winning path: B1 -> P1
- Minimal moves: 2 / 4
- Solution count (capped): 3
- Average branching factor: 2
- Explored states: 21
- Dead states: 7
- Overflow paths: 0
- Clickable nodes at start: B1, P1
- Non-interactable clickables: none
- Issues: single_opening_solution
- Root branch analysis:
  - B1: keeps a win alive; minMoves=2; path=B1
  - P1: dead branch; minMoves=n/a; path=P1
- Dead state examples:
  - moves=1, overload=2, infected=0, path=P1
  - moves=2, overload=2, infected=0, path=P1 -> B1
  - moves=2, overload=2, infected=0, path=P1 -> P1

### L42 Heat Budget

- Chapter: Breaker Node
- Teaching goal: Raw pushing overloads the lane; time a breaker prime to keep a final feed safe.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (8.8)
- Minimal winning path: B1 -> P1 -> P1 -> P1 -> P1
- Minimal moves: 5 / 7
- Solution count (capped): 15
- Average branching factor: 2
- Explored states: 150
- Dead states: 45
- Overflow paths: 0
- Clickable nodes at start: B1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - B1: keeps a win alive; minMoves=5; path=B1
  - P1: keeps a win alive; minMoves=5; path=P1
- Dead state examples:
  - moves=4, overload=0, infected=0, path=B1 -> B1 -> B1 -> B1
  - moves=4, overload=0, infected=0, path=B1 -> B1 -> P1 -> B1
  - moves=4, overload=0, infected=0, path=B1 -> P1 -> B1 -> B1

### L43 Grid Safeguard

- Chapter: Breaker Node
- Teaching goal: Complete activate_all without blowing the overload lane by timing breaker primes.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (9.26)
- Minimal winning path: B1 -> P1 -> B1 -> P1
- Minimal moves: 4 / 7
- Solution count (capped): 10
- Average branching factor: 2
- Explored states: 126
- Dead states: 58
- Overflow paths: 0
- Clickable nodes at start: B1, P1
- Non-interactable clickables: none
- Issues: single_opening_solution
- Root branch analysis:
  - B1: keeps a win alive; minMoves=4; path=B1
  - P1: dead branch; minMoves=n/a; path=P1
- Dead state examples:
  - moves=1, overload=2, infected=0, path=P1
  - moves=2, overload=2, infected=0, path=P1 -> B1
  - moves=2, overload=2, infected=0, path=P1 -> P1

### L44 Breaker Mesh

- Chapter: Breaker Node
- Teaching goal: Chain firewall lane control with splitter support while timing breaker primes for overload bursts.
- Status: Solvable
- Authored difficulty: hard
- Estimated difficulty: Hard (10.88)
- Minimal winning path: F1 -> B1 -> F1 -> B1 -> F1 -> F1
- Minimal moves: 6 / 8
- Solution count (capped): 392
- Average branching factor: 3
- Explored states: 5195
- Dead states: 1630
- Overflow paths: 0
- Clickable nodes at start: B1, F1, P1
- Non-interactable clickables: none
- Issues: none
- Root branch analysis:
  - B1: keeps a win alive; minMoves=7; path=B1
  - F1: keeps a win alive; minMoves=6; path=F1
  - P1: keeps a win alive; minMoves=7; path=P1
- Dead state examples:
  - moves=3, overload=0, infected=0, path=B1 -> B1 -> B1
  - moves=3, overload=1, infected=0, path=B1 -> B1 -> P1
  - moves=3, overload=1, infected=0, path=B1 -> P1 -> B1

## Findings

### Overall Solvability

All 44 levels are solvable within the current ruleset. The solver found at least one winning action sequence for every authored level, and no level hit the propagation search cutoff.

### Difficulty Curve

Estimated difficulty distribution is Easy 6, Medium 14, Hard 24, Unsolvable 0. The main pacing spike is L2 (intro -> Medium), L3 (intro -> Medium), L5 (light -> Hard), L6 (light -> Hard), L41 (intro -> Medium), L7 (medium -> Hard), L8 (medium -> Hard), L9 (medium -> Hard), L11 (medium -> Hard), L21 (light -> Medium), L26 (medium -> Hard), L27 (medium -> Hard), L29 (medium -> Hard), L30 (medium -> Hard). The main undertuned pocket is L13 (medium -> Easy), L14 (medium -> Easy), L24 (medium -> Easy), L4 (light -> Easy), L12 (hard -> Medium), L15 (hard -> Medium), L17 (hard -> Medium), L40 (hard -> Medium).

### Detected Gameplay Issues

Single-solution or near-single-solution levels: L1 (1 solution), L10 (1 solution), L13 (1 solution), L14 (1 solution), L24 (1 solution), L37 (1 solution), L39 (1 solution). Tight move budgets remain in L9 (5/6), L18 (5/6), L20 (9/10), L38 (5/6). No systemic instability remains in overload or virus propagation under the current ruleset.

### Balance Problems

Early and mid-game difficulty jumps are steeper than the authored labels imply. In particular, L2, L3, L5, L6, L41, L7, L8, L9, L11, L21, L26, L27, L29, L30 demand more search than their current tier suggests. Several later levels land below their authored tier: L13, L14, L24, L4, L12, L15, L17, L40. This is most noticeable on intro routing levels where the player effectively repeats one correct action sequence with little room for experimentation.

### Rebalancing Recommendations

Either retag L2, L3, L5, L6, L41, L7, L8, L9, L11, L21, L26, L27, L29, L30 upward, or reduce their branching pressure by trimming one redundant route or raising their move slack by 1. Move L13, L14, L24, L4, L12, L15, L17, L40 earlier in the campaign or retag them downward so the late-game arc does not flatten out. Keep `CLEANSE_THRESHOLD = 2`; raising it back to 4 would make corruption-cleaning objectives disproportionately brittle. Keep corruption spread exclusive to `virus` nodes; allowing every corrupted node to spread creates exponential contagion and collapses solvability.

### UX Playability

Power, Firewall, and Breaker nodes are interactable, and the validator confirms every authored clickable node is interactable at level start. The remaining UX risk is explanatory: players still need strong feedback for why a route is a dead branch, why firewall routing changed, and when a primed breaker traded throughput for safety.

### Automation Recommendation

Treat `node tools/qa/validate-levels.mjs` or `scripts/validate-levels.ps1` as a mandatory pre-merge check whenever `src/levels.js`, `src/config.js`, `src/node.js`, or `src/energySystem.js` changes. The same solver can later reject unsolved procedural layouts automatically.

## Automated Validation Workflow

- Tool entry point: `node tools/qa/validate-levels.mjs`.
- Solver: bounded BFS over player actions at turn boundaries, deduped by canonical state key.
- Validation output: console summary, JSON snapshot, and this markdown report.
- Recommended use: run after editing `src/levels.js`, `src/config.js`, `src/node.js`, or `src/energySystem.js`.
- Future extension: procedural generator can emit candidate levels into the same solver and reject unsolved layouts automatically.