# PROJECT_STATE.md

Last updated: 2026-03-10

## Repository State Snapshot
- Current local HEAD at start of this pass: `2d7be28` on `main`
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

## Purifier-Era Levels
- `L25` Purifier Wake
- `L26` Sanitize or Rush
- `L27` Sterile Route
- `L28` Sanitation Gate

## Latest Integration State
- `L25` now tagged as medium (`difficulty` + `difficultyTag`) to match practical medium-slot fit.
- `L26` and `L27` remain mechanically unchanged in this pass.
- Purifier mechanic behavior is unchanged.

## Current Validation Status
Latest verified state after purifier integration pass:
- `validate-levels`: pass
- solvability: 28/28 solvable, 0 unsolved, 0 search cutoffs
- purifier-era issue flags for `L25`/`L26`/`L27`: none
- `build-pack`: pass (28 candidates, 10 accepted, 18 deferred, 0 rejected)
- selected purifier presence in actual pack lineup:
  - `L25` selected as medium slot `#5`
  - `L28` selected as hard slot `#8`

## Protected Systems
Do not touch unless explicitly requested:
- Splitter
- Fuse/Stabilizer
- Delay
- Campaign systems

## Known Limitations
- Some earlier non-purifier levels are still tight or single-solution-leaning.
- `L26` and `L27` are still deferred by slot selection in current pack output.
- Balance tuning remains separate from purifier mechanic correctness.

## Recommended Next Steps
1. Human-guided decision: keep `L25` as medium-tag purifier onboarding, or retune placement intent if campaign pacing prefers later purifier exposure.
2. If more purifier presence is desired, run a separate narrow pass for `L26`/`L27` slot fit only (no heuristic/semantic changes).
3. Keep purifier mechanic unchanged unless explicitly requested.