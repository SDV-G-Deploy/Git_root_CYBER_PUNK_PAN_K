# PROJECT_STATE.md

Last updated: 2026-03-11

## Repository State Snapshot
- Local HEAD at start of this autonomous pass: `8fe2e69` on `main`
- Purifier recovery merge remains in history: `acb8cbd` (includes `0faa562`)

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under pressure from infection, overload, firewall routing constraints, and multi-objective level logic.

## Active Runtime and Structure
- Active playable entry path: `index.html` -> `src/bootstrap.js` -> `src/engine.js`
- Live gameplay/content/UI logic is in `src/`
- Root-level `game.js`, `main.js`, `levels.js` are legacy and not the active runtime path
- Added repo clarity doc: `README.md` (runtime map + QA flow + authored-vs-pack distinction)

## Core Mechanics Status
- Power and Firewall nodes are player-clickable inputs.
- Relay, Purifier, Virus, Overload, and Core nodes remain passive/autonomous.
- Purifier behavior unchanged this pass (no runtime mechanic rewrite).
- Protected mechanics were not altered: Splitter, Fuse/Stabilizer, Delay, classifier semantics, slot thresholds, generator heuristics.

## Campaign Content State
- Total authored levels: **36** (`L1`-`L36`)
- Chapters:
  - Boot Sector: 5
  - Firewall Ring: 5
  - Quarantine Loop: 6
  - Overload Channel: 4
  - Purifier Loop: 6
  - District Core: 10
- Objective totals:
  - `power_core`: 36
  - `activate_all`: 7
  - `clean_corruption`: 11

## Latest Autonomous Pass (2026-03-11)
### Early campaign / onboarding calibration
- `L1`: move budget increased `4 -> 5` (less punitive onboarding pacing)
- `L2`: move budget increased `5 -> 6`, added optional secondary source/edge (`P2`, `E5`) and a light bypass (`E4`) to remove single-solution pressure
- `L3`: move budget increased `5 -> 6`
- `L4`: added optional secondary source/route (`P2`, `E5`) to preserve teaching while increasing opening freedom

### Late campaign calibration
- `L29`: move budget increased `9 -> 10`
- `L32`: added optional secondary source/route (`P2`, `E10`) to reduce single-opening pressure
- `L33`: added optional alternate injection route (`E11`) to reduce brittle openings
- `L34`: move budget increased `11 -> 12`

### Campaign presentation / surfacing
- HUD now includes campaign status (`authored total`, chapter count, unlocked/cleared/perfect)
- Level header now shows campaign position (`Level X/Y`)
- Level select labels now include objective tags (`CORE`, `GRID`, `CLEAN`) using engine-provided level metadata
- Tutorial copy now explicitly explains authored campaign visibility vs QA structured-pack tooling

### Mobile / touch UX
- Input hover tracking moved to pointer events (`pointermove`/`pointerleave` + `pointercancel`)
- Touch copy added in coach/tutorial text (no desktop-only hover assumption)
- Tutorial overlay scrolling hardened (`-webkit-overflow-scrolling`, `overscroll-behavior`) and sticky action bar
- Mobile HUD control layout updated so level select stays full-width and primary buttons remain accessible
- Canvas touch behavior tightened with `touch-action: none` for reliable tap interaction

### QA / smoke hardening
- Expanded `tools/qa/runtime-smoke.mjs` coverage:
  - level-list consistency checks
  - checkpoint sweep across early + late campaign (`L1`, `L2`, `L4`, `L25`, `L29`, `L32`, `L34`, `L36`)
  - hint tier progression cap checks
  - reset/retry lifecycle checks
  - boundary `nextLevel` check at final level
  - multi-objective metadata sanity (`L30`)
  - save/progression sanity via `applyRunSummaryToSave` after a real L1 win
  - telemetry parity checks for JSON vs JSONL exports

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
- `runtime-smoke`: pass (expanded coverage)

## Known Limitations
- `L1` remains intentionally single-solution as the strict first onboarding step.
- Legacy single-path levels still exist outside the narrowed scope (`L10`, `L13`, `L14`, `L24`).
- Structured pack is intentionally selective (`10/36`) and should continue to be treated as QA curation, not full campaign replacement.

## Recommended Next Steps
1. Run telemetry-driven checks to decide whether `L1` should stay strict or get a minimal optional branch.
2. Perform a second targeted pass on remaining legacy single-path outliers (`L10`, `L13`, `L14`, `L24`) without changing core mechanics.
3. If desired, add a small UI affordance to filter level select by chapter while preserving existing save compatibility.
