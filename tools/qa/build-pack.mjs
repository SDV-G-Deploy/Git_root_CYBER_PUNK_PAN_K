import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLevels } from '../../src/levels.js';
import { buildValidatedPack } from './pack-builder.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const qaDir = path.join(projectRoot, 'qa');
const reportPath = path.join(qaDir, 'pack-build-report.json');

function loadCandidateLevelsFromArgs() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    return loadLevels();
  }

  const resolvedPath = path.resolve(projectRoot, inputPath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Candidate file must contain a JSON array of levels.');
  }

  return parsed;
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

const candidateLevels = loadCandidateLevelsFromArgs();
const pack = buildValidatedPack(candidateLevels);
const report = {
  generatedAt: new Date().toISOString(),
  candidateCount: candidateLevels.length,
  acceptedCount: pack.acceptedEntries.length,
  rejectedCount: pack.rejectedEntries.length,
  rejectionCounts: summarizeByReason(pack.rejectedEntries),
  acceptedEntries: pack.acceptedEntries,
  rejectedEntries: pack.rejectedEntries,
  topologyFingerprints: pack.topologyFingerprints
};

fs.mkdirSync(qaDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('Signal District / Pack Builder');
console.log('');
console.log(`Candidates: ${report.candidateCount}`);
console.log(`Accepted: ${report.acceptedCount}`);
console.log(`Rejected: ${report.rejectedCount}`);
console.log(`Report: ${reportPath}`);
if (report.rejectedCount > 0) {
  console.log('');
  console.log('Rejection counts:');
  for (const [reason, count] of Object.entries(report.rejectionCounts)) {
    console.log(`- ${reason}: ${count}`);
  }
}
