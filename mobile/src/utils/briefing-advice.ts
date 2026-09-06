import { getTimeContext } from './route';

import type {
  AdviceAirQualityInput,
  AdviceTransitInput,
  AdviceWeatherInput,
  BriefingAdvice,
  AdviceSeverity,
  AdviceCategory,
} from '@/types/briefing';

// ─── Constants ──────────────────────────────────────

const MAX_ADVICES = 4;

const SEVERITY_ORDER: Record<AdviceSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

const CATEGORY_ORDER: Record<AdviceCategory, number> = {
  umbrella: 0,
  mask: 1,
  clothing: 2,
  transit: 3,
  temperature: 4,
  wind: 5,
};

// ─── Public API ─────────────────────────────────────

/**
 * Generates context-aware briefing advices from weather, air quality,
 * and transit data. Returns at most 4 advices sorted by severity.
 *
 * Pure function: no side effects, no external API calls.
 */
export function generateAdvices(
  weather: AdviceWeatherInput | null,
  airQuality: AdviceAirQualityInput | null,
  transit: AdviceTransitInput | null,
): BriefingAdvice[] {
  const advices: BriefingAdvice[] = [];

  if (weather) {
    advices.push(...generateWeatherAdvices(weather));
    advices.push(...generatePrecipitationAdvices(weather));
  }

  if (airQuality) {
    advices.push(...generateAirQualityAdvices(airQuality));
  }

  if (transit) {
    advices.push(...generateTransitAdvices(transit));
  }

  return sortAndLimit(advices);
}

/**
 * 브리핑 카드의 구간 라벨.
 *
 * 경계는 `getTimeContext` 하나에서만 온다. 직접 시각을 나누면 안 된다 —
 * `BriefingCard`는 라벨을 이 함수로, 배경색을 `getTimeContext`로 정하고,
 * 조언이 하나도 없을 때 그리는 legacy 경로는 `getTimeContext` 라벨을 쓴다.
 * 경계가 갈리면 라벨이 자기 배경색과 반대되는 시간대를 말하고, 같은 시각의
 * 같은 카드가 조언 유무에 따라 다른 라벨을 단다.
 *
 * 웹도 `build-briefing.ts` 한곳에서 둘 다 파생시킨다 — 같은 계약이다.
 */
export function getBriefingContextLabel(hour?: number): string {
  switch (getTimeContext(hour)) {
    case 'morning':
      return '출근 브리핑';
    case 'evening':
      return '퇴근 브리핑';
    case 'tomorrow':
      return '내일 출근 브리핑';
  }
}

/**
 * Picks the best summary line from advices for widget display.
 * Returns the highest severity advice message, or a default.
 */
export function pickSummary(advices: BriefingAdvice[]): string {
  if (advices.length === 0) return '오늘도 좋은 하루 되세요';
  // advices are already sorted by severity, first is highest
  return advices[0]?.message ?? '오늘도 좋은 하루 되세요';
}

// ─── Weather (Temperature) Advices ──────────────────

function generateWeatherAdvices(
  weather: AdviceWeatherInput,
): BriefingAdvice[] {
  const advices: BriefingAdvice[] = [];

  // Use feelsLike if available, otherwise actual temperature
  const effectiveTemp = weather.feelsLike ?? weather.temperature;

  advices.push(getClothingAdvice(effectiveTemp));

  // Daily temperature range warning
  if (weather.forecast) {
    const range = weather.forecast.maxTemp - weather.forecast.minTemp;
    if (range >= 10) {
      advices.push({
        category: 'clothing',
        severity: 'warning',
        icon: '🧥',
        message: `일교차 ${Math.round(range)}도, 겉옷 챙기세요`,
      });
    }
  }

  // Wind chill warning: feelsLike significantly lower than actual temp
  if (
    weather.feelsLike != null &&
    weather.temperature - weather.feelsLike >= 5
  ) {
    advices.push({
      category: 'wind',
      severity: 'warning',
      icon: '💨',
      message: `체감 ${Math.round(weather.feelsLike)}도, 바람 강해요`,
    });
  }

  return advices;
}

function getClothingAdvice(temp: number): BriefingAdvice {
  if (temp <= -10) {
    return {
      category: 'clothing',
      severity: 'danger',
      icon: '🥶',
      message: '패딩 필수, 방한용품 챙기세요',
    };
  }
  if (temp <= 0) {
    return {
      category: 'clothing',
      severity: 'warning',
      icon: '🧥',
      message: '두꺼운 외투 필수',
    };
  }
  if (temp <= 5) {
    return {
      category: 'clothing',
      severity: 'warning',
      icon: '🧥',
      message: '코트나 두꺼운 겉옷',
    };
  }
  if (temp <= 10) {
    return {
      category: 'clothing',
      severity: 'info',
      icon: '🧶',
      message: '자켓 + 니트 추천',
    };
  }
  if (temp <= 15) {
    return {
      category: 'clothing',
      severity: 'info',
      icon: '👔',
      message: '가벼운 겉옷',
    };
  }
  if (temp <= 20) {
    return {
      category: 'clothing',
      severity: 'info',
      icon: '👕',
      message: '긴팔 또는 얇은 겉옷',
    };
  }
  if (temp <= 25) {
    return {
      category: 'clothing',
      severity: 'info',
      icon: '👕',
      message: '반팔 가능, 실내 냉방 주의',
    };
  }
  if (temp <= 28) {
    return {
      category: 'clothing',
      severity: 'info',
      icon: '☀️',
      message: '반팔, 수분 섭취',
    };
  }
  if (temp <= 33) {
    return {
      category: 'clothing',
      severity: 'warning',
      icon: '🥵',
      message: '더위 주의, 수분 섭취 필수',
    };
  }
  return {
    category: 'clothing',
    severity: 'danger',
    icon: '🔥',
    message: '폭염 경보, 외출 자제',
  };
}

// ─── Precipitation / Weather Condition Advices ──────

function generatePrecipitationAdvices(
  weather: AdviceWeatherInput,
): BriefingAdvice[] {
  const condition = weather.condition.toLowerCase();

  // Thunder takes highest priority
  if (condition.includes('thunder')) {
    return [
      {
        category: 'umbrella',
        severity: 'danger',
        icon: '⛈️',
        message: '뇌우 예보, 외출 주의',
      },
    ];
  }

  // Snow
  if (condition.includes('snow')) {
    return [
      {
        category: 'umbrella',
        severity: 'warning',
        icon: '❄️',
        message: '눈 예보, 미끄럼 주의',
      },
    ];
  }

  // Fog/mist/haze
  if (
    condition.includes('mist') ||
    condition.includes('fog') ||
    condition.includes('haze')
  ) {
    return [
      {
        category: 'umbrella',
        severity: 'info',
        icon: '🌫️',
        message: '시야 주의, 안전 운전',
      },
    ];
  }

  // Rain in current condition
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return [
      {
        category: 'umbrella',
        severity: 'warning',
        icon: '🌂',
        message: '우산 챙기세요',
      },
    ];
  }

  // Rain probability from forecast
  const maxRainProb = getMaxRainProbability(weather);
  if (maxRainProb >= 60) {
    return [
      {
        category: 'umbrella',
        severity: 'warning',
        icon: '🌂',
        message: `우산 필수 (강수확률 ${maxRainProb}%)`,
      },
    ];
  }
  if (maxRainProb >= 40) {
    return [
      {
        category: 'umbrella',
        severity: 'info',
        icon: '🌂',
        message: '우산 챙기면 좋겠어요',
      },
    ];
  }

  return [];
}

function getMaxRainProbability(weather: AdviceWeatherInput): number {
  if (!weather.forecast?.hourlyForecasts?.length) return 0;

  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;

  // Filter relevant time slots
  const relevantForecasts = weather.forecast.hourlyForecasts.filter((f) => {
    const forecastHour = new Date(f.time).getHours();
    if (isMorning) {
      // Morning: check 6~14 range
      return forecastHour >= 6 && forecastHour <= 14;
    }
    // Evening: check 12~21 range
    return forecastHour >= 12 && forecastHour <= 21;
  });

  if (relevantForecasts.length === 0) {
    // Fallback: use all available forecasts
    return Math.max(
      ...weather.forecast.hourlyForecasts.map((f) => f.rainProbability),
      0,
    );
  }

  return Math.max(...relevantForecasts.map((f) => f.rainProbability), 0);
}

// ─── Air Quality Advices ────────────────────────────

function generateAirQualityAdvices(
  airQuality: AdviceAirQualityInput,
): BriefingAdvice[] {
  // PM2.5 correction: if PM2.5 > 35, bump status one level up
  let effectiveLevel = airQuality.statusLevel;
  if (airQuality.pm25 > 35 && effectiveLevel === 'moderate') {
    effectiveLevel = 'unhealthy';
  }

  switch (effectiveLevel) {
    case 'good':
      return [
        {
          category: 'mask',
          severity: 'info',
          icon: '😊',
          message: '공기 좋음, 산책하기 좋아요',
        },
      ];
    case 'moderate':
      return [
        {
          category: 'mask',
          severity: 'info',
          icon: '😐',
          message: '미세먼지 보통',
        },
      ];
    case 'unhealthy':
      return [
        {
          category: 'mask',
          severity: 'warning',
          icon: '😷',
          message: '마스크 착용 권장',
        },
      ];
    case 'veryUnhealthy':
      return [
        {
          category: 'mask',
          severity: 'danger',
          icon: '🤢',
          message: '마스크 필수, 실외활동 자제',
        },
      ];
    default:
      return [];
  }
}

// ─── Transit Advices ────────────────────────────────

function generateTransitAdvices(
  transit: AdviceTransitInput,
): BriefingAdvice[] {
  const advices: BriefingAdvice[] = [];

  if (transit.subway) {
    const { stationName, arrivalMinutes } = transit.subway;
    if (arrivalMinutes <= 3) {
      advices.push({
        category: 'transit',
        severity: 'warning',
        icon: '🚇',
        message: `${stationName} 곧 도착, 서두르세요`,
      });
    } else {
      advices.push({
        category: 'transit',
        severity: 'info',
        icon: '🚇',
        message: `${stationName} ${arrivalMinutes}분 후 도착`,
      });
    }
  }

  if (transit.bus) {
    const { routeName, arrivalMinutes, remainingStops } = transit.bus;
    if (arrivalMinutes <= 3) {
      advices.push({
        category: 'transit',
        severity: 'warning',
        icon: '🚌',
        message: `${routeName}번 곧 도착`,
      });
    } else {
      advices.push({
        category: 'transit',
        severity: 'info',
        icon: '🚌',
        message: `${routeName}번 ${arrivalMinutes}분 후 (${remainingStops}정거장)`,
      });
    }
  }

  return advices;
}

// ─── Sorting & Limiting ─────────────────────────────

function sortAndLimit(advices: BriefingAdvice[]): BriefingAdvice[] {
  const sorted = [...advices].sort((a, b) => {
    // Primary: severity (danger > warning > info)
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Secondary: category order (umbrella > mask > clothing > transit > ...)
    return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  });

  return sorted.slice(0, MAX_ADVICES);
}
