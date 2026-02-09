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
          {trendDirection === 'up' && '↑'}
          {trendDirection === 'down' && '↓'}
          {trend}
        </span>
      )}
    </div>
  );
}
