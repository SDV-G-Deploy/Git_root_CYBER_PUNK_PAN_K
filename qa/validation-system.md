# Validation System

## Solver Architecture

- `tools/qa/rule-model.mjs`: extracts the active gameplay rule model from runtime constants and node behavior contracts.
- `tools/qa/state-key.mjs`: builds a canonical state hash so the solver can dedupe repeated turn-boundary states and detect loops.
- `tools/qa/solver.mjs`: runs headless simulation using the real game modules from `src/`, explores player actions, and computes solvability, minimal paths, branching, dead states, and difficulty heuristics.
- `tools/qa/validate-levels.mjs`: developer entry point that runs the solver across the full authored level pack and writes JSON + Markdown reports.
- `tools/qa/report-format.mjs`: converts solver output into a readable QA report.

## Solver Algorithm

- The solver works at turn boundaries, not frame-by-frame rendering.
- It enumerates all clickable actions from the current state.
- Each action is simulated through the real propagation pipeline: prepare turn -> inject action energy -> resolve propagation queue -> spread corruption -> decay -> evaluate objectives -> evaluate lose conditions.
- Resulting states are hashed with a canonical state key and deduped.
- Search uses bounded BFS so the first discovered win depth is meaningful and shortest winning paths can be reconstructed.
- After graph expansion, a backward analysis pass marks which branches keep a win alive, counts solutions, and derives minimal winning paths and dead-state examples.

## Code Implementation Plan

1. Keep runtime rules authoritative in `src/`; do not fork gameplay logic for validation.
2. When rules change, update the solver only if the state model changes, not for cosmetic/UI changes.
3. Treat `src/levels.js` as validated content and rerun the solver whenever authored data changes.
4. Extend result metrics before adding procedural generation so generated content can be filtered by the same heuristics.

## Level Validation Workflow

1. Edit `src/levels.js` or the core propagation rules in `src/config.js`, `src/node.js`, or `src/energySystem.js`.
2. Run `node tools/qa/validate-levels.mjs` or `powershell -ExecutionPolicy Bypass -File scripts/validate-levels.ps1`.
3. Inspect `qa/level-validation.json` for machine-readable output and `qa_report.md` for the human-readable balance report.
4. Fix unsolved levels, pacing mismatches, or single-solution bottlenecks.
5. Rerun the validator until the pack is stable.

## Integration Instructions

- Direct module use: import `validateLevels` from `tools/qa/solver.mjs` in any local Node-based content pipeline.
- CLI use: run `node tools/qa/validate-levels.mjs`.
- Windows helper: run `scripts/validate-levels.ps1`.
- Recommended triggers: after any level-authoring pass, after any propagation-rule change, and before release or merge.
- Future extension: procedural generation should emit candidate levels into the same solver and reject any layout marked unsolved, unstable, or too chaotic.
