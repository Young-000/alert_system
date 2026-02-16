import type { Alert } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';

interface AlertListProps {
  readonly alerts: Alert[];
  readonly savedRoutes: RouteResponse[];
  readonly onToggle: (alert: Alert) => Promise<void>;
  readonly onEdit: (alert: Alert) => void;
  readonly onDelete: (alert: Alert) => void;
}

export function AlertList({
  alerts,
  savedRoutes,
  onToggle,
  onEdit,
  onDelete,
}: AlertListProps): JSX.Element {
  return (
    <section id="existing-alerts-section" className="existing-alerts">
      <div className="section-header-row">
        <h2>설정된 알림</h2>
        <span className="section-count">{alerts.filter(a => a.enabled).length}/{alerts.length} 활성</span>
      </div>
      <div className="alert-list-improved">
        {alerts.map((alert) => {
          const parts = alert.schedule.split(' ');
          const hours = parts.length >= 2
            ? parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`)
            : ['--:--'];
          return (
            <article
              key={alert.id}
              className={`alert-item-card ${alert.enabled ? 'enabled' : 'disabled'}`}
            >
              <div className="alert-item-header">
                <div className="alert-time-badges">
                  {hours.map((time, i) => (
                    <span key={i} className="alert-time-badge">{time}</span>
                  ))}
                </div>
                <span className="alert-name">{alert.name}</span>
              </div>
              <div className="alert-item-body">
                <div className="alert-meta">
                  <div className="alert-type-tags">
                    {alert.alertTypes.map((type) => (
                      <span key={type} className={`alert-type-tag ${type}`}>
                        {type === 'weather' ? '날씨' : type === 'airQuality' ? '미세먼지' : type === 'subway' ? '지하철' : '버스'}
                      </span>
                    ))}
                  </div>
                  {alert.routeId && (() => {
                    const linkedRoute = savedRoutes.find(r => r.id === alert.routeId);
                    if (linkedRoute) {
                      return <span className="alert-route-link-v2">{linkedRoute.name}</span>;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="alert-item-actions">
                <label className="toggle-compact">
                  <input
                    type="checkbox"
                    checked={alert.enabled}
                    onChange={() => onToggle(alert)}
                    aria-label={`${alert.name} ${alert.enabled ? '끄기' : '켜기'}`}
                  />
                  <span className="toggle-slider-compact" />
                </label>
                <button type="button" className="btn-icon" onClick={() => onEdit(alert)} aria-label="수정" title="수정">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button type="button" className="btn-icon danger" onClick={() => onDelete(alert)} aria-label="삭제" title="삭제">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
