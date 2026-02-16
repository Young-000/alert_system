import type { StopwatchRecord } from './types';

interface StopwatchTabProps {
  records: StopwatchRecord[];
}

export function StopwatchTab({ records }: StopwatchTabProps): JSX.Element {
  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-stopwatch" aria-labelledby="tab-stopwatch">
      {/* Stopwatch Stats Summary */}
      <section className="stats-section">
        <h2>스톱워치 기록 요약</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M10 16H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h6"/><path d="M12 12H4"/></svg></span>
            <span className="stat-value">{records.length}회</span>
            <span className="stat-label">총 기록</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <span className="stat-value">
              {Math.round(
                records.reduce((sum, r) => sum + r.totalDurationSeconds, 0) /
                records.length / 60
              )}분
            </span>
            <span className="stat-label">평균 소요 시간</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><span className="route-badge morning" aria-hidden="true">출</span></span>
            <span className="stat-value">
              {records.filter((r) => r.type === 'morning').length}회
            </span>
            <span className="stat-label">출근</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><span className="route-badge evening" aria-hidden="true">퇴</span></span>
            <span className="stat-value">
              {records.filter((r) => r.type === 'evening').length}회
            </span>
            <span className="stat-label">퇴근</span>
          </div>
        </div>
      </section>

      {/* Stopwatch Records List */}
      <section className="history-section">
        <h2>최근 스톱워치 기록</h2>
        <div className="history-list">
          {records.slice(0, 20).map((record) => (
            <div key={record.id} className="history-item">
              <div className="history-header">
                <span className={`history-route ${record.type}`}>
                  {record.type === 'morning' ? '출근' : record.type === 'evening' ? '퇴근' : '이동'}
                </span>
                <span className="history-status completed">완료</span>
              </div>
              <div className="history-details">
                <span className="history-date">
                  {new Date(record.startedAt).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
                <span className="history-time">
                  {new Date(record.startedAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="history-duration">
                  {Math.floor(record.totalDurationSeconds / 60)}분 {record.totalDurationSeconds % 60}초
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="stopwatch-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          스톱워치 기록은 이 기기에만 저장됩니다
        </p>
      </section>
    </div>
  );
}
