import type { CommuteHistoryResponse } from '@infrastructure/api/commute-api.client';
import { EmptyState } from '../../components/EmptyState';
import { LoadMoreButton } from './LoadMoreButton';

interface HistoryTabProps {
  history: CommuteHistoryResponse;
  onLoadMore: () => Promise<void>;
}

export function HistoryTab({ history, onLoadMore }: HistoryTabProps): JSX.Element {
  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
      <section className="history-section">
        <h2>최근 기록</h2>

        {history.sessions.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
            title="기록이 없어요"
            description="트래킹을 시작하면 이동 기록이 여기에 표시됩니다."
          />
        ) : (
          <div className="history-list-enhanced">
            {history.sessions.map((session) => {
              const startTime = new Date(session.startedAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endTime = session.completedAt
                ? new Date(session.completedAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;
              const routeType = (session.routeName || '').includes('출근') ? 'morning' : 'evening';

              return (
                <div key={session.id} className="history-card">
                  <div className="history-card-header">
                    <div className="history-date-badge">
                      {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </div>
                    <span className={`history-route-type-badge ${routeType}`}>
                      {routeType === 'morning' ? '출근' : '퇴근'}
                    </span>
                  </div>
                  <div className="history-card-body">
                    <div className="history-route-name">
                      {session.routeName || '경로'}
                    </div>
                    <div className="history-time-flow">
                      <span className="history-start-time">{startTime} 출발</span>
                      <span className="history-time-arrow">→</span>
                      {endTime && (
                        <span className="history-end-time">{endTime} 도착</span>
                      )}
                      {session.totalDurationMinutes != null && session.totalDurationMinutes > 0 && (
                        <span className="history-duration-badge">({session.totalDurationMinutes}분)</span>
                      )}
                    </div>
                  </div>
                  <div className="history-card-footer">
                    <span className={`history-status-badge ${session.status}`}>
                      {session.status === 'completed' ? '완료' : session.status === 'cancelled' ? '취소' : '진행중'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {history.hasMore && (
          <LoadMoreButton onLoad={onLoadMore} />
        )}
      </section>
    </div>
  );
}
