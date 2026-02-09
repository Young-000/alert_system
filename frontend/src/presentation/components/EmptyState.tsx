import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  actionLink?: string;
  actionText?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLink,
  actionText,
}: EmptyStateProps) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action}
      {actionLink && actionText && (
        <Link to={actionLink} className="btn btn-primary">
          {actionText}
        </Link>
      )}
    </div>
  );
}
