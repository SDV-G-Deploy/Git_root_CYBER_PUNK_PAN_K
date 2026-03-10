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