# Validation System

## Solver Architecture

- `tools/qa/rule-model.mjs`: extracts the active gameplay rule model from runtime constants and node behavior contracts.
- `tools/qa/state-key.mjs`: builds a canonical state hash so the solver can dedupe repeated turn-boundary states and detect loops.
- `tools/qa/topology-fingerprint.mjs`: computes a stable topology hash from node types, graph connectivity, and layout coordinates.
- `tools/qa/solver.mjs`: runs headless simulation using the real game modules from `src/`, explores player actions, computes solvability, extracts deterministic `solutionPath` proofs, and exposes hint-friendly helpers.
- `tools/qa/pack-builder.mjs`: filters candidate puzzles by solvability, degeneracy heuristics, and topology uniqueness before they enter a generated pack.
- `tools/qa/validate-levels.mjs`: developer entry point that runs the solver across the full authored level pack and writes JSON + Markdown reports.
- `tools/qa/report-format.mjs`: converts solver output into a readable QA report.

## Solver Algorithm

- The solver works at turn boundaries, not frame-by-frame rendering.
- It enumerates all clickable actions from the current state.
- Each action is simulated through the real propagation pipeline: prepare turn -> inject action energy -> resolve propagation queue -> spread corruption -> decay -> evaluate objectives -> evaluate lose conditions.
- Resulting states are hashed with a canonical state key and deduped.
- Search uses bounded BFS so the first discovered win depth is meaningful and shortest winning paths can be reconstructed.
- After graph expansion, a backward analysis pass marks which branches keep a win alive, counts solutions, and derives minimal winning paths, `solverProof`, and dead-state examples.

## Code Implementation Plan

1. Keep runtime rules authoritative in `src/`; do not fork gameplay logic for validation.
2. When rules change, update the solver only if the state model changes, not for cosmetic/UI changes.
3. Treat `src/levels.js` as validated content and rerun the solver whenever authored data changes.
4. Extend result metrics before adding procedural generation so generated content can be filtered by the same heuristics.
5. Use `buildValidatedPack()` to reject degenerate or duplicate-topology candidates before they enter an authored pack.

## Level Validation Workflow

1. Edit `src/levels.js` or the core propagation rules in `src/config.js`, `src/node.js`, or `src/energySystem.js`.
2. Run `node tools/qa/validate-levels.mjs` or `powershell -ExecutionPolicy Bypass -File scripts/validate-levels.ps1` for authored content.
3. Run `node tools/qa/build-pack.mjs <candidate-file.json>` or `powershell -ExecutionPolicy Bypass -File scripts/build-pack.ps1 <candidate-file.json>` for generated candidate batches.
4. Inspect `qa/level-validation.json`, `qa_report.md`, and generated pack reports for unsolved, degenerate, or duplicate-topology candidates.
5. Fix content or generator parameters and rerun the pipeline until the pack is stable.

## Integration Instructions

- Direct module use: import `validateLevels`, `loadLevelsWithSolverProof`, or `getNextHint` from `tools/qa/solver.mjs`, and `buildValidatedPack` from `tools/qa/pack-builder.mjs`.
- CLI use: run `node tools/qa/validate-levels.mjs` for authored levels or `node tools/qa/build-pack.mjs <candidate-file.json>` for generated candidates.
- Windows helpers: run `scripts/validate-levels.ps1` or `scripts/build-pack.ps1 <candidate-file.json>`.
- Recommended triggers: after any level-authoring pass, after any propagation-rule change, and after any procedural candidate generation batch.
- Future extension: procedural generation should emit candidate levels into the same pipeline and reject any layout marked unsolved, degenerate, duplicated by topology, unstable, or too chaotic.
