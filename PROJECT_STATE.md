# PROJECT_STATE.md

Last updated: 2026-03-10

## Repository State Snapshot
- Current mainline commit: `acb8cbd`
- `acb8cbd` merges branch `rescue/purifier-recovery-2026-03-10`
- Purifier recovery commit present in history: `0faa562`

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

## Current Verified UI and QA Support
- Purifier legend and coach feedback exist.
- Purifier visual pulse and render support exist.
- Hint support for idle purifier exists.
- QA rule model includes purifier.
- Pack build and validation pipeline recognize purifier content.

## Current Validation Status
Latest verified state:
- `validate-levels`: pass
- solvability: 28/28 solvable, 0 unsolved, 0 search cutoffs
- `build-pack`: pass (28 candidates, 10 accepted, 18 deferred, 0 rejected)

## Protected Systems
Do not touch unless explicitly requested:
- Splitter
- Fuse/Stabilizer
- Delay
- Campaign systems

## Known Limitations
- Some levels are still tight or single-solution-leaning.
- Validator flags zero-margin move budgets in some purifier-era levels.
- Balance tuning remains separate from purifier mechanic correctness.

## Recommended Next Steps
1. Optional narrow balance pass for `L25`-`L27` only.
2. Reduce brittle single-solution pressure without changing purifier mechanic.
3. Avoid expanding scope into new systems.
