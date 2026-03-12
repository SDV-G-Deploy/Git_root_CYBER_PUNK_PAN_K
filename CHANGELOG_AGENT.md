# CHANGELOG_AGENT.md

## 2026-03-10 - Purifier Pass Recovered and Merged

### Changed
- Added purifier node type and related config.
- Added purifier runtime effect pipeline.
- Added purifier UI, render, and hint support.
- Added QA rule-model support.
- Added purifier-focused levels `L25`-`L28`.
- Verified validation, solvability, and pack checks.

### Files Involved (Recovery Commit `0faa562`)
- `index.html`
- `styles.css`
- `src/config.js`
- `src/energySystem.js`
- `src/engine.js`
- `src/gameState.js`
- `src/hints.js`
- `src/levels.js`
- `src/render.js`
- `src/ui.js`
- `tools/qa/rule-model.mjs`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`

### Notes
- Protected systems were not touched.
- Verification found tight budgets in some purifier levels.
- Main now contains the recovered purifier implementation (merge commit `acb8cbd`).

## 2026-03-10 - Balance Pass: Reduce Purifier-Era Brittleness (`L25`-`L27`)

### Changed
- `L25` (`Purifier Wake`): added optional secondary power path.
  - Added node `P2` (`power`, `injectPower: 4`)
  - Added edge `E7` (`P2 -> U1`, `capacity: 3`, `attenuation: 1`)
- `L26` (`Sanitize or Rush`): `movesLimit` increased from 8 to 9.
- `L27` (`Sterile Route`):
  - `movesLimit` increased from 8 to 10
  - Added weaker optional node `P2` (`power`, `injectPower: 2`)
  - Added edge `E8` (`P2 -> U1`, `capacity: 1`, `attenuation: 2`)

### Files Changed in This Pass
- `src/levels.js`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Validation Outcome
- `validate-levels`: pass (28/28 solvable)
- `build-pack`: pass
- `L25`/`L26`/`L27` issue flags reduced to none under current validator heuristics
- Pack slot assignment remained stable

### Notes
- No purifier core behavior changes
- No new mechanics introduced
- Protected systems not touched

## 2026-03-10 - Purifier Integration Pass: Improve Pack Flow Presence

### Changed
- Retagged `L25` (`Purifier Wake`) from `light` to `medium` (`difficulty` and `difficultyTag`) to align authored role with practical medium-slot characteristics.
- No topology/mechanic/rules changes were made in this pass.

### Why
- `L25`/`L26`/`L27` were deferred mainly as `not_selected_for_slot_template`.
- For `L25`, authored tag (`easy`) underweighted it against medium-slot candidates despite medium practical difficulty and valid constraints.
- Retagging `L25` is the smallest safe content adjustment that improves real purifier pack integration without touching heuristics or slot semantics.

### Files Changed in This Pass
- `src/levels.js`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Result
- Pack selection now includes purifier levels at:
  - medium slot `#5`: `L25`
  - hard slot `#8`: `L28`
- Protected systems not touched.
## 2026-03-10 - Night Pass: Campaign Expansion + Runtime QA Hardening

### Changed
- Expanded authored campaign from `28` to `36` levels.
- Added late-campaign content levels:
  - `L29` Purity Switch
  - `L30` Patch Window
  - `L31` Sterile Lattice
  - `L32` Quarantine Bypass
  - `L33` Containment Broker
  - `L34` Vector Balance
  - `L35` Sanitation Circuit
  - `L36` Protocol Apex
- Iteratively tuned new levels to remove unsolved/degenerate candidates under current validator/pack contracts.
- Added runtime smoke QA utility and script wrapper.
- Updated repo-memory and agent workflow docs to reflect active runtime path and new validation command.

### Files Changed in This Pass
- `src/levels.js`
- `tools/qa/runtime-smoke.mjs`
- `scripts/runtime-smoke.ps1`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `AGENTS.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Validation Outcome
- `validate-levels`: pass (`36/36` solvable, `0` unsolved, `0` cutoffs)
- `build-pack`: pass (`36` candidates, `10` accepted, `26` deferred, `0` rejected)
- `runtime-smoke`: pass (lifecycle/hint/telemetry sanity checks)

### Notes
- No gameplay-rule changes were made to purifier core behavior.
- No new mechanics were introduced.
- Protected systems were not touched.

## 2026-03-11 - Autonomous Campaign Strengthening Pass (Onboarding + Presentation + QA)

### Changed
- Calibrated early campaign onboarding pressure with scoped edits:
  - `L1`: `movesLimit 4 -> 5`
  - `L2`: `movesLimit 5 -> 6`, added `P2`, added `E4 (R1 -> C1)` and `E5 (P2 -> R2)`
  - `L3`: `movesLimit 5 -> 6`
  - `L4`: added `P2`, added `E5 (P2 -> R2)`
- Calibrated late campaign pressure without mechanic rewrites:
  - `L29`: `movesLimit 9 -> 10`
  - `L32`: added `P2`, added `E10 (P2 -> U1)`
  - `L33`: added `E11 (P2 -> F1)`
  - `L34`: `movesLimit 11 -> 12`
- Improved campaign presentation in live runtime:
  - added campaign status HUD label (`campaignStatusLabel`)
  - level header now shows `Level X/Y`
  - level-select labels now include objective tags (`CORE/GRID/CLEAN`)
  - exposed `objectiveTypes` in `engine.getLevelList()` for UI surfacing
- Improved mobile/touch UX:
  - pointer-based aim events (`pointermove`, `pointerleave`, `pointercancel`)
  - touch-aware tutorial/coach copy
  - tutorial overlay scroll/sticky action hardening
  - mobile control layout safer for small screens
- Hardened runtime smoke coverage:
  - level-list consistency and checkpoint spread
  - hint tier progression cap
  - reset/next boundary checks
  - save/progression sanity check after L1 win
  - JSON vs JSONL telemetry parity check
- Added repository clarity entrypoint doc: `README.md`

### Files Changed in This Pass
- `src/levels.js`
- `src/engine.js`
- `src/bootstrap.js`
- `src/ui.js`
- `src/input.js`
- `index.html`
- `styles.css`
- `tools/qa/runtime-smoke.mjs`
- `README.md`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Validation Outcome
- `validate-levels`: pass (`36/36` solvable, `0` unsolved, `0` cutoffs)
- `build-pack`: pass (`36` candidates, `10` accepted, `26` deferred, `0` rejected)
- `runtime-smoke`: pass (expanded lifecycle/progression/telemetry checks)

### Notes
- Protected systems were not touched (Splitter, Fuse/Stabilizer, Delay, classifier semantics, slot thresholds, generator heuristics).
- Structured pack remains a curated QA artifact and does not replace full authored campaign runtime flow.

## 2026-03-12 - Splitter Node Implementation Pass (Scoped Mechanic Wave)

### Changed
- Added new node type `splitter` in runtime config and node taxonomy.
- Implemented splitter emission in `src/node.js`:
  - passive, non-clickable behavior (inherits existing clickability contract);
  - deterministic equal split across enabled outgoing edges;
  - odd remainder assignment by ascending edge id;
  - attenuation/capacity/overload still applied per edge after split.
- Added splitter readability/UI support:
  - legend entry in `index.html`
  - legend color token and style in `styles.css`
  - node color/tag/status label in `src/render.js`
  - hover/type descriptions in `src/gameState.js`
- Added splitter introductory content slice (`4` handcrafted levels):
  - `L37` Splitter Primer
  - `L38` Forked Budget
  - `L39` Cleansing Split
  - `L40` Split Containment
- Updated QA parity and smoke coverage:
  - rule model docs in `tools/qa/rule-model.mjs`
  - runtime checkpoint expansion in `tools/qa/runtime-smoke.mjs` (`L37`, `L40`)

### Files Changed in This Pass
- `src/config.js`
- `src/node.js`
- `src/gameState.js`
- `src/render.js`
- `src/levels.js`
- `index.html`
- `styles.css`
- `tools/qa/rule-model.mjs`
- `tools/qa/runtime-smoke.mjs`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Validation Outcome
- `validate-levels`: pass (`40/40` solvable, `0` unsolved, `0` cutoffs)
- `build-pack`: pass (`40` candidates, `10` accepted, `30` deferred, `0` rejected)
- `runtime-smoke`: pass (splitter checkpoints included)

### Notes
- Scope remained focused on Splitter Node only.
- Protected systems were not changed: daily/seed behavior, pack semantics, classifier semantics, slot thresholds, generator heuristics, Fuse/Stabilizer, Delay, and campaign infrastructure.

## 2026-03-12 - Mixed Clarity / Legacy Anomaly Micro-Pass + Breaker Mixed Coverage

### Changed
- Investigated and addressed targeted legacy-clarity and authored-behavior anomalies without changing protected systems.
- Level-content micro-edits:
  - `L2`: increased visibility of `P2` contribution (`P2` inject and `E5` throughput tune).
  - `L4`: increased visibility of `P2` contribution (`E5` attenuation tune).
  - `L14`: added optional backup injector branch (`P2`, `E6`) to diversify decision pattern from neighboring overload levels.
  - `L24`: added optional backup injector branch (`P2`, `E5`) to reduce near-1:1 repetition pressure.
  - `L27`: fixed optional `P2` edge from effective no-output to visible support (`E8` tune).
  - `L39`: retuned cleanser pacing and optional support (`movesLimit`, `P2`, `U1` threshold, `E7`) so `clean_corruption` remains active past the opener.
- Added exactly two authored mixed levels:
  - `L45` **Breaker Purge** (Breaker + Purifier)
  - `L46` **Quarantine Fuse** (Breaker + Virus)
- Firewall/readability improvements:
  - firewall hover text now explains binary vs mode-cycling behavior and names current mode destinations,
  - firewall render labels now show mode index and output count (`Mx/y xN`),
  - legend/tutorial copy updated for firewall mode semantics.
- Infection feedback/readability improvements:
  - added trace events for direct-flow cleanse (`flow_cleanse`) and virus infection (`virus_corruption`),
  - chain-log detail parsing now surfaces readable firewall/breaker/cleanse/infection events,
  - hover info now shows corruption progress (`X/threshold`) when relevant.

### Files Changed in This Pass
- `src/levels.js`
- `src/gameState.js`
- `src/render.js`
- `src/energySystem.js`
- `src/ui.js`
- `index.html`
- `qa/level-validation.json`
- `qa/pack-build-report.json`
- `qa_report.md`
- `PROJECT_STATE.md`
- `SESSION_LOG.md`
- `CHANGELOG_AGENT.md`

### Validation Outcome
- `validate-levels`: pass (`46/46` solvable, `0` unsolved, `0` cutoffs)
- `runtime-smoke`: pass
- `build-pack`: pass (`46` candidates, `10` accepted, `34` deferred, `2` rejected)

### Notes
- Protected systems were not touched: daily/seed behavior, pack semantics, classifier semantics, slot thresholds, generator heuristics, and campaign infrastructure rules.
