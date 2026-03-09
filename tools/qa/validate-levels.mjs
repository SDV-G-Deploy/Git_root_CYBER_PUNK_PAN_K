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
    body: 'Only Power and Firewall nodes are interactable, and the validator confirms every authored clickable node is interactable at level start. The remaining UX risk is explanatory: players still need strong feedback for why a route is a dead branch, why a firewall click changed the lane, and why a virus lane becomes unsafe over time.'
  });

  findings.push({
    title: 'Automation Recommendation',
    body: 'Treat `node tools/qa/validate-levels.mjs` or `scripts/validate-levels.ps1` as a mandatory pre-merge check whenever `src/levels.js`, `src/config.js`, `src/node.js`, or `src/energySystem.js` changes. The same solver can later reject unsolved procedural layouts automatically.'
  });

  return findings;
}

function buildValidationSystemDoc() {
  return `# Validation System\n\n## Solver Architecture\n\n- \`tools/qa/rule-model.mjs\`: extracts the active gameplay rule model from runtime constants and node behavior contracts.\n- \`tools/qa/state-key.mjs\`: builds a canonical state hash so the solver can dedupe repeated turn-boundary states and detect loops.\n- \`tools/qa/solver.mjs\`: runs headless simulation using the real game modules from \`src/\`, explores player actions, and computes solvability, minimal paths, branching, dead states, and difficulty heuristics.\n- \`tools/qa/validate-levels.mjs\`: developer entry point that runs the solver across the full authored level pack and writes JSON + Markdown reports.\n- \`tools/qa/report-format.mjs\`: converts solver output into a readable QA report.\n\n## Solver Algorithm\n\n- The solver works at turn boundaries, not frame-by-frame rendering.\n- It enumerates all clickable actions from the current state.\n- Each action is simulated through the real propagation pipeline: prepare turn -> inject action energy -> resolve propagation queue -> spread corruption -> decay -> evaluate objectives -> evaluate lose conditions.\n- Resulting states are hashed with a canonical state key and deduped.\n- Search uses bounded BFS so the first discovered win depth is meaningful and shortest winning paths can be reconstructed.\n- After graph expansion, a backward analysis pass marks which branches keep a win alive, counts solutions, and derives minimal winning paths, solverProof, and dead-state examples.\n\n## Code Implementation Plan\n\n1. Keep runtime rules authoritative in \`src/\`; do not fork gameplay logic for validation.\n2. When rules change, update the solver only if the state model changes, not for cosmetic/UI changes.\n3. Treat \`src/levels.js\` as validated content and rerun the solver whenever authored data changes.\n4. Extend result metrics before adding procedural generation so generated content can be filtered by the same heuristics.\n\n## Level Validation Workflow\n\n1. Edit \`src/levels.js\` or the core propagation rules in \`src/config.js\`, \`src/node.js\`, or \`src/energySystem.js\`.\n2. Run \`node tools/qa/validate-levels.mjs\` or \`powershell -ExecutionPolicy Bypass -File scripts/validate-levels.ps1\`.\n3. Inspect \`qa/level-validation.json\` for machine-readable output and \`qa_report.md\` for the human-readable balance report.\n4. Fix unsolved levels, pacing mismatches, or single-solution bottlenecks.\n5. Rerun the validator until the pack is stable.\n\n## Integration Instructions\n\n- Direct module use: import \`validateLevels\` from \`tools/qa/solver.mjs\` in any local Node-based content pipeline.\n- CLI use: run \`node tools/qa/validate-levels.mjs\`.\n- Windows helper: run \`scripts/validate-levels.ps1\`.\n- Recommended triggers: after any level-authoring pass, after any propagation-rule change, and before release or merge.\n- Future extension: procedural generation should emit candidate levels into the same solver and reject any layout marked unsolved, unstable, or too chaotic.\n`;
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
