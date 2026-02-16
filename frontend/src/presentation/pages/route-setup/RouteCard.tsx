import { useNavigate } from 'react-router-dom';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';

interface RouteCardProps {
  route: RouteResponse;
  alertCount: number;
  onEdit: (route: RouteResponse) => void;
  onDelete: (route: RouteResponse) => void;
}

export function RouteCard({
  route,
  alertCount,
  onEdit,
  onDelete,
}: RouteCardProps): JSX.Element {
  const navigate = useNavigate();
  const isMorning = route.routeType === 'morning';

  return (
    <div className="route-card-v2" data-route-type={route.routeType}>
      <button
        type="button"
        className="route-card-v2-body"
        onClick={() => onEdit(route)}
        aria-label={`${route.name} 수정하기`}
      >
        <div className="route-card-v2-top">
          <span className={`route-type-badge ${isMorning ? 'morning' : 'evening'}`}>
            {isMorning ? '출근' : '퇴근'}
          </span>
          {route.isPreferred && (
            <span className="route-preferred-badge">기본</span>
          )}
          {alertCount > 0 && (
            <span className="route-alert-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              </svg>
              {alertCount}
            </span>
          )}
        </div>
        <strong className="route-card-v2-name">{route.name}</strong>
        <span className="route-card-v2-path">{route.checkpoints.map(c => c.name).join(' → ')}</span>
        <span className="route-card-v2-meta">
          {(route.totalExpectedDuration ?? 0) > 0 ? `예상 ${route.totalExpectedDuration}분` : ''}
        </span>
      </button>
      <div className="route-card-v2-actions">
        <button
          type="button"
          className="route-card-v2-action"
          onClick={() => navigate('/commute', { state: { routeId: route.id } })}
          aria-label="출발하기"
          title="출발하기"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        <button type="button" className="route-card-v2-action" onClick={() => onEdit(route)} aria-label="수정" title="수정">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button type="button" className="route-card-v2-action danger" onClick={() => onDelete(route)} aria-label="삭제" title="삭제">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
