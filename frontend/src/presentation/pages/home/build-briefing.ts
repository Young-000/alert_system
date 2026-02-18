import type { WeatherData } from '@infrastructure/api';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import type { TransitArrivalInfo } from './route-utils';

// ─── Types ─────────────────────────────────────────

export type TimeContext = 'morning' | 'evening' | 'tomorrow';

export interface BriefingData {
  /** e.g. "☀️ 3° · 좋음 · 약 45분 예상" */
  main: string;
  /** e.g. "2호선 강남역 3분 후 도착" or route name */
  sub: string;
  /** Full text for screen readers */
  ariaLabel: string;
  /** Context label shown above the briefing */
  contextLabel: string;
}

// ─── Pure Functions ────────────────────────────────

/**
 * Determines the commute context based on current hour.
 * @param hour - 0-23 hour value (defaults to current hour)
 */
export function getTimeContext(hour?: number): TimeContext {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'evening';
  return 'tomorrow';
}

/**
 * Builds a one-line commute briefing from available data.
 * Returns null if there's not enough data to show anything useful.
 */
export function buildBriefing(params: {
  context: TimeContext;
  weather: WeatherData | null;
  airQuality: { label: string; className: string };
  commuteStats: CommuteStatsResponse | null;
  transitInfos: TransitArrivalInfo[];
  routeName: string;
}): BriefingData | null {
  const { context, weather, airQuality, commuteStats, transitInfos, routeName } = params;

  if (!routeName) return null;

  // Build main line parts
  const parts: string[] = [];

  // Weather part: emoji + temp
  if (weather) {
    const emoji = weather.conditionEmoji || '';
    const temp = `${Math.round(weather.temperature)}°`;
    parts.push(`${emoji} ${temp}`.trim());
  }

  // Air quality part (only if meaningful)
  if (airQuality.label !== '-') {
    parts.push(airQuality.label);
  }

  // Commute duration estimate (from stats)
  // Only show if we have enough data (3+ sessions) and value is reasonable (< 180 min)
  if (
    commuteStats &&
    commuteStats.overallAverageDuration > 0 &&
    commuteStats.overallAverageDuration < 180 &&
    (commuteStats.totalSessions ?? 0) >= 3
  ) {
    const minutes = Math.round(commuteStats.overallAverageDuration);
    parts.push(`약 ${minutes}분 예상`);
  }

  // If we have nothing at all, skip
  if (parts.length === 0) return null;

  const main = parts.join(' · ');

  // Build sub line: first transit arrival or route name
  const sub = buildSubLine(transitInfos, routeName);

  // Context label
  const contextLabel = context === 'morning'
    ? '출근 브리핑'
    : context === 'evening'
      ? '퇴근 브리핑'
      : '내일 출근 브리핑';

  // Aria label: full readable text
  const ariaLabel = `${contextLabel}. ${main}. ${sub}`;

  return { main, sub, ariaLabel, contextLabel };
}

/**
 * Builds the sub-line from transit arrivals, falling back to route name.
 */
function buildSubLine(
  transitInfos: TransitArrivalInfo[],
  routeName: string,
): string {
  // Find the first transit with actual arrival data
  for (const info of transitInfos) {
    if (info.isLoading || info.error) continue;
    const arrival = info.arrivals[0];
    if (!arrival) continue;

    const typeName = info.type === 'subway' ? '' : '';
    const name = info.name;
    const timeText = arrival.arrivalTime > 0
      ? `${arrival.arrivalTime}분 후 도착`
      : '곧 도착';

    return `${typeName}${name} ${timeText}`.trim();
  }

  // Fallback: just show the route name
  return routeName;
}
