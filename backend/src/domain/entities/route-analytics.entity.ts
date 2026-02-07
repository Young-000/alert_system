import { v4 as uuidv4 } from 'uuid';

// 구간별 통계
export interface SegmentStats {
  checkpointName: string;
  transportMode: string;
  averageDuration: number;  // 평균 소요시간 (분)
  minDuration: number;
  maxDuration: number;
  variability: 'stable' | 'variable' | 'unpredictable';  // 일관성
  sampleCount: number;
}

// 조건별 분석
export interface ConditionAnalysis {
  // 날씨별
  byWeather: Record<string, { avgDuration: number; count: number }>;
  // 요일별
  byDayOfWeek: Record<string, { avgDuration: number; count: number }>;
  // 시간대별
  byTimeSlot: Record<string, { avgDuration: number; count: number }>;
}

// 점수 요소
export interface ScoreFactors {
  speed: number;        // 빠르기 (0-100)
  reliability: number;  // 일관성 (0-100)
  comfort: number;      // 편의성 (환승 횟수, 도보 거리 등) (0-100)
}

export class RouteAnalytics {
  readonly id: string;
  readonly routeId: string;
  readonly routeName: string;

  // 전체 통계
  readonly totalTrips: number;
  readonly lastTripDate?: Date;

  // 시간 분석
  readonly duration: {
    average: number;
    min: number;
    max: number;
    stdDev: number;
  };

  // 구간별 분석
  readonly segmentStats: SegmentStats[];

  // 조건별 분석
  readonly conditionAnalysis: ConditionAnalysis;

  // 점수
  readonly score: number;
  readonly scoreFactors: ScoreFactors;

  // 메타
  readonly lastCalculatedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    routeId: string,
    routeName: string,
    options?: {
      id?: string;
      totalTrips?: number;
      lastTripDate?: Date;
      duration?: {
        average: number;
        min: number;
        max: number;
        stdDev: number;
      };
      segmentStats?: SegmentStats[];
      conditionAnalysis?: ConditionAnalysis;
      score?: number;
      scoreFactors?: ScoreFactors;
      lastCalculatedAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    this.id = options?.id || uuidv4();
    this.routeId = routeId;
    this.routeName = routeName;

    this.totalTrips = options?.totalTrips || 0;
    this.lastTripDate = options?.lastTripDate;

    this.duration = options?.duration || {
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
    };

    this.segmentStats = options?.segmentStats || [];

    this.conditionAnalysis = options?.conditionAnalysis || {
      byWeather: {},
      byDayOfWeek: {},
      byTimeSlot: {},
    };

    this.score = options?.score || 0;
    this.scoreFactors = options?.scoreFactors || {
      speed: 0,
      reliability: 0,
      comfort: 0,
    };

    this.lastCalculatedAt = options?.lastCalculatedAt || new Date();
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  // 변동성 레벨 텍스트
  getVariabilityText(): string {
    const stdDevRatio = this.duration.stdDev / this.duration.average;
    if (stdDevRatio < 0.1) return '매우 일관됨';
    if (stdDevRatio < 0.2) return '대체로 일관됨';
    if (stdDevRatio < 0.3) return '변동 있음';
    return '변동이 큼';
  }

  // 추천 여부 (점수 70 이상)
  isRecommended(): boolean {
    return this.score >= 70;
  }

  // 최근 7일 평균과 비교
  getTrend(recentAverage: number): 'improving' | 'stable' | 'worsening' {
    const diff = this.duration.average - recentAverage;
    if (diff > 3) return 'worsening';  // 3분 이상 느려짐
    if (diff < -3) return 'improving'; // 3분 이상 빨라짐
    return 'stable';
  }

  // 요약 문자열
  getSummary(): string {
    if (this.totalTrips === 0) {
      return '측정 데이터가 없습니다';
    }

    const avgMin = Math.round(this.duration.average);
    const variability = this.getVariabilityText();

    return `평균 ${avgMin}분 (${variability}), ${this.totalTrips}회 측정`;
  }

  // 점수 등급
  getGrade(): 'S' | 'A' | 'B' | 'C' | 'D' {
    if (this.score >= 90) return 'S';
    if (this.score >= 80) return 'A';
    if (this.score >= 70) return 'B';
    if (this.score >= 60) return 'C';
    return 'D';
  }

  // 가장 느린 구간
  getSlowestSegment(): SegmentStats | undefined {
    if (this.segmentStats.length === 0) return undefined;
    return this.segmentStats.reduce((slowest, current) =>
      current.averageDuration > slowest.averageDuration ? current : slowest
    );
  }

  // 가장 불안정한 구간
  getMostUnreliableSegment(): SegmentStats | undefined {
    if (this.segmentStats.length === 0) return undefined;
    const variabilityOrder = { 'unpredictable': 3, 'variable': 2, 'stable': 1 };
    return this.segmentStats.reduce((worst, current) =>
      variabilityOrder[current.variability] > variabilityOrder[worst.variability] ? current : worst
    );
  }

  // 비교용 데이터 생성
  toComparisonData() {
    return {
      routeId: this.routeId,
      routeName: this.routeName,
      avgDuration: Math.round(this.duration.average),
      minDuration: this.duration.min,
      maxDuration: this.duration.max,
      reliability: this.scoreFactors.reliability,
      totalScore: this.score,
      grade: this.getGrade(),
      totalTrips: this.totalTrips,
      summary: this.getSummary(),
    };
  }
}

// 경로 비교 결과
export interface RouteComparison {
  routes: RouteAnalytics[];
  winner: {
    fastest: string;      // 가장 빠른 경로 ID
    mostReliable: string; // 가장 일관된 경로 ID
    recommended: string;  // 종합 추천 경로 ID
  };
  analysis: {
    timeDifference: number;       // 최빠른-최느린 차이 (분)
    reliabilityDifference: number; // 신뢰성 점수 차이
  };
}
