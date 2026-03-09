import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTelemetryDifficultyReportFromRaw } from './telemetry-analysis.mjs';
import { DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION } from './difficulty-model.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const qaDir = path.join(projectRoot, 'qa');

function parseArgs(argv) {
  const options = {
    inputPath: null,
    outputPath: path.join(qaDir, 'telemetry-difficulty-report.json')
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--input' && argv[index + 1]) {
      options.inputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--output' && argv[index + 1]) {
      options.outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (!token.startsWith('--') && !options.inputPath) {
      options.inputPath = token;
    }
  }

  return options;
}

function formatConsoleReport(report) {
  const lines = [];
  lines.push('Signal District / Telemetry Difficulty Report');
  lines.push('');
  lines.push(`Levels observed: ${report.summary.levelsObserved}`);
  lines.push(`Started runs observed: ${report.summary.startedRunsObserved}`);
  lines.push(`Closed runs observed: ${report.summary.closedRunsObserved}`);
  lines.push(`Open runs observed: ${report.summary.openRunsObserved}`);
  lines.push(`Closed run rate: ${(report.summary.closedRunRate * 100).toFixed(1)}%`);
  lines.push(`Attempts observed: ${report.summary.attemptsObserved}`);
  lines.push(`Retries observed: ${report.summary.retriesObserved}`);
  lines.push(`Abandons observed: ${report.summary.abandonsObserved}`);
  lines.push(`Avg retry rate: ${(report.summary.avgRetryRate * 100).toFixed(1)}%`);
  lines.push(`Avg abandon rate: ${(report.summary.avgAbandonRate * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('Actual difficulty distribution:');
  for (const bucket of Object.keys(DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION)) {
    lines.push(`- ${bucket}: ${report.summary.actualDifficultyDistribution[bucket] || 0}`);
  }
  lines.push('');
  lines.push('Per-level actual difficulty:');
  for (let index = 0; index < report.perLevel.length; index += 1) {
    const row = report.perLevel[index];
    lines.push(
      `- ${row.levelId}: actual=${row.actualDifficultyClass} (${row.actualDifficultyScore ?? 'n/a'}), ` +
      `avgSolveTime=${row.avgSolveTime ?? 'n/a'}s, retryRate=${(row.retryRate * 100).toFixed(1)}%, ` +
      `failRate=${(row.failRate * 100).toFixed(1)}%, abandonRate=${(row.abandonRate * 100).toFixed(1)}%, ` +
      `avgMovesOverOptimal=${row.avgMovesOverOptimal ?? 'n/a'}`
    );
  }

  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));
if (!args.inputPath) {
  throw new Error('Usage: node tools/qa/analyze-telemetry.mjs --input <telemetry.json|jsonl> [--output <report.json>]');
}

const resolvedInput = path.resolve(projectRoot, args.inputPath);
const resolvedOutput = path.resolve(projectRoot, args.outputPath);
const raw = fs.readFileSync(resolvedInput, 'utf8');
const report = buildTelemetryDifficultyReportFromRaw(raw);

fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
fs.writeFileSync(resolvedOutput, JSON.stringify(report, null, 2));
console.log(formatConsoleReport(report));
console.log('');
console.log(`Report written to ${resolvedOutput}`);
