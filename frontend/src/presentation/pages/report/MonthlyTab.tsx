import { useAuth } from '@presentation/hooks/useAuth';
import { useCommuteMonthlyStatsQuery } from '@infrastructure/query/use-report-query';
import { getQueryErrorMessage } from '@infrastructure/query/error-utils';
import type { DayOfWeekStats, WeatherImpact } from '@infrastructure/api/commute-api.client';

function MonthlyTabSkeleton(): JSX.Element {
  return (
    <div className="report-tab-content" aria-label="월간 통계 로딩 중" role="status">
      <div className="report-card">
        <div className="skeleton" style={{ width: 140, height: 20 }} />
        <div className="skeleton" style={{ width: '100%', height: 14, marginTop: 12 }} />
        <div className="skeleton" style={{ width: '60%', height: 14, marginTop: 8 }} />
      </div>
      <div className="report-card">
        <div className="skeleton" style={{ width: 120, height: 18 }} />
        <div className="skeleton" style={{ width: '100%', height: 100, marginTop: 12 }} />
      </div>
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

function getDayLabel(dayOfWeek: number): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  return labels[dayOfWeek] ?? String(dayOfWeek);
}

function getWeatherLabel(condition: string): string {
  const labels: Record<string, string> = {
    Clear: '맑음',
    Clouds: '흐림',
    Rain: '비',
    Snow: '눈',
    Drizzle: '이슬비',
    Mist: '안개',
    Fog: '안개',
  };
  return labels[condition] ?? condition;
}

function DayOfWeekChart({ stats }: { stats: DayOfWeekStats[] }): JSX.Element {
  if (stats.length === 0) {
    return <p className="report-empty-hint">요일별 데이터가 없어요</p>;
  }

  const maxDuration = Math.max(...stats.map(s => s.averageDuration), 1);

  return (
    <div className="report-dow-chart" role="img" aria-label="요일별 평균 소요시간">
      {stats.map((day) => {
        const heightPercent = Math.round((day.averageDuration / maxDuration) * 100);
        const hasData = day.sampleCount > 0;

        return (
          <div
            key={day.dayOfWeek}
            className="report-dow-bar"
            aria-label={
              hasData
                ? `${day.dayName} 평균 ${day.averageDuration}분`
                : `${day.dayName} 기록 없음`
            }
          >
            <div className="report-dow-bar-track">
              <div
                className={`report-dow-bar-fill ${hasData ? '' : 'report-dow-bar-fill--empty'}`}
                style={{ height: hasData ? `${heightPercent}%` : '4px' }}
              />
            </div>
            <span className="report-dow-bar-label">{getDayLabel(day.dayOfWeek)}</span>
            {hasData && (
              <span className="report-dow-bar-value">{day.averageDuration}분</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 날씨 비교의 기준은 **서버가 정한다** — 맑은 날 평균이고, 그 차이가 `comparedToNormal`이다
 * (`get-commute-stats.use-case.ts:295-317`). 같은 값을 쓰는 화면이 이미 있다
 * (`commute-dashboard/OverviewTab.tsx:60-63`).
 *
 * 화면에서 기준을 다시 계산하면 안 된다. 조건별 평균을 표본 수 없이 평균내면
 * 드문 악천후 하루가 기준을 끌어올려 **흔한 날씨가 "기준보다 빠르다"로 뒤집힌다** —
 * 맑음 40분(50회)·비 45분(2회)·눈 70분(1회)이면 기준이 51.7분이 되어 비가 -7분이 된다.
 * 서버는 이 역전을 이미 한 번 고쳤는데(같은 파일 283-285행 주석) 화면이 되살리고 있었다.
 * 바로 옆 인사이트 문장("비 오는 날 평균 5분 더 걸려요")과도 반대 방향을 가리켰다.
 */
function WeatherImpactSection({ impacts }: { impacts: WeatherImpact[] }): JSX.Element {
  if (impacts.length === 0) {
    return <p className="report-empty-hint">날씨별 데이터가 없어요</p>;
  }

  return (
    <div className="report-weather-impacts" aria-label="날씨별 영향">
      <p className="report-empty-hint">맑은 날과 비교한 차이예요</p>
      {impacts.map((impact) => {
        const diff = impact.comparedToNormal;
        const diffText = diff > 0 ? `+${diff}분` : `${diff}분`;
        const isWorse = diff > 2;
        const isBetter = diff < -2;

        return (
          <div key={impact.condition} className="report-weather-card">
            <span className="report-weather-label">{getWeatherLabel(impact.condition)}</span>
            <span className="report-weather-duration">{impact.averageDuration}분</span>
            <span
              className={`report-weather-diff ${
                isWorse ? 'report-weather-diff--worse' : ''
              } ${isBetter ? 'report-weather-diff--better' : ''}`}
            >
              {diff !== 0 ? diffText : '-'}
            </span>
            <span className="report-weather-count">{impact.sampleCount}회</span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyTab(): JSX.Element {
  const { userId } = useAuth();
  const { data: stats, isLoading, error, refetch } = useCommuteMonthlyStatsQuery(userId);

  if (isLoading) return <MonthlyTabSkeleton />;

  if (error) {
    const errorMsg = getQueryErrorMessage(error, '월간 통계를 불러올 수 없습니다.');
    return (
      <div className="report-tab-content">
        <div className="report-card report-card--empty" role="alert">
          <p className="report-empty-msg">{errorMsg}</p>
          <button type="button" className="report-retry-btn" onClick={() => refetch()}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="report-tab-content">
        <div className="report-card report-card--empty">
          <p className="report-empty-icon" aria-hidden="true">&#128197;</p>
          <p className="report-empty-msg">최근 30일 기록이 없어요</p>
          <p className="report-empty-hint">출퇴근을 기록하면 월간 통계를 볼 수 있어요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-tab-content" aria-label="월간 통계">
      {/* Summary */}
      <div className="report-card">
        <div className="report-summary-row">
          <div className="report-stat-block">
            <span className="report-stat-value">{stats.totalSessions}회</span>
            <span className="report-stat-label">총 세션</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{stats.overallAverageDuration}분</span>
            <span className="report-stat-label">평균 소요시간</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{stats.overallAverageDelay}분</span>
            <span className="report-stat-label">평균 지연</span>
          </div>
        </div>
      </div>

      {/* Day of Week Heatmap */}
      <div className="report-card">
        <h3 className="report-section-title">요일별 평균 소요시간</h3>
        <DayOfWeekChart stats={stats.dayOfWeekStats} />
      </div>

      {/* Weather Impact */}
      <div className="report-card">
        <h3 className="report-section-title">날씨별 영향</h3>
        <WeatherImpactSection impacts={stats.weatherImpact} />
      </div>

      {/* Insights */}
      {stats.insights.length > 0 && (
        <div className="report-card">
          <h3 className="report-section-title">인사이트</h3>
          <ul className="report-insights" aria-label="월간 인사이트">
            {stats.insights.map((insight) => (
              <li key={insight} className="report-insight">{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
