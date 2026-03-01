import { useAuth } from '@presentation/hooks/useAuth';
import { useAnalyticsSummaryQuery } from '@infrastructure/query/use-report-query';
import { getQueryErrorMessage } from '@infrastructure/query/error-utils';
import type { RouteAnalyticsResponse } from '@infrastructure/api/commute-api.client';

function SummaryTabSkeleton(): JSX.Element {
  return (
    <div className="report-tab-content" aria-label="분석 요약 로딩 중" role="status">
      <div className="report-card">
        <div className="skeleton" style={{ width: 140, height: 20 }} />
        <div className="skeleton" style={{ width: '100%', height: 14, marginTop: 12 }} />
      </div>
      <div className="report-card">
        <div className="skeleton" style={{ width: 120, height: 18 }} />
        <div className="skeleton" style={{ width: '80%', height: 60, marginTop: 12 }} />
      </div>
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    S: 'var(--success, #10b981)',
    A: 'var(--primary, #6366f1)',
    B: 'var(--info, #3b82f6)',
    C: 'var(--warning, #f59e0b)',
    D: 'var(--error, #ef4444)',
  };
  return colors[grade] ?? 'var(--ink-secondary)';
}

function RouteCard({
  route,
  label,
}: {
  route: RouteAnalyticsResponse;
  label: string;
}): JSX.Element {
  return (
    <div className="report-route-card" aria-label={`${label}: ${route.routeName}`}>
      <div className="report-route-card-header">
        <span className="report-route-card-label">{label}</span>
        <span
          className="report-route-grade"
          style={{ color: getGradeColor(route.grade) }}
          aria-label={`등급 ${route.grade}`}
        >
          {route.grade}
        </span>
      </div>
      <h4 className="report-route-card-name">{route.routeName}</h4>
      <div className="report-route-card-stats">
        <span className="report-route-card-stat">
          점수 <strong>{route.score}점</strong>
        </span>
        <span className="report-route-card-stat">
          {route.totalTrips}회 사용
        </span>
        <span className="report-route-card-stat">
          평균 {route.duration.average}분
        </span>
      </div>
      {route.summary && (
        <p className="report-route-card-summary">{route.summary}</p>
      )}
    </div>
  );
}

export function SummaryTab(): JSX.Element {
  const { userId } = useAuth();
  const { data: summary, isLoading, error, refetch } = useAnalyticsSummaryQuery(userId);

  if (isLoading) return <SummaryTabSkeleton />;

  if (error) {
    const errorMsg = getQueryErrorMessage(error, '분석 요약을 불러올 수 없습니다.');
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

  if (!summary || summary.totalTrips === 0) {
    return (
      <div className="report-tab-content">
        <div className="report-card report-card--empty">
          <p className="report-empty-icon" aria-hidden="true">&#128200;</p>
          <p className="report-empty-msg">분석 데이터가 아직 없어요</p>
          <p className="report-empty-hint">출퇴근 기록이 쌓이면 경로 분석을 볼 수 있어요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-tab-content" aria-label="분석 요약">
      {/* Overview */}
      <div className="report-card">
        <div className="report-summary-row">
          <div className="report-stat-block">
            <span className="report-stat-value">{summary.totalRoutes}개</span>
            <span className="report-stat-label">총 경로</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{summary.totalTrips}회</span>
            <span className="report-stat-label">총 통근</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{summary.averageScore}점</span>
            <span className="report-stat-label">평균 점수</span>
          </div>
        </div>
      </div>

      {/* Best Route */}
      {summary.bestRoute && (
        <div className="report-card">
          <h3 className="report-section-title">베스트 경로</h3>
          <RouteCard route={summary.bestRoute} label="최고 점수" />
        </div>
      )}

      {/* Most Used Route */}
      {summary.mostUsedRoute && summary.mostUsedRoute.routeId !== summary.bestRoute?.routeId && (
        <div className="report-card">
          <h3 className="report-section-title">가장 많이 사용한 경로</h3>
          <RouteCard route={summary.mostUsedRoute} label="최다 사용" />
        </div>
      )}

      {/* Insights */}
      {summary.insights.length > 0 && (
        <div className="report-card">
          <h3 className="report-section-title">분석 인사이트</h3>
          <ul className="report-insights" aria-label="분석 인사이트">
            {summary.insights.map((insight) => (
              <li key={insight} className="report-insight">{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
