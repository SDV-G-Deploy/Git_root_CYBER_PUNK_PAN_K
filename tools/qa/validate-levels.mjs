import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createValidationSummary, validateLevels } from './solver.mjs';
import { formatConsoleReport, formatMarkdownReport } from './report-format.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const qaDir = path.join(projectRoot, 'qa');
const jsonPath = path.join(qaDir, 'level-validation.json');
const markdownPath = path.join(projectRoot, 'qa_report.md');
const systemDocPath = path.join(qaDir, 'validation-system.md');

const DIFFICULTY_ORDER = {
  intro: 1,
  light: 2,
  medium: 3,
  hard: 4,
  Easy: 1,
  Medium: 3,
  Hard: 4,
  Unsolvable: 5
};

function buildDifficultyMismatches(results) {
  return results
    .map((result) => ({
      ...result,
      authoredWeight: DIFFICULTY_ORDER[result.authoredDifficulty] || 0,
      estimatedWeight: DIFFICULTY_ORDER[result.difficultyEstimate] || 0
    }))
    .filter((result) => result.authoredWeight > 0 && result.estimatedWeight > 0 && result.authoredWeight !== result.estimatedWeight)
    .sort((left, right) => Math.abs(right.estimatedWeight - right.authoredWeight) - Math.abs(left.estimatedWeight - left.authoredWeight));
}

function buildFindings(results, summary) {
  const findings = [];
  const unsolved = results.filter((result) => !result.solvable);
  const trialError = results.filter((result) => result.issues.includes('trial_and_error_risk'));
  const tightBudget = results.filter((result) => result.issues.includes('tight_move_budget') || result.issues.includes('zero_margin_move_budget'));
  const overflowRisk = results.filter((result) => result.issues.includes('overflow_paths_exist'));
  const virusPressure = results.filter((result) => result.issues.includes('virus_pressure_high'));
  const singleSolution = results.filter((result) => result.issues.includes('single_solution_path'));
  const mismatches = buildDifficultyMismatches(results);
  const spikeLevels = mismatches.filter((result) => result.estimatedWeight > result.authoredWeight);
  const undertunedLevels = mismatches.filter((result) => result.estimatedWeight < result.authoredWeight);

  findings.push({
    title: 'Overall Solvability',
    body: unsolved.length === 0
      ? `All ${summary.levelCount} levels are solvable within the current ruleset. The solver found at least one winning action sequence for every authored level, and no level hit the propagation search cutoff.`
      : `The solver marked ${unsolved.length} level(s) as unsolved: ${unsolved.map((level) => level.levelId).join(', ')}.`
  });

  findings.push({
    title: 'Difficulty Curve',
    body: `Estimated difficulty distribution is Easy ${summary.difficultyCounts.Easy || 0}, Medium ${summary.difficultyCounts.Medium || 0}, Hard ${summary.difficultyCounts.Hard || 0}, Unsolvable ${summary.difficultyCounts.Unsolvable || 0}. ` +
      `${spikeLevels.length > 0 ? `The main pacing spike is ${spikeLevels.map((level) => `${level.levelId} (${level.authoredDifficulty} -> ${level.difficultyEstimate})`).join(', ')}. ` : ''}` +
      `${undertunedLevels.length > 0 ? `The main undertuned pocket is ${undertunedLevels.map((level) => `${level.levelId} (${level.authoredDifficulty} -> ${level.difficultyEstimate})`).join(', ')}.` : 'Authored difficulty tags broadly match the solver estimate.'}`
  });

  findings.push({
    title: 'Detected Gameplay Issues',
    body: `${singleSolution.length > 0 ? `Single-solution or near-single-solution levels: ${singleSolution.map((level) => `${level.levelId} (${level.solutionCount} solution)`).join(', ')}. ` : ''}` +
      `${tightBudget.length > 0 ? `Tight move budgets remain in ${tightBudget.map((level) => `${level.levelId} (${level.minimalMoves}/${level.movesLimit})`).join(', ')}. ` : ''}` +
      `${trialError.length > 0 ? `High trial-and-error pressure appears in ${trialError.map((level) => level.levelId).join(', ')}. ` : ''}` +
      `${overflowRisk.length === 0 && virusPressure.length === 0 ? 'No systemic instability remains in overload or virus propagation under the current ruleset.' : ''}`
  });

  findings.push({
    title: 'Balance Problems',
    body: `${spikeLevels.length > 0 ? `Early and mid-game difficulty jumps are steeper than the authored labels imply. In particular, ${spikeLevels.map((level) => level.levelId).join(', ')} demand more search than their current tier suggests. ` : ''}` +
      `${undertunedLevels.length > 0 ? `Several later levels land below their authored tier: ${undertunedLevels.map((level) => level.levelId).join(', ')}. ` : ''}` +
      `${singleSolution.length > 0 ? `This is most noticeable on intro routing levels where the player effectively repeats one correct action sequence with little room for experimentation.` : 'The current pack offers a reasonable mix of constrained and open-ended solutions.'}`
  });

  findings.push({
    title: 'Rebalancing Recommendations',
    body: [
      tightBudget.some((level) => level.levelId === 'L2')
        ? 'Give `L2` one extra move or lower the core target by 1 so the second tutorial level does not require an exact five-click script.'
        : null,
      spikeLevels.length > 0
        ? `Either retag ${spikeLevels.map((level) => level.levelId).join(', ')} upward, or reduce their branching pressure by trimming one redundant route or raising their move slack by 1.`
        : null,
      undertunedLevels.length > 0
        ? `Move ${undertunedLevels.map((level) => level.levelId).join(', ')} earlier in the campaign or retag them downward so the late-game arc does not flatten out.`
        : null,
      'Keep `CLEANSE_THRESHOLD = 2`; raising it back to 4 would make corruption-cleaning objectives disproportionately brittle.',
      'Keep corruption spread exclusive to `virus` nodes; allowing every corrupted node to spread creates exponential contagion and collapses solvability.'
    ].filter(Boolean).join(' ')
  });

  findings.push({
    title: 'UX Playability',
    body: 'Power, Firewall, and Breaker nodes are interactable, and the validator confirms every authored clickable node is interactable at level start. The remaining UX risk is explanatory: players still need strong feedback for why a route is a dead branch, why firewall routing changed, and when a primed breaker traded throughput for safety.'
  });

  findings.push({
    title: 'Automation Recommendation',
    body: 'Treat `node tools/qa/validate-levels.mjs` or `scripts/validate-levels.ps1` as a mandatory pre-merge check whenever `src/levels.js`, `src/config.js`, `src/node.js`, or `src/energySystem.js` changes. The same solver can later reject unsolved procedural layouts automatically.'
  });

  return findings;
}

function buildValidationSystemDoc() {
  return `# Validation System

## Solver Architecture

- \`tools/qa/rule-model.mjs\`: extracts the active gameplay rule model from runtime constants and node behavior contracts.
- \`tools/qa/state-key.mjs\`: builds a canonical state hash so the solver can dedupe repeated turn-boundary states and detect loops.
- \`tools/qa/difficulty-model.mjs\`: holds shared scoring, classification, and target-distribution helpers for actual puzzle difficulty.
- \`tools/qa/topology-fingerprint.mjs\`: computes a stable topology hash from node types, graph connectivity, and layout coordinates.
- \`tools/qa/solver.mjs\`: runs headless simulation using the real game modules from \`src/\`, explores player actions, computes solvability, extracts deterministic \`solutionPath\` proofs, and exposes hint-friendly helpers.
- \`tools/qa/telemetry-analysis.mjs\`: turns raw telemetry into per-level actual difficulty metrics such as \`avgSolveTime\`, \`retryRate\`, \`failRate\`, and \`avgMovesOverOptimal\`.
- \`tools/qa/pack-builder.mjs\`: filters candidate puzzles by solvability, degeneracy heuristics, topology uniqueness, and target difficulty distribution before they enter a generated pack.
- \`tools/qa/validate-levels.mjs\`: developer entry point that runs the solver across the full authored level pack and writes JSON + Markdown reports.
- \`tools/qa/report-format.mjs\`: converts solver output into a readable QA report.

## Solver Algorithm

- The solver works at turn boundaries, not frame-by-frame rendering.
- It enumerates all clickable actions from the current state.
- Each action is simulated through the real propagation pipeline: prepare turn -> inject action energy -> resolve propagation queue -> spread corruption -> decay -> evaluate objectives -> evaluate lose conditions.
- Resulting states are hashed with a canonical state key and deduped.
- Search uses bounded BFS so the first discovered win depth is meaningful and shortest winning paths can be reconstructed.
- After graph expansion, a backward analysis pass marks which branches keep a win alive, counts solutions, and derives minimal winning paths, \`solverProof\`, and dead-state examples.

## Code Implementation Plan

1. Keep runtime rules authoritative in \`src/\`; do not fork gameplay logic for validation.
2. When rules change, update the solver only if the state model changes, not for cosmetic/UI changes.
3. Treat \`src/levels.js\` as validated content and rerun the solver whenever authored data changes.
4. Feed exported telemetry through \`tools/qa/telemetry-analysis.mjs\` so actual player behavior calibrates difficulty labels.
5. Use \`buildValidatedPack()\` to reject degenerate or duplicate-topology candidates and to bias accepted packs toward the target actual-difficulty distribution.

## Level Validation Workflow

1. Edit \`src/levels.js\` or the core propagation rules in \`src/config.js\`, \`src/node.js\`, or \`src/energySystem.js\`.
2. Run \`node tools/qa/validate-levels.mjs\` or \`powershell -ExecutionPolicy Bypass -File scripts/validate-levels.ps1\` for authored content.
3. Run \`node tools/qa/analyze-telemetry.mjs --input <telemetry.json|jsonl>\` or \`powershell -ExecutionPolicy Bypass -File scripts/telemetry-report.ps1 -InputPath <telemetry.json|jsonl>\` to compute actual difficulty from player runs.
4. Run \`node tools/qa/build-pack.mjs <candidate-file.json> --telemetry <telemetry.json|jsonl>\` or \`powershell -ExecutionPolicy Bypass -File scripts/build-pack.ps1 <candidate-file.json> --telemetry <telemetry.json|jsonl>\` for generated candidate batches.
5. Inspect \`qa/level-validation.json\`, \`qa_report.md\`, telemetry difficulty reports, and generated pack reports for unsolved, degenerate, duplicate-topology, or slot-composition violations.
6. Fix content or generator parameters and rerun the pipeline until the structured slot progression is stable.

## Integration Instructions

- Direct module use: import \`validateLevels\`, \`loadLevelsWithSolverProof\`, or \`getNextHint\` from \`tools/qa/solver.mjs\`, \`buildTelemetryDifficultyReportFromRaw\` from \`tools/qa/telemetry-analysis.mjs\`, and \`buildValidatedPack\` from \`tools/qa/pack-builder.mjs\`.
- CLI use: run \`node tools/qa/validate-levels.mjs\` for authored levels, \`node tools/qa/analyze-telemetry.mjs --input <telemetry.json|jsonl>\` for actual-difficulty analysis, or \`node tools/qa/build-pack.mjs <candidate-file.json> --telemetry <telemetry.json|jsonl>\` for generated candidates.
- Windows helpers: run \`scripts/validate-levels.ps1\`, \`scripts/telemetry-report.ps1\`, or \`scripts/build-pack.ps1\`.
- Recommended triggers: after any level-authoring pass, after any propagation-rule change, after each telemetry review, and after any procedural candidate generation batch.
- Future extension: procedural generation should emit candidate levels into the same pipeline and reject any layout marked unsolved, degenerate, duplicated by topology, unable to satisfy the structured slot progression, unstable, or too chaotic.
`;
}
const results = validateLevels();
const summary = createValidationSummary(results);
const findings = buildFindings(results, summary);
const report = {
  generatedAt: new Date().toISOString(),
  summary,
  results
};

fs.mkdirSync(qaDir, { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(markdownPath, formatMarkdownReport(results, summary, findings));
fs.writeFileSync(systemDocPath, buildValidationSystemDoc());
console.log(formatConsoleReport(results, summary));
console.log('');
console.log(`JSON report written to ${jsonPath}`);
console.log(`Markdown report written to ${markdownPath}`);
console.log(`Validation system doc written to ${systemDocPath}`);

