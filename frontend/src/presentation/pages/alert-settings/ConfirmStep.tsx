import type { Alert } from '@infrastructure/api';
import type { TransportItem } from './types';

interface ConfirmStepProps {
  readonly wantsWeather: boolean;
  readonly selectedTransports: TransportItem[];
  readonly notificationTimes: { time: string; content: string }[];
  readonly error: string;
  readonly success: string;
  readonly duplicateAlert: Alert | null;
  readonly onEditDuplicate: () => void;
  readonly onChangeTime: () => void;
}

export function ConfirmStep({
  wantsWeather,
  selectedTransports,
  notificationTimes,
  error,
  success,
  duplicateAlert,
  onEditDuplicate,
  onChangeTime,
}: ConfirmStepProps): JSX.Element {
  return (
    <section className="wizard-step">
      <h1>설정을 확인해주세요</h1>

      <div className="confirm-card">
        <div className="confirm-section">
          <h3>알림 내용</h3>
          <div className="confirm-items">
            {wantsWeather && <span className="confirm-tag">날씨</span>}
            {wantsWeather && <span className="confirm-tag">미세먼지</span>}
            {selectedTransports.map((t) => (
              <span key={`${t.type}-${t.id}`} className="confirm-tag">
                {t.type === 'subway' ? '지하철' : '버스'} {t.name}
              </span>
            ))}
          </div>
        </div>

        <div className="confirm-section">
          <h3>알림 시간</h3>
          {notificationTimes.map((item) => (
            <div key={`${item.time}-${item.content}`} className="confirm-time">
              <strong>{item.time}</strong>
              <span>{item.content}</span>
            </div>
          ))}
        </div>

        <div className="confirm-section">
          <h3>알림 방법</h3>
          <div className="delivery-methods">
            <div className="delivery-method">
              <span className="delivery-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>카카오 알림톡</span>
              <span className="badge badge-primary">기본</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            회원가입 시 등록한 전화번호로 알림톡이 발송됩니다
          </p>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error && duplicateAlert ? (
          <div className="duplicate-alert-warning" role="alert">
            <p className="warning-message">{error}</p>
            <p className="warning-suggestion">시간을 변경하거나 기존 알림을 수정해주세요.</p>
            <div className="duplicate-alert-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onEditDuplicate}
              >
                기존 알림 수정하기
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onChangeTime}
              >
                시간 변경하기
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="notice error" role="alert">{error}</div>
        ) : null}
        {success && <div className="notice success" role="status">{success}</div>}
      </div>
    </section>
  );
}
