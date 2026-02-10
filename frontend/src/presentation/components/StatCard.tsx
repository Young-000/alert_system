import type { ReactNode } from 'react';

interface StatCardProps {
  icon?: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

export function StatCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendDirection = 'neutral',
  highlight = false,
}: StatCardProps) {
  return (
    <div className={`stat-card-enhanced ${highlight ? 'highlight' : ''}`}>
      {icon && <span className="stat-card-icon" aria-hidden="true">{icon}</span>}
      <div className="stat-card-content">
        <span className="stat-card-value">{typeof value === 'number' ? value.toLocaleString('ko-KR') : value}</span>
        <span className="stat-card-title">{title}</span>
        {subtitle && <span className="stat-card-subtitle">{subtitle}</span>}
      </div>
      {trend && (
        <span className={`stat-card-trend ${trendDirection}`}>
          {trendDirection === 'up' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '2px' }}>
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          )}
          {trendDirection === 'down' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '2px' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
            </svg>
          )}
          {trend}
        </span>
      )}
    </div>
  );
}
