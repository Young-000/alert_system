import { useMemo } from 'react';

import {
  generateAdvices,
  getBriefingContextLabel,
  pickSummary,
} from '@/utils/briefing-advice';

import type {
  AirQualityData,
  TransitArrivalInfo,
  WeatherData,
  WidgetAirQualityData,
  WidgetTransitData,
} from '@/types/home';
import type {
  AdviceAirQualityInput,
  AdviceTransitInput,
  AdviceWeatherInput,
  ContextBriefingResult,
} from '@/types/briefing';

// ─── Input Type ─────────────────────────────────────

type UseBriefingAdviceParams = {
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  transitInfos: TransitArrivalInfo[];
};

// ─── Hook ───────────────────────────────────────────

/**
 * Computes context-aware briefing advices from existing home screen data.
 * No additional API calls needed -- uses data already fetched by useHomeData.
 */
export function useBriefingAdvice(
  params: UseBriefingAdviceParams,
): ContextBriefingResult | null {
  const { weather, airQuality, transitInfos } = params;

  return useMemo(() => {
    const weatherInput = mapWeatherInput(weather);
    const airQualityInput = mapAirQualityInput(airQuality);
    const transitInput = mapTransitInput(transitInfos);

    const advices = generateAdvices(weatherInput, airQualityInput, transitInput);

    if (advices.length === 0 && !weather && !airQuality) {
      return null;
    }

    return {
      contextLabel: getBriefingContextLabel(),
      summary: pickSummary(advices),
      advices,
    };
  }, [weather, airQuality, transitInfos]);
}

// ─── Data Mappers ───────────────────────────────────

function mapWeatherInput(
  weather: WeatherData | null,
): AdviceWeatherInput | null {
  if (!weather) return null;

  return {
    temperature: weather.temperature,
    feelsLike: weather.feelsLike,
    condition: weather.condition,
    forecast: weather.forecast
      ? {
          maxTemp: weather.forecast.maxTemp,
          minTemp: weather.forecast.minTemp,
          hourlyForecasts: weather.forecast.hourlyForecasts,
        }
      : undefined,
  };
}

function mapAirQualityInput(
  airQuality: AirQualityData | null,
): AdviceAirQualityInput | null {
  if (!airQuality) return null;

  return {
    pm10: airQuality.pm10,
    pm25: airQuality.pm25,
    statusLevel: computeStatusLevel(airQuality.pm10),
  };
}

function computeStatusLevel(
  pm10: number,
): 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy' {
  if (pm10 <= 30) return 'good';
  if (pm10 <= 80) return 'moderate';
  if (pm10 <= 150) return 'unhealthy';
  return 'veryUnhealthy';
}

function mapTransitInput(
  transitInfos: TransitArrivalInfo[],
): AdviceTransitInput | null {
  if (transitInfos.length === 0) return null;

  let subway: AdviceTransitInput['subway'] = null;
  let bus: AdviceTransitInput['bus'] = null;

  for (const info of transitInfos) {
    if (info.error || info.isLoading || info.arrivals.length === 0) continue;

    const firstArrival = info.arrivals[0];
    if (!firstArrival) continue;

    if (info.type === 'subway' && !subway) {
      subway = {
        stationName: info.name,
        arrivalMinutes: firstArrival.arrivalTime,
      };
    }

    if (info.type === 'bus' && !bus && 'remainingStops' in firstArrival) {
      bus = {
        routeName: firstArrival.routeName,
        arrivalMinutes: firstArrival.arrivalTime,
        remainingStops: firstArrival.remainingStops,
      };
    }
  }

  if (!subway && !bus) return null;

  return { subway, bus };
}
