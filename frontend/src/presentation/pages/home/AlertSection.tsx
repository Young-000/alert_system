import { Link } from 'react-router-dom';

interface AlertSectionProps {
  nextAlert: { time: string; label: string } | null;
}

export function AlertSection({ nextAlert }: AlertSectionProps): JSX.Element {
  return (
    <section className="home-alert-section" aria-label="알림">
      {nextAlert ? (
        <Link to="/alerts" className="next-alert-bar">
          <span className="next-alert-label">예정된 알림</span>
          <span className="next-alert-time">{nextAlert.time}</span>
          <span className="next-alert-type">{nextAlert.label}</span>
        </Link>
      ) : (
        <Link to="/alerts" className="home-alert-cta">
          <span className="home-alert-cta-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span className="home-alert-cta-text">
            알림을 설정하면 출발 전 날씨와 교통 정보를 알려드려요
          </span>
          <span className="home-alert-cta-arrow" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>
      )}
    </section>
  );
}
