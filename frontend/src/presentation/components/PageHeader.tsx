import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = '뒤로',
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-left">
        {backTo && (
          <Link to={backTo} className="page-header-back" aria-label={backLabel}>
            ← {backLabel}
          </Link>
        )}
        <div className="page-header-title-group">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
