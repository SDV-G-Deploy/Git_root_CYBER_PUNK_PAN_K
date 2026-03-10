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
