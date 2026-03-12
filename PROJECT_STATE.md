# PROJECT_STATE.md

Last updated: 2026-03-12

## Repository State Snapshot
- Local HEAD at start of this pass: `742eadc` on `main`
- Upstream baseline at start of this pass: `origin/main` at `e145ef1`
- Starting tree state: clean working tree, local branch ahead by 1 local audit commit

## Project Summary
CyberPunkPuzzleWars is a browser puzzle game about routing energy through node networks under pressure from infection, overload, firewall routing constraints, and multi-objective level logic.

## Active Runtime and Structure
- Active playable entry path: `index.html` -> `src/bootstrap.js` -> `src/engine.js`
- Live gameplay/content/UI logic is in `src/`
- Root-level `game.js`, `main.js`, `levels.js` are legacy and not the active runtime path

## Core Mechanics Status
- Clickable inputs: `power`, `firewall`, `breaker`
- Passive/autonomous: `relay`, `splitter`, `purifier`, `virus`, `overload`, `core`
- Firewall behavior contract is unchanged and content-defined:
  - no `firewallModes`: binary lock/open-all gate
  - with `firewallModes`: closed -> mode cycle while open
  - individual modes may enable one or multiple outgoing edges

## Authored Content State
- Total authored levels: **46** (`L1`-`L46`)
- Chapters:
  - Boot Sector: 5
  - Firewall Ring: 5
  - Quarantine Loop: 6
  - Overload Channel: 4
  - Purifier Loop: 6
  - District Core: 10
  - Splitter Lab: 4
  - Breaker Node: 6
- Objective totals:
  - `power_core`: 46
  - `activate_all`: 9
  - `clean_corruption`: 14

## Latest Scoped Pass (2026-03-12) - Mixed Clarity + Legacy Anomaly Micro-Pass
### Investigation + triage scope
- Audited user-reported behavior across levels `L2`, `L4`, `L9`, `L10`, `L13`-`L15`, `L21`, `L23`, `L24`, `L27`, `L31`, `L44`
- Confirmed primary issues were authored readability/no-op-like tuning, not protected-system regressions

### Content and readability edits
- Level micro-retunes:
  - `L2` / `L4`: made secondary injector contribution visible on first use
  - `L14`: added small backup injector branch to reduce near-scripted overlap with `L13`
  - `L24`: added backup injector branch to reduce near-1:1 repetition pressure
  - `L27`: fixed optional `P2` lane from effective no-op to visible support path
  - `L39`: retuned cleanser pacing so `clean_corruption` is not auto-cleared on opening turn
- Added exactly two authored mixed-coverage levels:
  - `L45` Breaker + Purifier
  - `L46` Breaker + Virus

### Firewall/infection clarity improvements
- Firewall hover info now shows:
  - binary gate vs mode-router behavior
  - active mode index and explicit destination nodes
  - multi-output mode signal
- Firewall on-node label now surfaces mode index and output count (`Mx/y xN`)
- Trace/coach readability now decodes firewall/breaker detail tokens and surfaces:
  - `flow_cleanse`
  - `virus_corruption`
- Hover panel now shows per-node corruption progress (`Corruption X/2`) for non-core/non-virus nodes when relevant

## Current Validation Status
Latest verified state after this pass:
- `validate-levels`: pass
  - solvability: **46/46**
  - unsolved: 0
  - search cutoffs: 0
- `runtime-smoke`: pass
- `build-pack`: pass
  - candidates: 46
  - accepted: 10
  - deferred: 34
  - rejected: 2

## Protected Systems
- Not touched in this pass:
  - daily generation behavior
  - seed behavior
  - pack semantics
  - classifier semantics
  - slot thresholds
  - generator heuristics
  - campaign-system infrastructure/rules

## Known Limitations
- Some designed tutorial-style entries remain single-opening by intent (for example `L45`, `L46` currently flagged `single_opening_solution`).
- Objective resolution still takes win precedence over lose checks when both are met in the same turn (existing runtime behavior, unchanged in this pass).

## Recommended Next Steps
1. If desired, run one focused pass on remaining single-opening tutorial levels (`L1`, `L10`, `L13`, `L37`, `L45`, `L46`) without broad campaign reshuffle.
2. If additional firewall-heavy content is added, consider one tiny in-run legend line that explicitly maps `M1/M2` labels to destination IDs.
3. Keep future passes isolated (content/clarity vs mechanic rewrites) to preserve protected-system stability.
