import type { ApiClient } from './api-client';

// ─── Types ─────────────────────────────────────────

export type AdviceSeverity = 'info' | 'warning' | 'danger';

/**
 * 화면에서 **로컬로 조립**하는 조언 칩. 서버 응답 타입이 아니다.
 * (BriefingSection.tsx가 날씨·대기질 데이터로 직접 만들어 쓴다)
 * 서버가 내려주는 조언은 아래 BriefingAdvice다 — 두 타입을 섞지 말 것.
 */
export interface AdviceChip {
  emoji: string;
  text: string;
  severity: AdviceSeverity;
}

/** 서버 AdviceCategory (backend: application/dto/briefing.dto.ts) */
export type AdviceCategory =
  | 'clothing'
  | 'umbrella'
  | 'mask'
  | 'transit'
  | 'temperature'
  | 'wind';

/** 서버 BriefingAdviceDto (backend: application/dto/briefing.dto.ts) */
export interface BriefingAdvice {
  category: AdviceCategory;
  severity: AdviceSeverity;
  icon: string;
  message: string;
  detail?: string;
}

/** 서버 WidgetWeatherDto (backend: application/dto/widget-data.dto.ts) */
export interface BriefingWeatherData {
  temperature: number;
  condition: string;
  conditionEmoji: string;
  conditionKr: string;
  feelsLike?: number;
  maxTemp?: number;
  minTemp?: number;
}

/** 서버 WidgetAirQualityDto */
export interface BriefingAirQualityData {
  pm10: number;
  pm25: number;
  status: string;
  statusLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
}

/** 서버 WidgetSubwayDto */
export interface BriefingSubwayData {
  stationName: string;
  lineInfo: string;
  arrivalMinutes: number;
  destination: string;
}

/** 서버 WidgetBusDto */
export interface BriefingBusData {
  stopName: string;
  routeName: string;
  arrivalMinutes: number;
  remainingStops: number;
}

/** 서버 WidgetTransitDto */
export interface BriefingTransitData {
  subway: BriefingSubwayData | null;
  bus: BriefingBusData | null;
}

/** 서버 WidgetDepartureDataDto */
export interface BriefingDepartureData {
  departureType: 'commute' | 'return';
  optimalDepartureAt: string;
  minutesUntilDeparture: number;
  estimatedTravelMin: number;
  arrivalTarget: string;
  status: string;
  hasTrafficDelay: boolean;
}

/**
 * GET /briefing 응답.
 * 백엔드 BriefingController.getBriefing의 BriefingEndpointResponse와 1:1로 맞춘다.
 */
export interface BriefingResponse {
  advices: BriefingAdvice[];
  weather: BriefingWeatherData | null;
  airQuality: BriefingAirQualityData | null;
  transit: BriefingTransitData;
  departure: BriefingDepartureData | null;
  contextLabel: string;
  summary: string;
  updatedAt: string;
}

// ─── API Client ────────────────────────────────────

export class BriefingApiClient {
  constructor(private apiClient: ApiClient) {}

  async getBriefing(lat?: number, lng?: number): Promise<BriefingResponse> {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', String(lat));
    if (lng !== undefined) params.set('lng', String(lng));
    const qs = params.toString();
    const url = `/briefing${qs ? `?${qs}` : ''}`;
    return this.apiClient.get<BriefingResponse>(url);
  }
}
