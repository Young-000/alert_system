import type {
  ContributingFactor,
  DaySegment,
  DepartureRange,
  InsightsResponse,
  PredictionResponse,
  PredictionTier,
  SensitivityLevel,
} from './behavior-api.client';

// ========== Wire Types (서버가 실제로 보내는 모양) ==========

/**
 * `behavior-api.client.ts`의 타입은 **화면이 읽는 모양**이고, 아래는 **서버가 보내는 모양**이다.
 * 둘은 다르다.
 *
 * | 화면 | 서버 | 출처 |
 * |---|---|---|
 * | `contributingFactors` | `factors` | `prediction-engine.service.ts:156` |
 * | `summary` | `overallStats` | `:356` |
 * | `weatherSensitivity` | `weatherImpact` | `:354` |
 * | `segments[].avgMinutes` | `segments[].avgDepartureTime` ("HH:mm") | `:307` |
 * | `segments[].dayOfWeek` | `segments[].day` | `:305` |
 * | `mostConsistentDay` (객체) | 요일 번호 | `:313-318` |
 *
 * 이름이 겹치는 키가 하나도 없는 자리들이라 타입만 붙여 두면 런타임에 `undefined`가 된다.
 * 실제로 홈 카드(`PatternInsightsCard.tsx:57,108`)와 `/patterns` 전체가 이걸로 죽었다.
 * 여기서 한 번 옮겨 두면 화면 코드는 손대지 않아도 된다.
 */
export interface WirePrediction {
  departureTime: string;
  departureRange: DepartureRange;
  confidence: number;
  tier: PredictionTier;
  factors: ContributingFactor[];
  dataStatus: {
    totalRecords: number;
    recordsUsed: number;
    nextTierAt: number;
    nextTierName: string;
  };
}

interface WireDaySegment {
  day: number;
  dayName: string;
  avgDepartureTime: string;
  sampleCount: number;
  stdDevMinutes: number;
}

export interface WireInsights {
  dayOfWeek: {
    segments: WireDaySegment[];
    mostConsistentDay: number;
    mostVariableDay: number;
  } | null;
  weatherImpact: {
    sensitivity: SensitivityLevel;
    coefficients: { rain: number; snow: number; temperature: number };
    description: string;
  } | null;
  overallStats: {
    totalRecords: number;
    trackingSince: string;
    avgDepartureTime: string;
    currentTier: PredictionTier;
    predictionAccuracy: number;
  };
}

/** 엔진이 주입되지 않은 환경에서 컨트롤러가 200으로 돌려주는 모양 (`behavior.controller.ts:299`). */
export function isEngineOffResponse(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && 'error' in payload;
}

/** "HH:mm" → 자정 기준 분. 화면 차트가 분으로 계산한다(`PatternAnalysisPage.tsx:142`). */
function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * 서버는 '월요일'을, 화면은 `{dayName}요일`을 쓴다(`PatternAnalysisPage.tsx:222,231`).
 * 그대로 넘기면 "월요일요일"이 된다.
 */
function stripDaySuffix(dayName: string): string {
  return dayName.endsWith('요일') ? dayName.slice(0, -2) : dayName;
}

function toDaySegment(segment: WireDaySegment): DaySegment {
  return {
    dayOfWeek: segment.day,
    dayName: stripDaySuffix(segment.dayName),
    avgMinutes: timeStringToMinutes(segment.avgDepartureTime),
    stdDevMinutes: segment.stdDevMinutes,
    sampleCount: segment.sampleCount,
  };
}

function findDayHighlight(
  segments: DaySegment[],
  dayOfWeek: number,
): { dayOfWeek: number; dayName: string; stdDevMinutes: number } | null {
  const match = segments.find((s) => s.dayOfWeek === dayOfWeek);
  if (!match) return null;
  return {
    dayOfWeek: match.dayOfWeek,
    dayName: match.dayName,
    stdDevMinutes: match.stdDevMinutes,
  };
}

export function toPredictionResponse(wire: WirePrediction): PredictionResponse {
  return {
    departureTime: wire.departureTime,
    confidence: wire.confidence,
    tier: wire.tier,
    departureRange: wire.departureRange,
    contributingFactors: wire.factors ?? [],
    dataStatus: {
      totalRecords: wire.dataStatus.totalRecords,
      // 서버 dataStatus에는 tier가 없다. 같은 응답의 최상위 tier가 곧 현재 단계다.
      tier: wire.tier,
      nextTierAt: wire.dataStatus.nextTierAt,
      nextTierName: wire.dataStatus.nextTierName,
    },
  };
}

export function toInsightsResponse(wire: WireInsights): InsightsResponse {
  const segments = (wire.dayOfWeek?.segments ?? []).map(toDaySegment);

  return {
    dayOfWeek: {
      segments,
      mostConsistentDay:
        wire.dayOfWeek === null ? null : findDayHighlight(segments, wire.dayOfWeek.mostConsistentDay),
      mostVariableDay:
        wire.dayOfWeek === null ? null : findDayHighlight(segments, wire.dayOfWeek.mostVariableDay),
    },
    weatherSensitivity: wire.weatherImpact
      ? {
          level: wire.weatherImpact.sensitivity,
          rainImpact: wire.weatherImpact.coefficients.rain,
          snowImpact: wire.weatherImpact.coefficients.snow,
          temperatureImpact: wire.weatherImpact.coefficients.temperature,
          // 서버 description은 비 영향을 다시 말한 문장이라 같은 화면에서 중복된다.
          // 전체 평균과의 비교를 서버가 주기 전까지는 비워 둔다.
          comparedToAverage: null,
        }
      : null,
    summary: {
      totalRecords: wire.overallStats.totalRecords,
      tier: wire.overallStats.currentTier,
      averageDeparture: wire.overallStats.avgDepartureTime,
      overallStdDev: null,
      confidence: wire.overallStats.predictionAccuracy,
    },
  };
}
