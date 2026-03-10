# PROJECT_STATE.md

Last updated: 2026-03-10

## Repository State Snapshot
- Current mainline commit before this balance pass: `07f570b`
- Purifier recovery merge remains in history: `acb8cbd` (includes `0faa562`)

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under pressure from infection, overload, firewall routing constraints, and objective logic.

## Core Implemented Mechanics
- Power nodes inject energy.
- Firewall nodes open/close/rotate route mode and may inject energy when open.
- Relay, purifier, virus, overload, and core nodes are passive (not directly clickable).
- Turn flow: click -> prepare turn -> seed packet -> queue propagation -> virus spread -> purifier effects -> decay -> objective check -> lose check.
- Energy propagation uses node `emitPower` (not full charge dump).
- Edge attenuation reduces output.
- Above-capacity output adds global overload.
- Propagation safeguard: max 256 propagation steps per turn.
- Virus adds corruption to neighbors each turn.
- Corruption threshold infects nodes.
- Infected nodes accept only 50% incoming energy.
- Enough accepted energy in a turn can cleanse infection.
- Overload nodes can explode if throughput exceeds threshold.
- Explosions disable connected edges and add overload penalty.

## Purifier Mechanic
Purifier is implemented as a passive support node:
- Purifier is a node type.
- Not directly clickable.
- When powered above threshold and not corrupted/exploded, it reduces corruption progress on adjacent non-virus nodes.
- Effect occurs at end of turn after virus spread.
- Can fully cleanse adjacent infection when corruption progress reaches 0.

## Current Verified Level State
- Total authored levels: 28 (`L1`..`L28`)
- Purifier-focused levels:
  - `L25` Purifier Wake
  - `L26` Sanitize or Rush
  - `L27` Sterile Route
  - `L28` Sanitation Gate

## Latest Balance Pass (L25-L27)
- `L25`: added optional secondary power tap (`P2`) and edge `E7: P2 -> U1`.
- `L26`: increased `movesLimit` from 8 to 9.
- `L27`: increased `movesLimit` from 8 to 10, added weaker optional secondary tap (`P2`) and edge `E8: P2 -> U1`.
- Purifier core behavior and teaching goals were preserved.

## Current Validation Status
Latest verified state after this pass:
- `validate-levels`: pass
- solvability: 28/28 solvable, 0 unsolved, 0 search cutoffs
- purifier-era issue flags for `L25`/`L26`/`L27`: none
- `build-pack`: pass (28 candidates, 10 accepted, 18 deferred, 0 rejected)
- selected pack slot lineup unchanged (still includes `L28` as slot #8 hard)

## Protected Systems
Do not touch unless explicitly requested:
- Splitter
- Fuse/Stabilizer
- Delay
- Campaign systems

## Known Limitations
- Some earlier non-purifier levels are still tight or single-solution-leaning.
- `L25`-`L27` remain deferred by pack template selection (not a solvability failure).
- Balance tuning remains separate from purifier mechanic correctness.

## Recommended Next Steps
1. If needed, run a separate narrow balance pass for remaining high-friction non-purifier levels (for example early tutorial bottlenecks).
2. Keep purifier mechanic unchanged unless explicitly requested.
3. Avoid scope expansion into protected systems.