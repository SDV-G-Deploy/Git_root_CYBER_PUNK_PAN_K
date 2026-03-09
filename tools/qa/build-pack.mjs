import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLevels } from '../../src/levels.js';
import { DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION, normalizeDifficultyDistribution } from './difficulty-model.mjs';
import { buildTelemetryDifficultyReportFromRaw } from './telemetry-analysis.mjs';
import { buildValidatedPack } from './pack-builder.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const qaDir = path.join(projectRoot, 'qa');
const reportPath = path.join(qaDir, 'pack-build-report.json');

function parseDistribution(value) {
  if (!value) {
    return { ...DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION };
  }

  const trimmed = String(value).trim();
  if (trimmed.startsWith('{')) {
    return normalizeDifficultyDistribution(JSON.parse(trimmed));
  }

  const resolved = path.resolve(projectRoot, trimmed);
  if (fs.existsSync(resolved)) {
    return normalizeDifficultyDistribution(JSON.parse(fs.readFileSync(resolved, 'utf8')));
  }

  throw new Error(`Unable to parse target difficulty distribution from: ${value}`);
}

function parseArgs(argv) {
  const options = {
    candidatePath: null,
    telemetryPath: null,
    outputPath: reportPath,
    packSize: null,
    targetDistribution: { ...DEFAULT_TARGET_DIFFICULTY_DISTRIBUTION }
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--telemetry' && argv[index + 1]) {
      options.telemetryPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--output' && argv[index + 1]) {
      options.outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--pack-size' && argv[index + 1]) {
      options.packSize = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === '--target' && argv[index + 1]) {
      options.targetDistribution = parseDistribution(argv[index + 1]);
      index += 1;
      continue;
    }

    if (!token.startsWith('--') && !options.candidatePath) {
      options.candidatePath = token;
    }
  }

  return options;
}

function loadCandidateLevels(candidatePath) {
  if (!candidatePath) {
    return loadLevels();
  }

  const resolvedPath = path.resolve(projectRoot, candidatePath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Candidate file must contain a JSON array of levels.');
  }

  return parsed;
}

function loadDifficultyCalibration(telemetryPath) {
  if (!telemetryPath) {
    return null;
  }

  const resolvedTelemetry = path.resolve(projectRoot, telemetryPath);
  const raw = fs.readFileSync(resolvedTelemetry, 'utf8');
  const report = buildTelemetryDifficultyReportFromRaw(raw);
  return {
    report,
    calibrationProfile: {
      solverBucketCalibration: report.solverBucketCalibration
    }
  };
}

function summarizeByReason(entries) {
  const counts = {};
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    for (let reasonIndex = 0; reasonIndex < entry.rejectionReasons.length; reasonIndex += 1) {
      const reason = entry.rejectionReasons[reasonIndex];
      counts[reason] = (counts[reason] || 0) + 1;
    }
  }

  return counts;
}

const args = parseArgs(process.argv.slice(2));
const candidateLevels = loadCandidateLevels(args.candidatePath);
const telemetry = loadDifficultyCalibration(args.telemetryPath);
const pack = buildValidatedPack(candidateLevels, {
  difficultyCalibration: telemetry?.calibrationProfile || null,
  targetDifficultyDistribution: args.targetDistribution,
  targetPackSize: Number.isFinite(args.packSize) && args.packSize > 0 ? args.packSize : candidateLevels.length
});

const report = {
  generatedAt: new Date().toISOString(),
  candidateCount: candidateLevels.length,
  acceptedCount: pack.acceptedEntries.length,
  rejectedCount: pack.rejectedEntries.length,
  rejectionCounts: summarizeByReason(pack.rejectedEntries),
  targetDifficulty: pack.targetDifficulty,
  acceptedDifficultyCounts: pack.acceptedDifficultyCounts,
  telemetryCalibration: telemetry ? {
    summary: telemetry.report.summary,
    solverBucketCalibration: telemetry.report.solverBucketCalibration
  } : null,
  acceptedEntries: pack.acceptedEntries,
  rejectedEntries: pack.rejectedEntries,
  topologyFingerprints: pack.topologyFingerprints
};

const resolvedOutput = path.resolve(projectRoot, args.outputPath);
fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
fs.writeFileSync(resolvedOutput, JSON.stringify(report, null, 2));

console.log('Signal District / Pack Builder');
console.log('');
console.log(`Candidates: ${report.candidateCount}`);
console.log(`Accepted: ${report.acceptedCount}`);
console.log(`Rejected: ${report.rejectedCount}`);
console.log(`Report: ${resolvedOutput}`);
console.log(`Target distribution: ${JSON.stringify(report.targetDifficulty?.distribution || args.targetDistribution)}`);
console.log(`Accepted distribution: ${JSON.stringify(report.acceptedDifficultyCounts)}`);
if (telemetry) {
  console.log('Telemetry calibration: enabled');
}
if (report.rejectedCount > 0) {
  console.log('');
  console.log('Rejection counts:');
  for (const [reason, count] of Object.entries(report.rejectionCounts)) {
    console.log(`- ${reason}: ${count}`);
  }
}
