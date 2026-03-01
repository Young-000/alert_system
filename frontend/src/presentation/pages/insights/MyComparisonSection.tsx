import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useMyComparison } from '@infrastructure/query/use-insights-query';

export function MyComparisonSection(): JSX.Element {
  const { isLoggedIn } = useAuth();
  const { data, isLoading, error } = useMyComparison(isLoggedIn);

  if (!isLoggedIn) {
    return (
      <section className="insight-comparison" aria-label="나의 출퇴근 비교">
        <h3 className="insight-section-title">나의 출퇴근 vs 지역 평균</h3>
        <div className="insight-comparison-empty">
          <p className="insight-comparison-empty-text">
            로그인하면 지역 평균과 나의 출퇴근을 비교할 수 있어요
          </p>
          <Link to="/login" className="btn btn-primary btn-sm">
            로그인
          </Link>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="insight-comparison" aria-label="나의 출퇴근 비교">
        <h3 className="insight-section-title">나의 출퇴근 vs 지역 평균</h3>
        <div className="insight-comparison-skeleton">
          <div className="skeleton insight-skeleton-bar" />
          <div className="skeleton insight-skeleton-bar" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="insight-comparison" aria-label="나의 출퇴근 비교">
        <h3 className="insight-section-title">나의 출퇴근 vs 지역 평균</h3>
        <p className="insight-comparison-error" role="alert">
          비교 데이터를 불러올 수 없습니다
        </p>
      </section>
    );
  }

  if (!data || data.regionId === null) {
    return (
      <section className="insight-comparison" aria-label="나의 출퇴근 비교">
        <h3 className="insight-section-title">나의 출퇴근 vs 지역 평균</h3>
        <div className="insight-comparison-empty">
          <p className="insight-comparison-empty-text">
            출퇴근을 기록하면 지역 평균과 비교할 수 있어요
          </p>
          <Link to="/routes" className="btn btn-primary btn-sm">
            경로 설정하기
          </Link>
        </div>
      </section>
    );
  }

  const isFaster = data.fasterThanRegion;
  const diffClass = isFaster ? 'insight-diff--faster' : 'insight-diff--slower';
  const diffLabel = isFaster
    ? `${Math.abs(data.diffMinutes).toFixed(0)}분 빠름`
    : `${Math.abs(data.diffMinutes).toFixed(0)}분 느림`;

  return (
    <section className="insight-comparison" aria-label="나의 출퇴근 비교">
      <h3 className="insight-section-title">나의 출퇴근 vs 지역 평균</h3>
      <p className="insight-comparison-region">{data.regionName}</p>

      <div className="insight-comparison-bars">
        <div className="insight-comparison-bar-group">
          <div className="insight-comparison-bar-label">
            <span>나의 평균</span>
            <span className="insight-comparison-bar-value">
              {Math.round(data.userAvgDurationMinutes)}분
            </span>
          </div>
          <div className="insight-comparison-bar-track">
            <div
              className="insight-comparison-bar-fill insight-comparison-bar-fill--user"
              style={{
                width: `${Math.min((data.userAvgDurationMinutes / Math.max(data.userAvgDurationMinutes, data.regionAvgDurationMinutes)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="insight-comparison-bar-group">
          <div className="insight-comparison-bar-label">
            <span>지역 평균</span>
            <span className="insight-comparison-bar-value">
              {Math.round(data.regionAvgDurationMinutes)}분
            </span>
          </div>
          <div className="insight-comparison-bar-track">
            <div
              className="insight-comparison-bar-fill insight-comparison-bar-fill--region"
              style={{
                width: `${Math.min((data.regionAvgDurationMinutes / Math.max(data.userAvgDurationMinutes, data.regionAvgDurationMinutes)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className={`insight-comparison-result ${diffClass}`}>
        <span className="insight-comparison-diff-value">{diffLabel}</span>
        <span className="insight-comparison-diff-percent">
          ({Math.abs(data.diffPercent).toFixed(1)}%)
        </span>
      </div>

      <p className="insight-comparison-meta">
        {data.userSessionCount}회 기록 기준 &middot; {data.regionUserCount}명 통근자 지역
      </p>
    </section>
  );
}
