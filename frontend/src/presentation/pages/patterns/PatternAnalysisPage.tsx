import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { usePredictionQuery, usePatternInsightsQuery } from '@infrastructure/query';
import type {
  PredictionResponse,
  InsightsResponse,
  DaySegment,
  SensitivityLevel,
} from '@infrastructure/api';

type TabId = 'overview' | 'by-day' | 'weather';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'by-day', label: '요일별' },
  { id: 'weather', label: '날씨' },
];

/**
 * 자정 기준 분 → "HH:mm".
 *
 * 반올림은 시·분으로 쪼개기 **전에** 한 번만 한다. 분 자리를 따로 반올림하면
 * 479.8분이 07시 60분이 되어 시계에 없는 시각이 나온다 (요일 평균은 소수다).
 * 백엔드 `minutesToTime`(descriptive-stats.ts)과 같은 계약이다.
 */
function minutesToTimeString(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function TierBadge({ tier }: { tier: string }): JSX.Element {
  const labels: Record<string, string> = {
    cold_start: '데이터 수집 중',
    basic: '기본 분석',
    day_aware: '요일 인식',
    weather_aware: '날씨 인식',
    full: '완전 분석',
  };
  return (
    <span className={`patterns-tier-badge patterns-tier-badge--${tier}`}>
      {labels[tier] ?? tier}
    </span>
  );
}

/**
 * 데이터가 없는 탭의 안내. 못 하는 것을 사과하는 대신 무엇이 쌓이면 보이는지 말하고,
 * 다음 행동을 정확히 하나 둔다 (ux-baseline 원칙 3·7).
 */
function PatternEmptyNotice({ message }: { message: string }): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="patterns-empty-notice">
      <p className="patterns-empty">{message}</p>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => navigate('/commute')}
      >
        출퇴근 기록하기
      </button>
    </div>
  );
}

function OverviewTab({
  prediction,
  insights,
}: {
  prediction: PredictionResponse;
  insights: InsightsResponse;
}): JSX.Element {
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className="patterns-tab-content" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
      <section className="patterns-section" aria-label="요약">
        <h2 className="patterns-section-title">출발 패턴 요약</h2>
        <div className="patterns-summary-grid">
          <div className="patterns-summary-item">
            <span className="patterns-summary-label">평균 출발 시간</span>
            <span className="patterns-summary-value">{insights.summary.averageDeparture}</span>
          </div>
          <div className="patterns-summary-item">
            <span className="patterns-summary-label">신뢰도</span>
            <span className="patterns-summary-value">{confidencePercent}%</span>
          </div>
          <div className="patterns-summary-item">
            <span className="patterns-summary-label">총 기록</span>
            <span className="patterns-summary-value">{insights.summary.totalRecords}회</span>
          </div>
          <div className="patterns-summary-item">
            <span className="patterns-summary-label">편차</span>
            <span className="patterns-summary-value">{insights.summary.overallStdDev}분</span>
          </div>
        </div>
      </section>

      <section className="patterns-section" aria-label="분석 수준">
        <h2 className="patterns-section-title">분석 수준</h2>
        <div className="patterns-tier-info">
          <TierBadge tier={prediction.tier} />
          {prediction.dataStatus.nextTierName && (
            <p className="patterns-tier-next">
              다음 수준: {prediction.dataStatus.nextTierName} ({prediction.dataStatus.nextTierAt}회 기록 필요)
            </p>
          )}
        </div>
      </section>

      {prediction.contributingFactors.length > 0 && (
        <section className="patterns-section" aria-label="영향 요인">
          <h2 className="patterns-section-title">영향 요인</h2>
          <ul className="patterns-factors-list">
            {prediction.contributingFactors.map((factor) => (
              <li key={factor.type} className="patterns-factor-item">
                <div className="patterns-factor-header">
                  <span className="patterns-factor-label">{factor.label}</span>
                  <span className={`patterns-factor-impact ${factor.impact < 0 ? 'patterns-factor-impact--early' : 'patterns-factor-impact--late'}`}>
                    {factor.impact > 0 ? '+' : ''}{factor.impact}분
                  </span>
                </div>
                <p className="patterns-factor-desc">{factor.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ByDayTab({ insights }: { insights: InsightsResponse }): JSX.Element {
  const segments = insights.dayOfWeek.segments;

  const { avgMinutes, maxDev } = useMemo(() => {
    if (segments.length === 0) return { avgMinutes: 0, maxDev: 1 };
    const avg = segments.reduce((s, seg) => s + seg.avgMinutes, 0) / segments.length;
    const dev = Math.max(...segments.map((seg) => Math.abs(seg.avgMinutes - avg)), 1);
    return { avgMinutes: avg, maxDev: dev };
  }, [segments]);

  if (segments.length === 0) {
    return (
      <div className="patterns-tab-content" role="tabpanel" id="panel-by-day" aria-labelledby="tab-by-day">
        <PatternEmptyNotice message="출퇴근을 기록하면 요일마다 출발 시간이 어떻게 다른지 보여드려요." />
      </div>
    );
  }

  return (
    <div className="patterns-tab-content" role="tabpanel" id="panel-by-day" aria-labelledby="tab-by-day">
      <section className="patterns-section" aria-label="요일별 출발 시간">
        <h2 className="patterns-section-title">요일별 출발 시간</h2>
        <div className="patterns-chart" role="img" aria-label="요일별 출발 시간 차트">
          <div className="patterns-chart-bars">
            {segments.map((seg) => (
              <DayBar
                key={seg.dayOfWeek}
                segment={seg}
                avgMinutes={avgMinutes}
                maxDev={maxDev}
              />
            ))}
          </div>
          <div className="patterns-chart-baseline" aria-hidden="true">
            <span className="patterns-chart-avg-label">평균 {minutesToTimeString(avgMinutes)}</span>
          </div>
        </div>
      </section>

      <section className="patterns-section" aria-label="요일 분석">
        <h2 className="patterns-section-title">요일 분석</h2>
        <div className="patterns-day-stats">
          {insights.dayOfWeek.mostConsistentDay && (
            <div className="patterns-day-stat">
              <span className="patterns-day-stat-label">가장 일정한 요일</span>
              <span className="patterns-day-stat-value">
                {insights.dayOfWeek.mostConsistentDay.dayName}요일 (편차 {insights.dayOfWeek.mostConsistentDay.stdDevMinutes}분)
              </span>
            </div>
          )}
          {insights.dayOfWeek.mostVariableDay && (
            <div className="patterns-day-stat">
              <span className="patterns-day-stat-label">가장 불규칙한 요일</span>
              <span className="patterns-day-stat-value">
                {insights.dayOfWeek.mostVariableDay.dayName}요일 (편차 {insights.dayOfWeek.mostVariableDay.stdDevMinutes}분)
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DayBar({
  segment,
  avgMinutes,
  maxDev,
}: {
  segment: DaySegment;
  avgMinutes: number;
  maxDev: number;
}): JSX.Element {
  const deviation = segment.avgMinutes - avgMinutes;
  const barPercent = Math.abs(deviation) / maxDev;
  const barHeight = Math.max(barPercent * 50, 4);
  const isEarly = deviation < 0;
  const isConsistent = segment.stdDevMinutes <= 3;
  const isVariable = segment.stdDevMinutes >= 8;

  let barClass = 'patterns-bar--normal';
  if (isConsistent) barClass = 'patterns-bar--consistent';
  if (isVariable) barClass = 'patterns-bar--variable';

  return (
    <div className="patterns-bar-col" aria-label={`${segment.dayName}요일: ${minutesToTimeString(segment.avgMinutes)}, ${segment.sampleCount}회 기록`}>
      <span className="patterns-bar-time">{minutesToTimeString(segment.avgMinutes)}</span>
      <div className="patterns-bar-container">
        <div
          className={`patterns-bar ${barClass} ${isEarly ? 'patterns-bar--early' : 'patterns-bar--late'}`}
          style={{ height: `${barHeight}px` }}
          aria-hidden="true"
        />
      </div>
      <span className="patterns-bar-day">{segment.dayName}</span>
      <span className="patterns-bar-count">{segment.sampleCount}회</span>
    </div>
  );
}

function SensitivityBadge({ level }: { level: SensitivityLevel }): JSX.Element {
  const labels: Record<SensitivityLevel, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };
  return (
    <span className={`patterns-sensitivity-badge patterns-sensitivity-badge--${level}`}>
      날씨 민감도: {labels[level]}
    </span>
  );
}

function WeatherTab({ insights }: { insights: InsightsResponse }): JSX.Element {
  const weather = insights.weatherSensitivity;

  if (!weather) {
    return (
      <div className="patterns-tab-content" role="tabpanel" id="panel-weather" aria-labelledby="tab-weather">
        <PatternEmptyNotice message="비·눈 오는 날 기록이 모이면 날씨가 출발 시간에 주는 영향을 알려드려요." />
      </div>
    );
  }

  return (
    <div className="patterns-tab-content" role="tabpanel" id="panel-weather" aria-labelledby="tab-weather">
      <section className="patterns-section" aria-label="날씨 민감도">
        <h2 className="patterns-section-title">날씨 민감도</h2>
        <SensitivityBadge level={weather.level} />
      </section>

      <section className="patterns-section" aria-label="날씨 영향">
        <h2 className="patterns-section-title">날씨별 영향</h2>
        <ul className="patterns-weather-list">
          <li className="patterns-weather-item">
            <span className="patterns-weather-label">비</span>
            <span className={`patterns-weather-impact ${weather.rainImpact < 0 ? 'patterns-weather-impact--early' : ''}`}>
              {weather.rainImpact > 0 ? '+' : ''}{weather.rainImpact}분
            </span>
            <span className="patterns-weather-desc">
              {weather.rainImpact < 0 ? '일찍 출발' : weather.rainImpact > 0 ? '늦게 출발' : '영향 없음'}
            </span>
          </li>
          <li className="patterns-weather-item">
            <span className="patterns-weather-label">눈</span>
            <span className={`patterns-weather-impact ${weather.snowImpact < 0 ? 'patterns-weather-impact--early' : ''}`}>
              {weather.snowImpact > 0 ? '+' : ''}{weather.snowImpact}분
            </span>
            <span className="patterns-weather-desc">
              {weather.snowImpact < 0 ? '일찍 출발' : weather.snowImpact > 0 ? '늦게 출발' : '영향 없음'}
            </span>
          </li>
          <li className="patterns-weather-item">
            <span className="patterns-weather-label">기온 (5도당)</span>
            <span className={`patterns-weather-impact ${weather.temperatureImpact < 0 ? 'patterns-weather-impact--early' : ''}`}>
              {weather.temperatureImpact > 0 ? '+' : ''}{weather.temperatureImpact}분
            </span>
            <span className="patterns-weather-desc">
              {weather.temperatureImpact < 0 ? '기온 낮을수록 일찍' : weather.temperatureImpact > 0 ? '기온 높을수록 늦게' : '영향 없음'}
            </span>
          </li>
        </ul>
      </section>

      {weather.comparedToAverage && (
        <section className="patterns-section" aria-label="평균 대비">
          <h2 className="patterns-section-title">전체 평균과 비교</h2>
          <p className="patterns-comparison">{weather.comparedToAverage.description}</p>
        </section>
      )}
    </div>
  );
}

export function PatternAnalysisPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: prediction, isLoading: predLoading, refetch: refetchPrediction } = usePredictionQuery(userId);
  const { data: insights, isLoading: insLoading, refetch: refetchInsights } = usePatternInsightsQuery(userId);

  const isLoading = predLoading || insLoading;

  if (!userId) {
    return (
      <main className="page patterns-page">
        <div className="patterns-auth-required">
          <p>로그인이 필요합니다.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            로그인
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page patterns-page">
      <header className="patterns-header">
        <button
          type="button"
          className="patterns-back"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          &larr;
        </button>
        <h1 className="patterns-title">출발 패턴 분석</h1>
      </header>

      {isLoading && (
        <div className="patterns-loading" role="status" aria-live="polite">
          <div className="skeleton-card patterns-skeleton-card" />
          <div className="skeleton-card patterns-skeleton-card" />
          <span className="sr-only">로딩 중...</span>
        </div>
      )}

      {!isLoading && prediction && insights && (
        <>
          <nav className="patterns-tabs" role="tablist" aria-label="패턴 분석 탭">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                className={`patterns-tab ${activeTab === tab.id ? 'patterns-tab--active' : ''}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <OverviewTab prediction={prediction} insights={insights} />
          )}
          {activeTab === 'by-day' && (
            <ByDayTab insights={insights} />
          )}
          {activeTab === 'weather' && (
            <WeatherTab insights={insights} />
          )}
        </>
      )}

      {!isLoading && (!prediction || !insights) && (
        <div className="patterns-empty-state">
          <p>패턴 데이터를 불러올 수 없습니다.</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { void refetchPrediction(); void refetchInsights(); }}
          >
            다시 시도
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/')}
          >
            홈으로 돌아가기
          </button>
        </div>
      )}
    </main>
  );
}
