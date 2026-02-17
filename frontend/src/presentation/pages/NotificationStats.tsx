import type { NotificationStatsDto } from '@infrastructure/api';

interface NotificationStatsProps {
  readonly stats: NotificationStatsDto | null;
  readonly isLoading: boolean;
}

function getSuccessRateColor(rate: number): string {
  if (rate > 90) return 'notif-stats-rate--green';
  if (rate > 70) return 'notif-stats-rate--yellow';
  return 'notif-stats-rate--red';
}

function getBarWidthPercent(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export function NotificationStats({ stats, isLoading }: NotificationStatsProps): JSX.Element | null {
  if (isLoading) {
    return (
      <section className="notif-stats-card" aria-label="알림 발송 통계 로딩 중" data-testid="notif-stats-skeleton">
        <div className="notif-stats-row">
          <div className="notif-stats-item">
            <span className="skeleton skeleton-text notif-stats-skeleton-label" />
            <span className="skeleton skeleton-text notif-stats-skeleton-value" />
          </div>
          <div className="notif-stats-item">
            <span className="skeleton skeleton-text notif-stats-skeleton-label" />
            <span className="skeleton skeleton-text notif-stats-skeleton-value" />
          </div>
          <div className="notif-stats-item">
            <span className="skeleton skeleton-text notif-stats-skeleton-label" />
            <span className="skeleton skeleton-text notif-stats-skeleton-value" />
          </div>
        </div>
        <div className="skeleton skeleton-text notif-stats-skeleton-bar" />
      </section>
    );
  }

  if (!stats || stats.total === 0) return null;

  const rateColorClass = getSuccessRateColor(stats.successRate);

  return (
    <section className="notif-stats-card" aria-label="알림 발송 통계" data-testid="notif-stats">
      <div className="notif-stats-row">
        <div className="notif-stats-item">
          <span className="notif-stats-label">전체</span>
          <span className="notif-stats-value">{stats.total}건</span>
        </div>
        <div className="notif-stats-item">
          <span className="notif-stats-label">성공률</span>
          <span className={`notif-stats-value notif-stats-rate ${rateColorClass}`}>
            {stats.successRate}%
          </span>
        </div>
        <div className="notif-stats-item">
          <span className="notif-stats-label">실패</span>
          <span className={`notif-stats-value${stats.failed > 0 ? ' notif-stats-rate--red' : ''}`}>
            {stats.failed}건
          </span>
        </div>
      </div>

      <div
        className="notif-stats-bar"
        role="img"
        aria-label={`발송 상태: 성공 ${stats.success}건, 대체 ${stats.fallback}건, 실패 ${stats.failed}건`}
      >
        {stats.success > 0 && (
          <div
            className="notif-stats-bar-segment notif-stats-bar--success"
            style={{ width: getBarWidthPercent(stats.success, stats.total) }}
          />
        )}
        {stats.fallback > 0 && (
          <div
            className="notif-stats-bar-segment notif-stats-bar--fallback"
            style={{ width: getBarWidthPercent(stats.fallback, stats.total) }}
          />
        )}
        {stats.failed > 0 && (
          <div
            className="notif-stats-bar-segment notif-stats-bar--failed"
            style={{ width: getBarWidthPercent(stats.failed, stats.total) }}
          />
        )}
      </div>
      <div className="notif-stats-legend" aria-hidden="true">
        {stats.success > 0 && (
          <span className="notif-stats-legend-item">
            <span className="notif-stats-legend-dot notif-stats-bar--success" />
            성공 {stats.success}
          </span>
        )}
        {stats.fallback > 0 && (
          <span className="notif-stats-legend-item">
            <span className="notif-stats-legend-dot notif-stats-bar--fallback" />
            대체 {stats.fallback}
          </span>
        )}
        {stats.failed > 0 && (
          <span className="notif-stats-legend-item">
            <span className="notif-stats-legend-dot notif-stats-bar--failed" />
            실패 {stats.failed}
          </span>
        )}
      </div>
    </section>
  );
}
