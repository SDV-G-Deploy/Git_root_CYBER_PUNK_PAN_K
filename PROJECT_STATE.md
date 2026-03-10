# PROJECT_STATE.md

Last updated: 2026-03-10

## Repository State Snapshot
- Current local HEAD at start of this pass: `8fe2e69` on `main`
- Purifier recovery merge remains in history: `acb8cbd` (includes `0faa562`)

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under pressure from infection, overload, firewall routing constraints, and multi-objective level logic.

## Active Runtime and Structure
- Active playable entry path: `index.html` -> `src/bootstrap.js` -> `src/engine.js`
- Live gameplay/content logic is in `src/`
- Root-level `game.js`, `main.js`, `levels.js` are legacy files and not the active runtime path

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

## Campaign Content State
- Total authored levels: **36** (`L1`-`L36`)
- Chapter distribution:
  - Boot Sector: 5
  - Firewall Ring: 5
  - Quarantine Loop: 6
  - Overload Channel: 4
  - Purifier Loop: 6
  - District Core: 10
- Objective distribution:
  - `power_core`: 36
  - `activate_all`: 7
  - `clean_corruption`: 11

## Latest Campaign Expansion (Night Pass)
Added new late-campaign levels on existing mechanics only:
- `L29` Purity Switch
- `L30` Patch Window
- `L31` Sterile Lattice
- `L32` Quarantine Bypass
- `L33` Containment Broker
- `L34` Vector Balance
- `L35` Sanitation Circuit
- `L36` Protocol Apex

Design focus: stronger purifier-era and mixed-priority families (firewall routing + overload risk + virus pressure + sanitation goals).

## QA and Reliability State
- Added runtime smoke script: `tools/qa/runtime-smoke.mjs`
- Wrapper command: `scripts/runtime-smoke.ps1`
- Smoke checks verify core lifecycle flow (level start/switch/retry/next, hints, and telemetry run_end integrity).

## Current Validation Status
Latest verified state after this pass:
- `validate-levels`: pass
  - solvability: **36/36**
  - unsolved: 0
  - search cutoffs: 0
- `build-pack`: pass
  - candidates: 36
  - accepted: 10
  - deferred: 26
  - rejected: 0
- `runtime-smoke`: pass

## Protected Systems
Do not touch unless explicitly requested:
- Splitter
- Fuse/Stabilizer
- Delay
- Campaign systems

## Known Limitations
- Early tutorial cluster (`L1`, `L2`, `L4`, `L10`, `L13`, `L14`, `L24`) still contains single-path style levels by design/history.
- Some late levels remain high-pressure (`tight_move_budget` on `L29`, `L34`).
- Current structured pack template still selects a subset of campaign levels, so most new late levels remain deferred in slot assignment.

## Recommended Next Steps
1. Run a narrow early-campaign softening pass (`L1`-`L4`) to reduce repeated single-path feel without removing onboarding clarity.
2. Run telemetry-calibrated difficulty pass for `L29`-`L36` after real play sessions, then retag only where evidence supports it.
3. Keep purifier/runtime rules unchanged; continue improving campaign quality through content-level tuning.
