import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { notificationApiClient } from '@infrastructure/api';
import type { NotificationLog } from '@infrastructure/api';

const ALERT_TYPE_LABELS: Record<string, string> = {
  weather: '날씨',
  airQuality: '미세먼지',
  subway: '지하철',
  bus: '버스',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  success: { label: '발송 완료', className: 'status-success' },
  fallback: { label: '대체 발송', className: 'status-warning' },
  failed: { label: '발송 실패', className: 'status-error' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;

  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function NotificationHistoryPage(): JSX.Element {
  const userId = localStorage.getItem('userId') || '';
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (offset = 0) => {
    if (!userId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await notificationApiClient.getHistory(20, offset);
      if (offset === 0) {
        setLogs(res.items);
      } else {
        setLogs(prev => [...prev, ...res.items]);
      }
      setTotal(res.total);
    } catch {
      setError('알림 기록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (!userId) {
    return (
      <main className="page notification-history-page">
        <header className="settings-page-v2-header">
          <h1>알림 기록</h1>
        </header>
        <div className="settings-empty">
          <span className="empty-icon-svg" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <h2>로그인이 필요해요</h2>
          <p>알림 기록을 보려면 로그인하세요</p>
          <Link to="/login" className="btn btn-primary" aria-label="로그인 페이지로 이동">로그인</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page notification-history-page">
      <header className="settings-page-v2-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>알림 기록</h1>
        {total > 0 && <span className="nav-badge">{total}건</span>}
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!isLoading && logs.length === 0 && (
        <div className="settings-empty">
          <span className="empty-icon-svg" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </span>
          <h2>알림 기록이 없어요</h2>
          <p>알림이 발송되면 여기에 기록됩니다</p>
          <Link to="/alerts" className="btn btn-primary btn-sm" aria-label="알림 설정 페이지로 이동">알림 설정하기</Link>
        </div>
      )}

      <div className="notif-history-list">
        {logs.map((log) => {
          const statusInfo = STATUS_LABELS[log.status] || STATUS_LABELS.success;
          return (
            <div key={log.id} className="notif-history-item">
              <div className="notif-history-header">
                <span className="notif-history-name">{log.alertName || '알림'}</span>
                <span className={`notif-history-status ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="notif-history-types">
                {log.alertTypes.map((type) => (
                  <span key={type} className="notif-type-badge">
                    {ALERT_TYPE_LABELS[type] || type}
                  </span>
                ))}
              </div>
              {log.summary && (
                <p className="notif-history-summary">{log.summary}</p>
              )}
              <div className="notif-history-time">
                <span>{formatDate(log.sentAt)}</span>
                <span className="muted">{formatTime(log.sentAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {logs.length < total && (
        <button
          type="button"
          className="btn btn-ghost notif-load-more"
          onClick={() => loadHistory(logs.length)}
          disabled={isLoading}
          aria-label="알림 기록 더 보기"
        >
          {isLoading ? '불러오는 중...' : '더 보기'}
        </button>
      )}

      {isLoading && logs.length === 0 && (
        <div className="settings-loading">
          <span className="spinner" />
          <p>불러오는 중...</p>
        </div>
      )}
    </main>
  );
}
