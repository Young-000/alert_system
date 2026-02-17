import { Link } from 'react-router-dom';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';

interface RoutesTabProps {
  routes: RouteResponse[];
  onDeleteRoute: (route: { type: 'route'; id: string; name: string }) => void;
}

export function RoutesTab({ routes, onDeleteRoute }: RoutesTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-routes" aria-labelledby="tab-routes">
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">내 경로</h2>
          <Link to="/routes" className="section-action">+ 추가</Link>
        </div>

        {routes.length === 0 ? (
          <div className="settings-empty-section">
            <span className="empty-icon-svg" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <p>등록된 경로가 없어요</p>
            <Link to="/routes" className="btn btn-primary btn-sm">경로 추가하기</Link>
          </div>
        ) : (
          <div className="settings-list">
            {routes.map((route) => (
              <div key={route.id} className="settings-list-item">
                <div className="list-item-main">
                  <span className={`route-type-badge ${route.routeType}`}>
                    {route.routeType === 'morning' ? '출근' : '퇴근'}
                  </span>
                  <div className="list-item-content">
                    <span className="list-item-title">{route.name}</span>
                    <span className="list-item-subtitle">
                      {route.checkpoints.map(c => c.name).join(' \u2192 ')}
                    </span>
                  </div>
                </div>
                <div className="list-item-actions">
                  <Link
                    to={`/commute?routeId=${route.id}`}
                    className="btn-icon"
                    title="트래킹 시작"
                    aria-label="트래킹 시작"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </Link>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => onDeleteRoute({ type: 'route', id: route.id, name: route.name })}
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
