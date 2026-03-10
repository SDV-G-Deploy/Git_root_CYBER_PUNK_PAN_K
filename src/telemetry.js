function sanitizeTelemetryMetadata(metadata) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};

  const lifecycleVersion = Number.isFinite(Number(source.lifecycleVersion))
    ? Math.max(0, Math.floor(Number(source.lifecycleVersion)))
    : null;

  const telemetryEpoch = typeof source.telemetryEpoch === 'string' && source.telemetryEpoch.trim().length > 0
    ? source.telemetryEpoch.trim()
    : null;

  return {
    lifecycleVersion,
    telemetryEpoch
  };
}

export function createTelemetryStore(maxEntries, metadata) {
  const entries = [];
  const maxSize = Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 5000;
  const meta = sanitizeTelemetryMetadata(metadata);
  const completedRunIds = new Set();

  function append(entry) {
    entries.push(entry);
    if (entries.length > maxSize) {
      entries.splice(0, entries.length - maxSize);
    }
  }

  function emit(state, eventType, payload) {
    if (!state) {
      return null;
    }

    const runId = state.runId;
    if (eventType === 'run_end' && completedRunIds.has(runId)) {
      return null;
    }

    const entry = {
      timestamp: Date.now(),
      runId,
      eventType,
      payload: payload || {},
      lifecycleVersion: meta.lifecycleVersion,
      telemetryEpoch: meta.telemetryEpoch
    };

    state.telemetry.push(entry);
    append(entry);

    if (eventType === 'run_end') {
      completedRunIds.add(runId);
    }

    return entry;
  }

  function track(state, eventType, payload) {
    return emit(state, eventType, payload);
  }

  function exportAs(format) {
    const mode = format || 'json';
    if (mode === 'jsonl') {
      return entries.map((entry) => JSON.stringify(entry)).join('\n');
    }

    return JSON.stringify(entries, null, 2);
  }

  function getAll() {
    return entries.slice();
  }

  return {
    emit,
    track,
    exportAs,
    getAll
  };
}