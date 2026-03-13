import { NODE_TYPES } from './config.js';
import { clamp } from './physicsLite.js';

function getSpriteUrl(filename) {
  return new URL(`../SPRITES_IMAGES/${filename}`, import.meta.url).href;
}

export const SPRITE_MANIFEST = Object.freeze([
  {
    filename: 'Sprite_Power_Core_001.png',
    confidence: 'medium',
    backgroundKeyMode: 'auto',
    mappingKeys: ['core_default']
  },
  {
    filename: 'Sprite_Power_Core_002.png',
    confidence: 'medium',
    backgroundKeyMode: 'none',
    mappingKeys: ['power_default']
  },
  {
    filename: 'Sprite_Power_Firewall_001.png',
    confidence: 'medium',
    backgroundKeyMode: 'auto',
    mappingKeys: ['overload_calm']
  },
  {
    filename: 'Sprite_Power_Firewall_002.png',
    confidence: 'medium',
    backgroundKeyMode: 'auto',
    mappingKeys: ['overload_critical']
  },
  {
    filename: 'Sprite_Power_Firewall_003_grey.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['firewall_closed']
  },
  {
    filename: 'Sprite_Power_Firewall_004_green.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['firewall_open']
  },
  {
    filename: 'Sprite_Relay_block_005.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['relay_default']
  },
  {
    filename: 'Sprite_Relay_block_006.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['relay_active']
  },
  {
    filename: 'Sprite_splitter_block_009.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['splitter_default']
  },
  {
    filename: 'Sprite_splitter_block_010_red.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['splitter_corrupted']
  },
  {
    filename: 'Sprite_BREAKER_block_012.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['breaker_default']
  },
  {
    filename: 'Sprite_Purifier_block_014_green.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['purifier_active']
  },
  {
    filename: 'Sprite_Purifier_block_015_violet.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['purifier_inactive']
  },
  {
    filename: 'Sprite_VIRUS_block_010_orange.png',
    confidence: 'high',
    backgroundKeyMode: 'auto',
    mappingKeys: ['virus_default']
  },
  {
    filename: 'Sprite_VIRUS_block_019_MULTICOLOR.png',
    confidence: 'medium',
    backgroundKeyMode: 'auto',
    mappingKeys: ['virus_emphasis']
  }
]);

const SPRITE_MAP = Object.freeze({
  core_default: 'Sprite_Power_Core_001.png',
  power_default: 'Sprite_Power_Core_002.png',
  firewall_closed: 'Sprite_Power_Firewall_003_grey.png',
  firewall_open: 'Sprite_Power_Firewall_004_green.png',
  overload_calm: 'Sprite_Power_Firewall_001.png',
  overload_critical: 'Sprite_Power_Firewall_002.png',
  relay_default: 'Sprite_Relay_block_005.png',
  relay_active: 'Sprite_Relay_block_006.png',
  splitter_default: 'Sprite_splitter_block_009.png',
  splitter_corrupted: 'Sprite_splitter_block_010_red.png',
  breaker_default: 'Sprite_BREAKER_block_012.png',
  purifier_active: 'Sprite_Purifier_block_014_green.png',
  purifier_inactive: 'Sprite_Purifier_block_015_violet.png',
  virus_default: 'Sprite_VIRUS_block_010_orange.png',
  virus_emphasis: 'Sprite_VIRUS_block_019_MULTICOLOR.png'
});

const SPRITE_DRAW_STYLE = Object.freeze({
  default: Object.freeze({ scaleMul: 1.48, offsetX: 0, offsetY: 0 }),
  power_default: Object.freeze({ scaleMul: 1.6, offsetX: 0, offsetY: 0.08 }),
  core_default: Object.freeze({ scaleMul: 1.58, offsetX: 0, offsetY: 0.02 }),
  firewall_closed: Object.freeze({ scaleMul: 1.52, offsetX: 0, offsetY: 0 }),
  firewall_open: Object.freeze({ scaleMul: 1.52, offsetX: 0, offsetY: 0 }),
  overload_calm: Object.freeze({ scaleMul: 1.52, offsetX: 0, offsetY: 0.02 }),
  overload_critical: Object.freeze({ scaleMul: 1.52, offsetX: 0, offsetY: 0.02 }),
  relay_default: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  relay_active: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  splitter_default: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  splitter_corrupted: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  breaker_default: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  purifier_active: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  purifier_inactive: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  virus_default: Object.freeze({ scaleMul: 1.46, offsetX: 0, offsetY: 0 }),
  virus_emphasis: Object.freeze({ scaleMul: 1.48, offsetX: 0, offsetY: 0 })
});

function canCreateImage() {
  return typeof Image === 'function';
}

function canCreateCanvas() {
  if (typeof OffscreenCanvas === 'function') {
    return true;
  }

  return typeof document !== 'undefined'
    && document !== null
    && typeof document.createElement === 'function';
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas === 'function') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined' && document && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return null;
}

function getContext2d(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    return null;
  }

  return canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d');
}

function getSupportState() {
  if (!canCreateImage()) {
    return {
      enabled: false,
      reason: 'Image API unavailable'
    };
  }

  if (!canCreateCanvas()) {
    return {
      enabled: false,
      reason: 'Canvas API unavailable'
    };
  }

  return {
    enabled: true,
    reason: ''
  };
}

const SUPPORT_STATE = getSupportState();

const manifestByFilename = new Map();
const manifestByMappingKey = new Map();
for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
  const entry = SPRITE_MANIFEST[i];
  manifestByFilename.set(entry.filename, entry);

  for (let j = 0; j < entry.mappingKeys.length; j += 1) {
    manifestByMappingKey.set(entry.mappingKeys[j], entry);
  }
}

const spriteRecords = new Map();
for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
  const entry = SPRITE_MANIFEST[i];
  spriteRecords.set(entry.filename, {
    filename: entry.filename,
    url: getSpriteUrl(entry.filename),
    confidence: entry.confidence,
    backgroundKeyMode: entry.backgroundKeyMode,
    state: 'idle',
    error: '',
    sourceWidth: 0,
    sourceHeight: 0,
    keyedPixelCount: 0,
    canvas: null,
    bounds: {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
  });
}

const stats = {
  loadStarted: false,
  loadCompleted: false,
  pendingLoads: 0,
  attemptsByMapping: new Map(),
  drawnByMapping: new Map(),
  fallbackByMapping: new Map(),
  fallbackReasonsByMapping: new Map()
};

function incrementMapCount(map, key, amount) {
  const next = (map.get(key) || 0) + (Number.isFinite(amount) ? amount : 1);
  map.set(key, next);
}

function incrementFallbackReason(mappingKey, reason) {
  if (!stats.fallbackReasonsByMapping.has(mappingKey)) {
    stats.fallbackReasonsByMapping.set(mappingKey, new Map());
  }
  const reasonMap = stats.fallbackReasonsByMapping.get(mappingKey);
  incrementMapCount(reasonMap, reason || 'unknown', 1);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sprite: ${url}`));
    image.src = url;
  });
}

function sampleReferenceColor(data, width, height) {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width * 0.5), 0],
    [Math.floor(width * 0.5), height - 1],
    [0, Math.floor(height * 0.5)],
    [width - 1, Math.floor(height * 0.5)]
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < points.length; i += 1) {
    const x = clamp(points[i][0], 0, width - 1);
    const y = clamp(points[i][1], 0, height - 1);
    const idx = (y * width + x) * 4;
    if (data[idx + 3] <= 0) {
      continue;
    }

    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
    count += 1;
  }

  if (count <= 0) {
    return { r: 245, g: 245, b: 245 };
  }

  return {
    r: sumR / count,
    g: sumG / count,
    b: sumB / count
  };
}

function colorDistance(r, g, b, reference) {
  const dr = r - reference.r;
  const dg = g - reference.g;
  const db = b - reference.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function applyAutoBackgroundKey(data, width, height) {
  const reference = sampleReferenceColor(data, width, height);
  let keyedPixelCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha <= 0) {
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const distance = colorDistance(r, g, b, reference);

      const similarity = clamp(1 - distance / 72, 0, 1);
      const lumaFactor = clamp((luma - 190) / 65, 0, 1);
      const saturationFactor = clamp((32 - saturation) / 32, 0, 1);

      let removalStrength = similarity * lumaFactor * saturationFactor;

      if (luma > 246 && saturation < 22) {
        removalStrength = Math.max(removalStrength, 0.92);
      }

      if (removalStrength <= 0) {
        continue;
      }

      const nextAlpha = Math.max(0, Math.round(alpha * (1 - removalStrength)));
      data[idx + 3] = nextAlpha < 10 ? 0 : nextAlpha;

      if (data[idx + 3] < alpha) {
        keyedPixelCount += 1;
      }
    }
  }

  return keyedPixelCount;
}

function computeOpaqueBounds(data, width, height, alphaThreshold) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] <= alphaThreshold) {
        continue;
      }

      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width,
      height
    };
  }

  const pad = 2;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);

  return {
    x,
    y,
    width: right - x + 1,
    height: bottom - y + 1
  };
}

function prepareSprite(image, backgroundKeyMode) {
  const canvas = createCanvas(image.width, image.height);
  if (!canvas) {
    throw new Error('Canvas allocation failed during sprite prepare.');
  }

  const ctx = getContext2d(canvas);
  if (!ctx) {
    throw new Error('2D context unavailable during sprite prepare.');
  }

  ctx.clearRect(0, 0, image.width, image.height);
  ctx.drawImage(image, 0, 0);

  let keyedPixelCount = 0;
  let bounds = {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height
  };

  try {
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    if (backgroundKeyMode === 'auto') {
      keyedPixelCount = applyAutoBackgroundKey(imageData.data, image.width, image.height);
      ctx.putImageData(imageData, 0, 0);
    }

    bounds = computeOpaqueBounds(imageData.data, image.width, image.height, 14);
  } catch (error) {
    bounds = {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    };
  }

  return {
    canvas,
    keyedPixelCount,
    bounds
  };
}

async function loadAndPrepareRecord(record) {
  const image = await loadImage(record.url);
  const prepared = prepareSprite(image, record.backgroundKeyMode);

  record.canvas = prepared.canvas;
  record.bounds = prepared.bounds;
  record.sourceWidth = image.width;
  record.sourceHeight = image.height;
  record.keyedPixelCount = prepared.keyedPixelCount;
}

function startLoadingIfNeeded() {
  if (!SUPPORT_STATE.enabled || stats.loadStarted) {
    return;
  }

  stats.loadStarted = true;
  stats.pendingLoads = SPRITE_MANIFEST.length;

  for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
    const entry = SPRITE_MANIFEST[i];
    const record = spriteRecords.get(entry.filename);
    if (!record) {
      continue;
    }

    record.state = 'loading';

    loadAndPrepareRecord(record)
      .then(() => {
        record.state = 'ready';
      })
      .catch((error) => {
        record.state = 'failed';
        record.error = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        stats.pendingLoads = Math.max(0, stats.pendingLoads - 1);
        if (stats.pendingLoads <= 0) {
          stats.loadCompleted = true;
        }
      });
  }
}

function getViewportScaleFactor(ctx) {
  const canvasWidth = Number(ctx?.canvas?.width) || 960;
  if (canvasWidth <= 560) {
    return 0.86;
  }
  if (canvasWidth <= 760) {
    return 0.92;
  }
  return 1;
}

function resolveMappingKey(node, flags) {
  if (!node || node.exploded) {
    return null;
  }

  if (node.baseType === NODE_TYPES.CORE) {
    return 'core_default';
  }

  if (node.baseType === NODE_TYPES.POWER) {
    return 'power_default';
  }

  if (node.baseType === NODE_TYPES.FIREWALL) {
    return node.firewallOpen ? 'firewall_open' : 'firewall_closed';
  }

  if (node.baseType === NODE_TYPES.OVERLOAD) {
    const threshold = Math.max(1, Number(node.overloadThreshold) || 1);
    const ratio = Math.max(0, node.throughputThisTurn / threshold);
    return ratio >= 0.9 ? 'overload_critical' : 'overload_calm';
  }

  if (node.baseType === NODE_TYPES.RELAY) {
    return node.active ? 'relay_active' : 'relay_default';
  }

  if (node.baseType === NODE_TYPES.SPLITTER) {
    return node.corrupted ? 'splitter_corrupted' : 'splitter_default';
  }

  if (node.baseType === NODE_TYPES.BREAKER) {
    return 'breaker_default';
  }

  if (node.baseType === NODE_TYPES.PURIFIER) {
    return node.active ? 'purifier_active' : 'purifier_inactive';
  }

  if (node.baseType === NODE_TYPES.VIRUS) {
    const emphasize = Boolean(flags?.hovered) || Boolean(flags?.hintFocused);
    return emphasize ? 'virus_emphasis' : 'virus_default';
  }

  return null;
}

function drawPreparedRecord(ctx, node, record, mappingKey) {
  if (!ctx || !node || !record || record.state !== 'ready' || !record.canvas) {
    return false;
  }

  const style = SPRITE_DRAW_STYLE[mappingKey] || SPRITE_DRAW_STYLE.default;
  const viewportScale = getViewportScaleFactor(ctx);
  const effectiveScale = clamp((style.scaleMul || SPRITE_DRAW_STYLE.default.scaleMul) * viewportScale, 1.2, 1.68);

  const sourceBounds = record.bounds || {
    x: 0,
    y: 0,
    width: record.sourceWidth,
    height: record.sourceHeight
  };

  if (!sourceBounds.width || !sourceBounds.height) {
    return false;
  }

  const drawWidth = node.radius * 2 * effectiveScale;
  const aspect = sourceBounds.height / Math.max(sourceBounds.width, 1);
  const drawHeight = drawWidth * aspect;
  const offsetX = (style.offsetX || 0) * node.radius;
  const offsetY = (style.offsetY || 0) * node.radius;

  const drawX = node.x - drawWidth * 0.5 + offsetX;
  const drawY = node.y - drawHeight * 0.5 + offsetY;

  ctx.drawImage(
    record.canvas,
    sourceBounds.x,
    sourceBounds.y,
    sourceBounds.width,
    sourceBounds.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  return true;
}

function markAttempt(mappingKey) {
  incrementMapCount(stats.attemptsByMapping, mappingKey, 1);
}

function markDrawn(mappingKey) {
  incrementMapCount(stats.drawnByMapping, mappingKey, 1);
}

function markFallback(mappingKey, reason) {
  incrementMapCount(stats.fallbackByMapping, mappingKey, 1);
  incrementFallbackReason(mappingKey, reason || 'fallback');
}

export function tryDrawNodeSprite(ctx, node, state, flags) {
  const mappingKey = resolveMappingKey(node, flags);
  if (!mappingKey) {
    return false;
  }

  markAttempt(mappingKey);

  if (!SUPPORT_STATE.enabled) {
    markFallback(mappingKey, SUPPORT_STATE.reason || 'unsupported_environment');
    return false;
  }

  startLoadingIfNeeded();

  const filename = SPRITE_MAP[mappingKey];
  if (!filename) {
    markFallback(mappingKey, 'missing_mapping');
    return false;
  }

  const record = spriteRecords.get(filename);
  if (!record) {
    markFallback(mappingKey, 'missing_record');
    return false;
  }

  if (record.state !== 'ready') {
    markFallback(mappingKey, record.state === 'failed' ? 'load_failed' : 'loading');
    return false;
  }

  const drawn = drawPreparedRecord(ctx, node, record, mappingKey);
  if (!drawn) {
    markFallback(mappingKey, 'draw_failed');
    return false;
  }

  markDrawn(mappingKey);
  return true;
}

function mapToPlainObject(map) {
  const output = {};
  map.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function mapOfMapsToPlainObject(map) {
  const output = {};
  map.forEach((innerMap, key) => {
    output[key] = mapToPlainObject(innerMap);
  });
  return output;
}

export function getSpriteDiagnostics() {
  const mappedFilenames = new Set(Object.values(SPRITE_MAP));
  const mappingKeys = Object.keys(SPRITE_MAP);

  const mapping = [];
  for (let i = 0; i < mappingKeys.length; i += 1) {
    const mappingKey = mappingKeys[i];
    const filename = SPRITE_MAP[mappingKey];
    const manifestEntry = manifestByFilename.get(filename);
    const style = SPRITE_DRAW_STYLE[mappingKey] || SPRITE_DRAW_STYLE.default;

    mapping.push({
      mappingKey,
      filename,
      confidence: manifestEntry ? manifestEntry.confidence : 'unknown',
      backgroundKeyMode: manifestEntry ? manifestEntry.backgroundKeyMode : 'none',
      style: {
        scaleMul: style.scaleMul,
        offsetX: style.offsetX,
        offsetY: style.offsetY
      }
    });
  }

  const spriteStatus = [];
  for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
    const entry = SPRITE_MANIFEST[i];
    const record = spriteRecords.get(entry.filename);
    spriteStatus.push({
      filename: entry.filename,
      url: getSpriteUrl(entry.filename),
      confidence: entry.confidence,
      backgroundKeyMode: entry.backgroundKeyMode,
      state: record ? record.state : 'missing',
      error: record ? record.error : 'record_missing',
      sourceWidth: record ? record.sourceWidth : 0,
      sourceHeight: record ? record.sourceHeight : 0,
      keyedPixelCount: record ? record.keyedPixelCount : 0,
      mapped: mappedFilenames.has(entry.filename)
    });
  }

  const unusedFilenames = [];
  for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
    const filename = SPRITE_MANIFEST[i].filename;
    if (!mappedFilenames.has(filename)) {
      unusedFilenames.push(filename);
    }
  }

  const ambiguousFilenames = [];
  for (let i = 0; i < SPRITE_MANIFEST.length; i += 1) {
    const entry = SPRITE_MANIFEST[i];
    if (entry.confidence !== 'high') {
      ambiguousFilenames.push(entry.filename);
    }
  }

  const unmappedMappings = [];
  for (let i = 0; i < mappingKeys.length; i += 1) {
    const key = mappingKeys[i];
    if (!manifestByMappingKey.has(key)) {
      unmappedMappings.push(key);
    }
  }

  return {
    enabled: SUPPORT_STATE.enabled,
    disabledReason: SUPPORT_STATE.enabled ? '' : SUPPORT_STATE.reason,
    loadStarted: stats.loadStarted,
    loadCompleted: stats.loadCompleted,
    pendingLoads: stats.pendingLoads,
    mapping,
    spriteStatus,
    attemptsByMapping: mapToPlainObject(stats.attemptsByMapping),
    drawnByMapping: mapToPlainObject(stats.drawnByMapping),
    fallbackByMapping: mapToPlainObject(stats.fallbackByMapping),
    fallbackReasonsByMapping: mapOfMapsToPlainObject(stats.fallbackReasonsByMapping),
    ambiguousFilenames,
    unusedFilenames,
    unmappedMappings
  };
}
