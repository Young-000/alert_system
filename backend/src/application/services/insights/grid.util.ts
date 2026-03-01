/**
 * Grid-based geographic clustering utility.
 *
 * Uses 0.01-degree grid (~1.1km latitude, ~0.9km longitude in Korea).
 * Snap coordinates to grid cell center for consistent grouping.
 */

/**
 * Snap a coordinate to the grid cell's lower-left corner.
 * Grid size: 0.01 degrees.
 */
export function snapToGridFloor(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Snap a coordinate to the grid cell center.
 * Grid size: 0.01 degrees, center offset: 0.005.
 */
export function snapToGridCenter(value: number): number {
  return snapToGridFloor(value) + 0.005;
}

/**
 * Generate a unique grid key from lat/lng coordinates.
 * Format: "grid_{lat}_{lng}" with 2 decimal places.
 */
export function toGridKey(lat: number, lng: number): string {
  const gridLat = snapToGridFloor(lat);
  const gridLng = snapToGridFloor(lng);
  return `grid_${gridLat.toFixed(2)}_${gridLng.toFixed(2)}`;
}

/**
 * Parse a grid key back into coordinates (cell center).
 */
export function parseGridKey(key: string): { lat: number; lng: number } | null {
  const match = key.match(/^grid_([-\d.]+)_([-\d.]+)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat: lat + 0.005, lng: lng + 0.005 };
}

/**
 * Determine the most common name in a list of checkpoint names.
 * Used to derive region name from the most common checkpoint in a grid cell.
 */
export function mostCommonName(names: readonly string[]): string {
  if (names.length === 0) return '알 수 없는 지역';

  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  let maxCount = 0;
  let bestName = names[0];
  for (const [name, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      bestName = name;
    }
  }

  return bestName;
}
