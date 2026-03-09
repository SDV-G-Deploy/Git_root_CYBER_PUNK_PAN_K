export function createTelemetryStore(maxEntries) {
  const entries = [];
  const maxSize = Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 5000;

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

    const entry = {
      timestamp: Date.now(),
      runId: state.runId,
      eventType,
      payload: payload || {}
    };

    state.telemetry.push(entry);
    append(entry);
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