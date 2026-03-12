# PROJECT_STATE.md

Last updated: 2026-03-12

## Repository State Snapshot
- Local HEAD at start of splitter pass: `5199af7` on `main`
- This pass is a tightly scoped mechanic wave for Splitter Node only.

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under pressure from infection, overload, firewall routing constraints, and multi-objective level logic.

## Active Runtime and Structure
- Active playable entry path: `index.html` -> `src/bootstrap.js` -> `src/engine.js`
- Live gameplay/content/UI logic is in `src/`
- Root-level `game.js`, `main.js`, `levels.js` are legacy and not the active runtime path

## Core Mechanics Status
- Power and Firewall nodes are player-clickable inputs.
- Relay, Splitter, Purifier, Virus, Overload, and Core nodes are passive/autonomous.
- Splitter Node is now implemented in runtime with deterministic split behavior:
  - not clickable;
  - emits when charged like other passive emitters;
  - divides `emitPower` evenly across enabled outgoing edges;
  - odd remainder goes deterministically by ascending edge id order;
  - attenuation/capacity/overload rules apply per output edge after split.
- Protected systems were not altered in this pass:
  - daily/seed behavior;
  - pack semantics;
  - classifier semantics;
  - slot thresholds;
  - generator heuristics;
  - Fuse/Stabilizer and Delay.

## Campaign Content State
- Total authored levels: **40** (`L1`-`L40`)
- Chapters:
  - Boot Sector: 5
  - Firewall Ring: 5
  - Quarantine Loop: 6
  - Overload Channel: 4
  - Purifier Loop: 6
  - District Core: 10
  - Splitter Lab: 4
- Objective totals:
  - `power_core`: 40
  - `activate_all`: 8
  - `clean_corruption`: 13

## Latest Scoped Pass (2026-03-12) - Splitter Node Wave
### Mechanic/runtime
- Added node type `splitter` and visual token/color support.
- Implemented deterministic split emission in `emitPackets` for splitter nodes.
- Kept existing attenuation, capacity, overload, and turn-flow semantics unchanged.

### Player readability
- Added splitter node legend entry (`S`) in UI.
- Added splitter hover text explaining passive split behavior and deterministic remainder rule.
- Added splitter in node-type label mapping and active-state readout.

### QA/model parity
- Updated rule-model contract to include splitter behavior and energy rule description.
- Runtime smoke checkpoints now include splitter levels (`L37`, `L40`).

### New handcrafted introductory levels
- `L37` Splitter Primer (intro)
- `L38` Forked Budget (medium)
- `L39` Cleansing Split (medium)
- `L40` Split Containment (hard)

## Current Validation Status
Latest verified state after this pass:
- `validate-levels`: pass
  - solvability: **40/40**
  - unsolved: 0
  - search cutoffs: 0
- `build-pack`: pass
  - candidates: 40
  - accepted: 10
  - deferred: 30
  - rejected: 0
- `runtime-smoke`: pass
  - checkpoints include splitter slice (`L37`, `L40`)

## Known Limitations
- Intro splitter objective levels `L37` and `L39` still register single-solution-path flags under current solver heuristics.
- Remainder priority is deterministic but data-order-facing (`edge id` order), so readability depends on authored edge naming discipline.

## Recommended Next Steps
1. Add one optional alternate solve line to `L39` if reducing single-path pressure becomes a design goal.
2. If splitter coverage expands, add one dedicated QA probe for uneven split remainder (`emitPower % outputs != 0`) in scripted smoke.
3. Keep further mechanic waves isolated (no cross-mechanic rewrite with protected systems).
