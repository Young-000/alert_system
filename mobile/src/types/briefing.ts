// ─── Briefing Advice Types ──────────────────────────

export type AdviceSeverity = 'info' | 'warning' | 'danger';

export type AdviceCategory =
  | 'clothing'
  | 'umbrella'
  | 'mask'
  | 'transit'
  | 'temperature'
  | 'wind';

export type BriefingAdvice = {
  category: AdviceCategory;
  severity: AdviceSeverity;
  icon: string;
  message: string;
};

// ─── Advice Engine Input ────────────────────────────

export type AdviceWeatherInput = {
  temperature: number;
  feelsLike?: number;
  condition: string;
  forecast?: {
    maxTemp: number;
    minTemp: number;
    hourlyForecasts: {
      time: string;
      temperature: number;
      condition: string;
      rainProbability: number;
    }[];
  };
};

export type AdviceAirQualityInput = {
  pm10: number;
  pm25: number;
  statusLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
};

export type AdviceTransitInput = {
  subway: {
    stationName: string;
    arrivalMinutes: number;
  } | null;
  bus: {
    routeName: string;
    arrivalMinutes: number;
    remainingStops: number;
  } | null;
};

// ─── Context Briefing Result ────────────────────────

export type ContextBriefingResult = {
  contextLabel: string;
  summary: string;
  advices: BriefingAdvice[];
};
