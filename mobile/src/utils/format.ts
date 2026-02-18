/**
 * Formats a timestamp into a relative time string.
 * e.g., "방금 전", "30초 전", "2분 전"
 */
export function formatRelativeTime(timestamp: number | null): string {
  if (timestamp == null) return '';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;

  return `${Math.floor(diffMin / 60)}시간 전`;
}

/**
 * Formats temperature as integer with degree symbol.
 * e.g., 7.3 -> "7°C"
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

/**
 * Formats temperature as integer with just degree symbol (compact).
 * e.g., 7.3 -> "7°"
 */
export function formatTempCompact(temp: number): string {
  return `${Math.round(temp)}°`;
}
