function normalizeCoordinate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function compareCanonicalNodes(left, right) {
  if (left.type !== right.type) {
    return left.type.localeCompare(right.type);
  }

  if (left.x !== right.x) {
    return left.x - right.x;
  }

  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.id.localeCompare(right.id);
}

function hashFnv1a(value) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

export function serializeTopology(level) {
  const nodes = Array.isArray(level?.nodes)
    ? level.nodes.map((node) => ({
      id: String(node.id || ''),
      type: String(node.type || node.baseType || 'unknown'),
      x: normalizeCoordinate(node.x),
      y: normalizeCoordinate(node.y)
    })).sort(compareCanonicalNodes)
    : [];

  const canonicalIndexById = new Map();
  for (let index = 0; index < nodes.length; index += 1) {
    canonicalIndexById.set(nodes[index].id, index);
  }

  const nodeSignature = nodes
    .map((node, index) => `${index}:${node.type}@${node.x},${node.y}`)
    .join('|');

  const edgeSignature = (Array.isArray(level?.edges) ? level.edges : [])
    .map((edge) => {
      const fromIndex = canonicalIndexById.has(edge.from) ? canonicalIndexById.get(edge.from) : -1;
      const toIndex = canonicalIndexById.has(edge.to) ? canonicalIndexById.get(edge.to) : -1;
      const capacity = Number.isFinite(Number(edge.capacity)) ? Number(edge.capacity) : 0;
      const attenuation = Number.isFinite(Number(edge.attenuation)) ? Number(edge.attenuation) : 0;
      const enabled = edge.enabled === false ? 0 : 1;
      return `${fromIndex}>${toIndex}:${capacity}:${attenuation}:${enabled}`;
    })
    .sort((left, right) => left.localeCompare(right))
    .join('|');

  return `nodes=${nodeSignature};edges=${edgeSignature}`;
}

export function computeTopologyFingerprint(level) {
  return `topo_${hashFnv1a(serializeTopology(level))}`;
}
