/**
 * Normalize checkpoint data into a stable segment key for cross-user aggregation.
 *
 * Priority:
 *   1. linkedStationId (most reliable for subway)
 *   2. linkedBusStopId (reliable for bus stops)
 *   3. Normalized name + lineInfo (fallback)
 */
export function normalizeSegmentKey(checkpoint: {
  linkedStationId?: string | null;
  linkedBusStopId?: string | null;
  name: string;
  lineInfo?: string | null;
  checkpointType: string;
}): string {
  // Priority 1: linked station ID
  if (checkpoint.linkedStationId) {
    const lineInfoSuffix = checkpoint.lineInfo
      ? `_${normalizeLineInfo(checkpoint.lineInfo)}`
      : '';
    return `station_${checkpoint.linkedStationId}${lineInfoSuffix}`;
  }

  // Priority 2: linked bus stop ID
  if (checkpoint.linkedBusStopId) {
    return `bus_${checkpoint.linkedBusStopId}`;
  }

  // Priority 3: normalized name + lineInfo
  const normalizedName = normalizeName(checkpoint.name);
  const lineInfoSuffix = checkpoint.lineInfo
    ? `_${normalizeLineInfo(checkpoint.lineInfo)}`
    : '';
  return `name_${normalizedName}${lineInfoSuffix}`;
}

/**
 * Normalize a checkpoint name for grouping:
 * - Lowercase
 * - Strip common suffixes (정류장, 정류소, 역, 站) — longest match first, repeat
 * - Trim whitespace
 */
function normalizeName(name: string): string {
  let result = name.toLowerCase().trim().replace(/\s+/g, '');
  // Remove suffixes from longest to shortest, repeat until stable
  const suffixes = ['정류장', '정류소', '역', '站'];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (result.endsWith(suffix) && result.length > suffix.length) {
        result = result.slice(0, -suffix.length);
        changed = true;
      }
    }
  }
  return result;
}

/**
 * Normalize line info for consistent keys.
 */
function normalizeLineInfo(lineInfo: string): string {
  return lineInfo
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');
}
