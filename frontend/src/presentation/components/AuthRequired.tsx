import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface AuthRequiredProps {
  /** Page title displayed in the PageHeader */
  pageTitle: string;
  /** Icon to show in the empty state area */
  icon: ReactNode;
  /** Description text below "로그인이 필요해요" */
  description: string;
}

export function AuthRequired({
  pageTitle,
  icon,
  description,
}: AuthRequiredProps): JSX.Element {
  return (
    <main className="page">
      <PageHeader title={pageTitle} sticky={false} />
      <div className="auth-required">
        <span className="auth-required-icon" aria-hidden="true">
          {icon}
        </span>
        <h2>로그인이 필요해요</h2>
        <p>{description}</p>
        <Link to="/login" className="btn btn-primary">로그인</Link>
      </div>
    </main>
  );
}
