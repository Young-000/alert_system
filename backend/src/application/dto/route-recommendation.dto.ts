import { IsOptional, IsString } from 'class-validator';

/**
 * 경로별 점수 DTO
 */
export class RouteScoreDto {
  /** 경로 ID */
  routeId: string;

  /** 경로 이름 */
  routeName: string;

  /** 종합 점수 (0-100) */
  totalScore: number;

  /** 세부 점수 */
  scores: {
    /** 속도 점수 - 평균 소요시간 기반 (40%) */
    speed: number;
    /** 안정성 점수 - 변동성 기반 (40%) */
    reliability: number;
    /** 날씨 영향 점수 - 날씨별 추가 소요시간 (20%) */
    weatherResilience: number;
  };

  /** 평균 소요시간 (분) */
  averageDuration: number;

  /** 소요시간 변동성 (표준편차) */
  variability: number;

  /** 샘플 수 */
  sampleCount: number;

  /** 추천 이유 (한국어) */
  reasons: string[];
}

/**
 * 경로 추천 응답 DTO
 */
export class RouteRecommendationResponseDto {
  /** 추천 경로 ID */
  recommendedRouteId: string | null;

  /** 추천 경로 상세 */
  recommendation: RouteScoreDto | null;

  /** 대안 경로들 (점수 순) */
  alternatives: RouteScoreDto[];

  /** 신뢰도 (0-1) - 데이터 충분성 기반 */
  confidence: number;

  /** 추가 인사이트 */
  insights: string[];

  /** 기준 날씨 조건 (쿼리에서 전달된 값) */
  weatherCondition?: string;
}

/**
 * 경로 추천 요청 쿼리 DTO
 */
export class RouteRecommendationQueryDto {
  @IsOptional()
  @IsString()
  weather?: string;
}
