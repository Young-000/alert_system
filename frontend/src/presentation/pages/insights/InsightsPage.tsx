import { useState, useCallback } from 'react';
import { useRegions } from '@infrastructure/query/use-insights-query';
import { RegionCard } from './RegionCard';
import { RegionDetailPanel } from './RegionDetailPanel';
import { MyComparisonSection } from './MyComparisonSection';
import type { InsightSortBy } from '@infrastructure/api/commute-api.client';

const SORT_OPTIONS: { value: InsightSortBy; label: string }[] = [
  { value: 'userCount', label: '통근자 수' },
  { value: 'avgDuration', label: '평균 소요시간' },
  { value: 'sessionCount', label: '기록 수' },
  { value: 'regionName', label: '지역명' },
];

export function InsightsPage(): JSX.Element {
  const [sortBy, setSortBy] = useState<InsightSortBy>('userCount');
  const [expandedRegionId, setExpandedRegionId] = useState<string | null>(null);

  const { data, isLoading, error } = useRegions(sortBy);

  const handleToggle = useCallback((regionId: string) => {
    setExpandedRegionId((prev) => (prev === regionId ? null : regionId));
  }, []);

  return (
    <main className="page insights-page">
      <header className="insights-header">
        <h1 className="insights-title">지역별 출퇴근 인사이트</h1>
        <p className="insights-subtitle">
          지역별 출퇴근 패턴과 트렌드를 확인하세요
        </p>
      </header>

      <MyComparisonSection />

      <section className="insights-regions" aria-label="지역별 통계">
        <div className="insights-regions-header">
          <h2 className="insight-section-title">지역 통계</h2>
          <label className="insights-sort" htmlFor="insights-sort-select">
            <span className="sr-only">정렬 기준</span>
            <select
              id="insights-sort-select"
              className="insights-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as InsightSortBy)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading && (
          <div className="insights-loading" role="status" aria-live="polite">
            <div className="skeleton-card insight-skeleton-card" />
            <div className="skeleton-card insight-skeleton-card" />
            <div className="skeleton-card insight-skeleton-card" />
            <span className="sr-only">인사이트 로딩 중...</span>
          </div>
        )}

        {error && (
          <div className="insights-error notice error" role="alert">
            지역 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}

        {!isLoading && !error && data && data.regions.length === 0 && (
          <div className="insights-empty">
            <p className="insights-empty-icon" aria-hidden="true">&#128202;</p>
            <p className="insights-empty-title">아직 지역 데이터가 없어요</p>
            <p className="insights-empty-desc">
              더 많은 사용자가 출퇴근을 기록하면 지역별 인사이트가 표시됩니다
            </p>
          </div>
        )}

        {!isLoading && !error && data && data.regions.length > 0 && (
          <div className="insights-region-list">
            {data.regions.map((region) => {
              const isExpanded = expandedRegionId === region.regionId;
              return (
                <div key={region.regionId} className="insights-region-item">
                  <RegionCard
                    region={region}
                    isExpanded={isExpanded}
                    onToggle={() => handleToggle(region.regionId)}
                  />
                  {isExpanded && (
                    <RegionDetailPanel regionId={region.regionId} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <p className="insights-pagination-hint muted">
            {data.meta.total}개 지역 중 {data.regions.length}개 표시
          </p>
        )}
      </section>
    </main>
  );
}
