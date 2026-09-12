import type { NotificationStatsDto } from '@infrastructure/api';

interface NotificationStatsProps {
  readonly stats: NotificationStatsDto | null;
  readonly isLoading: boolean;
  /**
   * 통계 조회 실패 사유. 빈 문자열 = 실패 없음.
   *
   * 이 카드는 데이터가 없으면 **아무것도 렌더링하지 않는다**(아래 `total === 0` 분기).
   * 그래서 조회 실패를 여기로 넘기지 않으면 실패한 화면과 "발송된 알림이 0건인 화면"이
   * 완전히 같아진다 — 사용자는 통계가 사라진 줄도 모른다.
   */
  readonly error: string;
  /** 실패 자리에서 바로 다시 부를 수단. 없으면 이 카드는 막다른 길이 된다. */
  readonly onRetry: () => void;
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

export function NotificationStats({ stats, isLoading, error, onRetry }: NotificationStatsProps): JSX.Element | null {
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

  // 로딩이 실패보다 먼저다 — 재시도가 도는 중에 지난 실패 문구를 남겨두면
  // 화면이 이미 끝난 일을 말하게 된다.
  if (error) {
    return (
      <section
        className="notif-stats-card notif-stats-card--error"
        role="status"
        aria-label="알림 발송 통계"
        data-testid="notif-stats-error"
      >
        <span className="notif-stats-error-text">{error}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm notif-stats-retry"
          onClick={onRetry}
          aria-label="발송 통계 다시 불러오기"
        >
          다시 시도
        </button>
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
