import { Link } from 'react-router-dom';
import type { Alert } from '@infrastructure/api';

interface AlertsTabProps {
  alerts: Alert[];
  onToggleAlert: (alertId: string) => Promise<void>;
  onDeleteAlert: (modal: { type: 'alert'; id: string; name: string }) => void;
  formatScheduleTime: (schedule: string) => string;
}

export function AlertsTab({ alerts, onToggleAlert, onDeleteAlert, formatScheduleTime }: AlertsTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-alerts" aria-labelledby="tab-alerts">
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">내 알림</h2>
          <Link to="/alerts" className="section-action">+ 추가</Link>
        </div>

        {alerts.length === 0 ? (
          <div className="settings-empty-section">
            <span className="empty-icon-svg" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </span>
            <p>설정된 알림이 없어요</p>
            <Link to="/alerts" className="btn btn-primary btn-sm">알림 설정하기</Link>
          </div>
        ) : (
          <div className="settings-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`settings-list-item ${!alert.enabled ? 'disabled' : ''}`}
              >
                <div className="list-item-main">
                  <div className="list-item-content">
                    <div className="alert-item-header">
                      <span className="list-item-title">{alert.name}</span>
                      <span className="alert-time-badge">
                        {formatScheduleTime(alert.schedule)}
                      </span>
                    </div>
                    <div className="alert-type-tags">
                      {alert.alertTypes.map(type => (
                        <span key={type} className={`alert-type-tag ${type}`}>
                          {type === 'weather' ? '날씨' : type === 'airQuality' ? '미세먼지' : type === 'subway' ? '지하철' : type === 'bus' ? '버스' : type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="list-item-actions">
                  <label className="toggle-compact">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={() => onToggleAlert(alert.id)}
                      aria-label={`${alert.name} ${alert.enabled ? '끄기' : '켜기'}`}
                    />
                    <span className="toggle-slider-compact" />
                  </label>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => onDeleteAlert({ type: 'alert', id: alert.id, name: alert.name })}
                    aria-label="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
