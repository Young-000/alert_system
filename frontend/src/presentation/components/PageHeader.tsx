import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Right-side action (button, link, etc.) */
  action?: ReactNode;
  /** If true, header sticks to top on scroll. Default: true */
  sticky?: boolean;
}

export function PageHeader({ title, action, sticky = true }: PageHeaderProps): JSX.Element {
  return (
    <header className={`page-header${sticky ? ' page-header-sticky' : ''}`}>
      <h1>{title}</h1>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
