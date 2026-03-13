# PROJECT_STATE.md

Last updated: 2026-03-13

## Repository State Snapshot
- Local HEAD at start of this pass: `f109f88` on `main`
- Starting tree state: clean tracked files, `SPRITES_IMAGES/` present as untracked asset folder

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under infection, overload, firewall routing constraints, and multi-objective level logic.

## Active Runtime and Structure
- Active playable entry path: `index.html` -> `src/bootstrap.js` -> `src/engine.js`
- Live gameplay/content/UI logic is in `src/`
- Root-level `game.js`, `main.js`, `levels.js` are legacy and not the active runtime path

## Core Mechanics Status
- Clickable inputs: `power`, `firewall`, `breaker`
- Passive/autonomous: `relay`, `splitter`, `purifier`, `virus`, `overload`, `core`
- Firewall behavior contract remains unchanged and content-defined:
  - no `firewallModes`: binary lock/open-all gate
  - with `firewallModes`: closed -> mode cycle while open
  - individual modes may enable one or multiple outgoing edges

## Authored Content State
- Total authored levels: **46** (`L1`-`L46`)
- Objective totals:
  - `power_core`: 46
  - `activate_all`: 9
  - `clean_corruption`: 14

## Latest Scoped Pass (2026-03-13) - Sprite Rendering Integration (Main Gameplay)
### Rendering and asset-layer changes
- Added centralized sprite subsystem: `src/sprites.js`
  - explicit manifest for all files in `SPRITES_IMAGES`
  - lazy load and preprocessing pipeline
  - non-browser safety guard (runtime smoke environment falls back automatically)
  - diagnostics API for mapping/load/fallback telemetry (`getSpriteDiagnostics`)
- Upgraded node-body render path in `src/render.js`:
  - node body now uses `sprite-first -> primitive fallback`
  - fallback remains active for missing/failed/unmapped states and for exploded node states by design
  - existing effect/overlay order preserved (glow, rings, pulse, labels, hint, miss markers)
- Added compact dark label chips behind node text when sprite body is used to preserve readability on detailed textures.

### Current sprite coverage
- Sprite-backed node bodies now cover: core, power, firewall, overload, relay, splitter, breaker, purifier, virus.
- Virus receives a dedicated emphasis variant during hover/hint focus.
- Exploded node body intentionally stays primitive fallback in this pass for high-risk readability safety.

## Current Validation Status
- Parse checks: pass
  - `node --check src/sprites.js`
  - `node --check src/render.js`
- Runtime smoke: pass
  - `powershell -ExecutionPolicy Bypass -File scripts\runtime-smoke.ps1`
- Full campaign solver/pack reports were not rerun in this pass because no level/mechanic/rule content changed.

## Protected Systems
- Not touched in this pass:
  - gameplay logic and hit behavior
  - objective validation semantics
  - generator and pack selection semantics
  - level authored content
  - splitter/purifier/breaker mechanical contracts

## Known Limitations
- Most provided sprites are opaque-background PNGs; this pass uses runtime keying to remove light backgrounds, which can vary by browser/canvas implementation.
- No dedicated sprite variant yet for exploded/broken node bodies (kept on primitive fallback intentionally).
- Several mapped files are medium-confidence semantic matches (power/core and overload/firewall families).

## Recommended Next Steps
1. Provide dedicated state-specific sprites for exploded, corrupted/infected, and overload-critical readability states to reduce fallback/ambiguity.
2. Add explicit selected/active/blocked overlay icon sprites for stronger readability on busy node art.
3. Perform a browser visual QA sweep across representative levels and mobile aspect ratios, then tune per-entity offsets/scales if needed.
