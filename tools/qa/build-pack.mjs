import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLevels } from '../../src/levels.js';
import { buildTelemetryDifficultyReportFromRaw } from './telemetry-analysis.mjs';
import { buildValidatedPack } from './pack-builder.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const qaDir = path.join(projectRoot, 'qa');
const reportPath = path.join(qaDir, 'pack-build-report.json');

function parseArgs(argv) {
  const options = {
    candidatePath: null,
    telemetryPath: null,
    outputPath: reportPath
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

function formatSlotAssignments(entries) {
  return entries
    .slice()
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map((entry) => ({
      slotIndex: entry.slotIndex,
      slotId: entry.slotId,
      slotRole: entry.slotRole,
      slotLabel: entry.slotLabel,
      levelId: entry.levelId,
      levelName: entry.levelName,
      authoredDifficultyTag: entry.authoredDifficultyTag,
      predictedActualDifficultyClass: entry.predictedActualDifficultyClass,
      topologyScale: entry.topologyScale,
      complexityScore: entry.complexityScore,
      slotScore: entry.slotScore
    }));
}

function summarizeEntries(entries) {
  return entries.map((entry) => ({
    levelId: entry.levelId,
    levelName: entry.levelName,
    authoredDifficultyTag: entry.authoredDifficultyTag,
    predictedActualDifficultyClass: entry.predictedActualDifficultyClass,
    predictedActualDifficultyScore: entry.predictedActualDifficultyScore,
    minMoves: entry.minMoves,
    solutionCount: entry.solutionCount,
    averageBranchingFactor: entry.averageBranchingFactor,
    complexityScore: entry.complexityScore,
    topologyScale: entry.topologyScale,
    slotId: entry.slotId || null,
    slotRole: entry.slotRole || null,
    slotIndex: entry.slotIndex || null,
    slotScore: entry.slotScore || null,
    rejectionReasons: entry.rejectionReasons,
    topologyFingerprint: entry.topologyFingerprint
  }));
}

const args = parseArgs(process.argv.slice(2));
const candidateLevels = loadCandidateLevels(args.candidatePath);
const telemetry = loadDifficultyCalibration(args.telemetryPath);
const pack = buildValidatedPack(candidateLevels, {
  difficultyCalibration: telemetry?.calibrationProfile || null
});

const report = {
  generatedAt: new Date().toISOString(),
  candidateCount: candidateLevels.length,
  acceptedCount: pack.acceptedEntries.length,
  deferredCount: pack.deferredEntries.length,
  rejectedCount: pack.rejectedEntries.length,
  rejectionCounts: summarizeByReason(pack.rejectedEntries),
  acceptedDifficultyCounts: pack.acceptedDifficultyCounts,
  acceptedSlotCounts: pack.acceptedSlotCounts,
  packStructure: pack.packStructure,
  slotAssignments: formatSlotAssignments(pack.acceptedEntries),
  unfilledSlots: pack.unfilledSlots,
  slotDiagnostics: pack.slotDiagnostics || [],
  telemetryCalibration: telemetry ? {
    summary: telemetry.report.summary,
    solverBucketCalibration: telemetry.report.solverBucketCalibration
  } : null,
  acceptedEntries: summarizeEntries(pack.acceptedEntries),
  deferredEntries: summarizeEntries(pack.deferredEntries),
  rejectedEntries: summarizeEntries(pack.rejectedEntries),
  topologyFingerprints: pack.topologyFingerprints
};

const resolvedOutput = path.resolve(projectRoot, args.outputPath);
fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
fs.writeFileSync(resolvedOutput, JSON.stringify(report, null, 2));

console.log('Signal District / Structured Pack Builder');
console.log('');
console.log(`Candidates: ${report.candidateCount}`);
console.log(`Accepted into pack: ${report.acceptedCount}`);
console.log(`Deferred: ${report.deferredCount}`);
console.log(`Rejected: ${report.rejectedCount}`);
console.log(`Report: ${resolvedOutput}`);
console.log('');
console.log('Pack slots:');
for (let index = 0; index < report.slotAssignments.length; index += 1) {
  const slot = report.slotAssignments[index];
  console.log(
    `- #${slot.slotIndex} ${slot.slotRole}: ${slot.levelId} (${slot.levelName}) | ` +
    `tag=${slot.authoredDifficultyTag} | actual=${slot.predictedActualDifficultyClass} | complexity=${slot.complexityScore}`
  );
}
if (report.unfilledSlots.length > 0) {
  console.log('');
  console.log('Unfilled slots:');
  for (let index = 0; index < report.unfilledSlots.length; index += 1) {
    const slot = report.unfilledSlots[index];
    console.log(`- #${slot.slotIndex} ${slot.role}: ${slot.reason}`);

    const failureCounts = slot.constraintSummary && slot.constraintSummary.failureCounts
      ? slot.constraintSummary.failureCounts
      : {};
    const sortedReasons = Object.entries(failureCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3);

    if (sortedReasons.length > 0) {
      for (let reasonIndex = 0; reasonIndex < sortedReasons.length; reasonIndex += 1) {
        const [reason, count] = sortedReasons[reasonIndex];
        console.log(`  * ${reason}: ${count}`);
      }
    }
  }
}
if (telemetry) {
  console.log('');
  console.log('Telemetry calibration: enabled');
}
if (report.rejectedCount > 0) {
  console.log('');
  console.log('Rejection counts:');
  for (const [reason, count] of Object.entries(report.rejectionCounts)) {
    console.log(`- ${reason}: ${count}`);
  }
}
