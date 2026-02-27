import type { Routine } from './types';

function getTimePeriod(timeStr: string): string {
  const hour = parseInt(timeStr.split(':')[0], 10);
  return isNaN(hour) || hour < 12 ? '오전' : '오후';
}

interface RoutineStepProps {
  readonly wantsWeather: boolean;
  readonly wantsTransport: boolean;
  readonly routine: Routine;
  readonly notificationTimes: { time: string; content: string }[];
  readonly onRoutineChange: (routine: Routine) => void;
}

export function RoutineStep({
  wantsWeather,
  wantsTransport,
  routine,
  notificationTimes,
  onRoutineChange,
}: RoutineStepProps): JSX.Element {
  return (
    <section className="wizard-step">
      <h1>하루 루틴을 알려주세요</h1>
      <p className="muted">알림 시간을 자동으로 설정해드려요</p>

      <div className="routine-form">
        {wantsWeather && (
          <div className="routine-item">
            <div className="routine-header">
              <span className="routine-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <label htmlFor="wake-up-time">기상 시간</label>
            </div>
            <div className="time-picker">
              <input
                id="wake-up-time"
                type="time"
                value={routine.wakeUp}
                onChange={(e) => onRoutineChange({ ...routine, wakeUp: e.target.value })}
                className="time-input"
              />
              <div className="time-display">
                <span className="time-value">{routine.wakeUp}</span>
                <span className="time-period">{getTimePeriod(routine.wakeUp)}</span>
              </div>
            </div>
          </div>
        )}

        {wantsTransport && (
          <>
            <div className="routine-item">
              <div className="routine-header">
                <span className="routine-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </span>
                <label htmlFor="leave-home-time">출근 출발</label>
              </div>
              <div className="time-picker">
                <input
                  id="leave-home-time"
                  type="time"
                  value={routine.leaveHome}
                  onChange={(e) => onRoutineChange({ ...routine, leaveHome: e.target.value })}
                  className="time-input"
                />
                <div className="time-display">
                  <span className="time-value">{routine.leaveHome}</span>
                  <span className="time-period">{getTimePeriod(routine.leaveHome)}</span>
                </div>
              </div>
            </div>

            <div className="routine-item">
              <div className="routine-header">
                <span className="routine-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                <label htmlFor="leave-work-time">퇴근 출발</label>
              </div>
              <div className="time-picker">
                <input
                  id="leave-work-time"
                  type="time"
                  value={routine.leaveWork}
                  onChange={(e) => onRoutineChange({ ...routine, leaveWork: e.target.value })}
                  className="time-input"
                />
                <div className="time-display">
                  <span className="time-value">{routine.leaveWork}</span>
                  <span className="time-period">{getTimePeriod(routine.leaveWork)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 알림 미리보기 */}
      <div className="alert-preview-card">
        <div className="preview-header">
          <span className="preview-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <h3>알림 미리보기</h3>
        </div>
        <div className="preview-list">
          {notificationTimes.map((item) => (
            <div key={`${item.time}-${item.content}`} className="preview-item">
              <span className="preview-time">{item.time}</span>
              <span className="preview-content">{item.content}</span>
            </div>
          ))}
        </div>
        <p className="preview-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          교통 알림은 출발 15분 전에 발송됩니다
        </p>
      </div>
    </section>
  );
}
