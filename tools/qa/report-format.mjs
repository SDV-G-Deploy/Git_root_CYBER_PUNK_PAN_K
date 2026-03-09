import { extractRuleModel } from './rule-model.mjs';

function formatIssueList(issues) {
  if (!issues || issues.length === 0) {
    return 'none';
  }

  return issues.join(', ');
}

function formatMinimalPath(path) {
  if (!path || path.length === 0) {
    return 'none';
  }

  return path.join(' -> ');
}

export function formatConsoleReport(results, summary) {
  const lines = [];
  lines.push('Signal District / Chain Lab validation');
  lines.push('');
  lines.push(`Levels: ${summary.levelCount}`);
  lines.push(`Solvable: ${summary.solvableCount}`);
  lines.push(`Unsolvable: ${summary.unsolvedCount}`);
  lines.push(`Search cutoffs: ${summary.searchCutoffCount}`);
  lines.push(`Total states explored: ${summary.totalStatesExplored}`);
  lines.push('');
  lines.push('Per-level summary:');

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    lines.push(
      `- ${result.levelId} ${result.levelName}: ${result.solvable ? 'SOLVABLE' : 'UNSOLVABLE'} | ` +
      `difficulty=${result.difficultyEstimate} | minMoves=${result.minimalMoves ?? 'n/a'} | ` +
      `solutions=${result.solutionCount} | branching=${result.averageBranchingFactor} | issues=${formatIssueList(result.issues)}`
    );
  }

  return lines.join('\n');
}

function formatRuleModelMarkdown() {
  const model = extractRuleModel();
  const lines = [];
  lines.push('## Gameplay Rules Summary');
  lines.push('');
  lines.push('### Player Actions');
  for (let i = 0; i < model.playerActions.length; i += 1) {
    lines.push(`- ${model.playerActions[i]}`);
  }
  lines.push('');
  lines.push('### Turn Flow');
  for (let i = 0; i < model.turnFlow.length; i += 1) {
    lines.push(`- ${model.turnFlow[i]}`);
  }
  lines.push('');
  lines.push('### Objectives');
  const objectiveEntries = Object.entries(model.objectives);
  for (let i = 0; i < objectiveEntries.length; i += 1) {
    lines.push(`- \`${objectiveEntries[i][0]}\`: ${objectiveEntries[i][1]}`);
  }
  lines.push('');
  lines.push('### Lose Conditions');
  const loseEntries = Object.entries(model.loseConditions);
  for (let i = 0; i < loseEntries.length; i += 1) {
    lines.push(`- \`${loseEntries[i][0]}\`: ${loseEntries[i][1]}`);
  }
  lines.push('');
  lines.push('### Node Types');
  const nodeEntries = Object.entries(model.nodeTypes);
  for (let i = 0; i < nodeEntries.length; i += 1) {
    const [nodeType, nodeInfo] = nodeEntries[i];
    lines.push(`- \`${nodeType}\`: ${nodeInfo.behavior} ${nodeInfo.interaction} Purpose: ${nodeInfo.purpose}`);
  }
  lines.push('');
  lines.push('### Energy Rules');
  const energyEntries = Object.entries(model.energyRules);
  for (let i = 0; i < energyEntries.length; i += 1) {
    lines.push(`- \`${energyEntries[i][0]}\`: ${energyEntries[i][1]}`);
  }

  return lines.join('\n');
}

export function formatMarkdownReport(results, summary, findings) {
  const lines = [];
  lines.push('# Chain Lab QA Report');
  lines.push('');
  lines.push(`Generated levels checked: ${summary.levelCount}`);
  lines.push(`Solvable: ${summary.solvableCount}`);
  lines.push(`Unsolvable: ${summary.unsolvedCount}`);
  lines.push(`Search cutoffs: ${summary.searchCutoffCount}`);
  lines.push(`Total states explored: ${summary.totalStatesExplored}`);
  lines.push('');
  lines.push(formatRuleModelMarkdown());
  lines.push('');
  lines.push('## Solvability Verification');
  lines.push('');
  lines.push('| Level | Status | Authored | Estimated | Min moves | Solutions | Branching | Issues |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | --- |');
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    lines.push(
      `| ${result.levelId} | ${result.solvable ? 'Solvable' : 'Unsolvable'} | ${result.authoredDifficulty} | ` +
      `${result.difficultyEstimate} | ${result.minimalMoves ?? 'n/a'} | ${result.solutionCount} | ` +
      `${result.averageBranchingFactor} | ${formatIssueList(result.issues)} |`
    );
  }
  lines.push('');
  lines.push('## Level Details');
  lines.push('');

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    lines.push(`### ${result.levelId} ${result.levelName}`);
    lines.push('');
    lines.push(`- Chapter: ${result.chapter}`);
    lines.push(`- Teaching goal: ${result.teachingGoal}`);
    lines.push(`- Status: ${result.solvable ? 'Solvable' : 'Unsolvable'}`);
    lines.push(`- Authored difficulty: ${result.authoredDifficulty}`);
    lines.push(`- Estimated difficulty: ${result.difficultyEstimate} (${result.difficultyScore})`);
    lines.push(`- Minimal winning path: ${formatMinimalPath(result.minimalWinningPath)}`);
    lines.push(`- Minimal moves: ${result.minimalMoves ?? 'n/a'} / ${result.movesLimit}`);
    lines.push(`- Solution count (capped): ${result.solutionCount}`);
    lines.push(`- Average branching factor: ${result.averageBranchingFactor}`);
    lines.push(`- Explored states: ${result.totalStates}`);
    lines.push(`- Dead states: ${result.deadStateCount}`);
    lines.push(`- Overflow paths: ${result.overflowStates}`);
    lines.push(`- Clickable nodes at start: ${result.interactableAtStart.join(', ') || 'none'}`);
    lines.push(`- Non-interactable clickables: ${result.nonInteractableClickables.join(', ') || 'none'}`);
    lines.push(`- Issues: ${formatIssueList(result.issues)}`);

    if (result.rootBranchAnalysis.length > 0) {
      lines.push('- Root branch analysis:');
      for (let branchIndex = 0; branchIndex < result.rootBranchAnalysis.length; branchIndex += 1) {
        const branch = result.rootBranchAnalysis[branchIndex];
        lines.push(
          `  - ${branch.action}: ${branch.solvable ? 'keeps a win alive' : 'dead branch'}; ` +
          `minMoves=${branch.minMovesToWin ?? 'n/a'}; path=${formatMinimalPath(branch.path)}`
        );
      }
    }

    if (result.deadStateExamples.length > 0) {
      lines.push('- Dead state examples:');
      for (let deadIndex = 0; deadIndex < result.deadStateExamples.length; deadIndex += 1) {
        const dead = result.deadStateExamples[deadIndex];
        lines.push(
          `  - moves=${dead.movesUsed}, overload=${dead.overload}, infected=${dead.infectedCount}, path=${formatMinimalPath(dead.path)}`
        );
      }
    }

    lines.push('');
  }

  lines.push('## Findings');
  lines.push('');
  for (let i = 0; i < findings.length; i += 1) {
    lines.push(`### ${findings[i].title}`);
    lines.push('');
    lines.push(findings[i].body);
    lines.push('');
  }

  lines.push('## Automated Validation Workflow');
  lines.push('');
  lines.push('- Tool entry point: `node tools/qa/validate-levels.mjs`.');
  lines.push('- Solver: bounded BFS over player actions at turn boundaries, deduped by canonical state key.');
  lines.push('- Validation output: console summary, JSON snapshot, and this markdown report.');
  lines.push('- Recommended use: run after editing `src/levels.js`, `src/config.js`, `src/node.js`, or `src/energySystem.js`.');
  lines.push('- Future extension: procedural generator can emit candidate levels into the same solver and reject unsolved layouts automatically.');

  return lines.join('\n');
}
