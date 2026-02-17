import { useMemo } from 'react';
import type { WeatherData } from '@infrastructure/api';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import type { TransitArrivalInfo } from './route-utils';
import { getTimeContext, buildBriefing } from './build-briefing';

interface MorningBriefingProps {
  weather: WeatherData | null;
  airQuality: { label: string; className: string };
  commuteStats: CommuteStatsResponse | null;
  transitInfos: TransitArrivalInfo[];
  routeName: string;
}

export function MorningBriefing({
  weather,
  airQuality,
  commuteStats,
  transitInfos,
  routeName,
}: MorningBriefingProps): JSX.Element | null {
  const briefing = useMemo(() => {
    const context = getTimeContext();
    return buildBriefing({
      context,
      weather,
      airQuality,
      commuteStats,
      transitInfos,
      routeName,
    });
  }, [weather, airQuality, commuteStats, transitInfos, routeName]);

  if (!briefing) return null;

  const context = getTimeContext();

  return (
    <section
      className={`morning-briefing morning-briefing--${context}`}
      aria-label={briefing.ariaLabel}
    >
      <span className="morning-briefing-label">{briefing.contextLabel}</span>
      <p className="morning-briefing-main">{briefing.main}</p>
      <p className="morning-briefing-sub">{briefing.sub}</p>
    </section>
  );
}
