import type {
  AqiStatus,
  BriefingData,
  CommuteStatsResponse,
  TimeContext,
  TransitArrivalInfo,
  WeatherData,
} from '@/types/home';

import { getTimeContext } from './route';

/**
 * Builds a one-line commute briefing from available data.
 * Returns null if there's not enough data.
 */
export function buildBriefing(params: {
  weather: WeatherData | null;
  aqiStatus: AqiStatus;
  commuteStats: CommuteStatsResponse | null;
  transitInfos: TransitArrivalInfo[];
  routeName: string;
}): BriefingData | null {
  const { weather, aqiStatus, commuteStats, transitInfos, routeName } = params;

  if (!routeName) return null;

  const context = getTimeContext();
  const parts: string[] = [];

  // Weather: emoji + temp
  if (weather) {
    const emoji = weather.conditionEmoji || '';
    const temp = `${Math.round(weather.temperature)}°`;
    parts.push(`${emoji} ${temp}`.trim());
  }

  // Air quality (only if meaningful)
  if (aqiStatus.label !== '-') {
    parts.push(aqiStatus.label);
  }

  // Commute duration (only with 3+ sessions)
  if (
    commuteStats &&
    commuteStats.overallAverageDuration > 0 &&
    commuteStats.overallAverageDuration < 180 &&
    (commuteStats.totalSessions ?? 0) >= 3
  ) {
    const minutes = Math.round(commuteStats.overallAverageDuration);
    parts.push(`약 ${minutes}분 예상`);
  }

  if (parts.length === 0) return null;

  const main = parts.join(' · ');
  const sub = buildSubLine(transitInfos, routeName);
  const contextLabel = getContextLabel(context);

  return { main, sub, contextLabel };
}

function getContextLabel(context: TimeContext): string {
  if (context === 'morning') return '출근 브리핑';
  if (context === 'evening') return '퇴근 브리핑';
  return '내일 출근 브리핑';
}

function buildSubLine(
  transitInfos: TransitArrivalInfo[],
  routeName: string,
): string {
  for (const info of transitInfos) {
    if (info.isLoading || info.error) continue;
    const arrival = info.arrivals[0];
    if (!arrival) continue;

    const name = info.name;
    const timeText =
      arrival.arrivalTime > 0
        ? `${arrival.arrivalTime}분 후 도착`
        : '곧 도착';

    return `${name} ${timeText}`;
  }

  return routeName;
}
