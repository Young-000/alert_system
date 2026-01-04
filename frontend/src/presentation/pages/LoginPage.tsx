import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApiClient } from '@infrastructure/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        const user = await userApiClient.createUser({ email, name });
        localStorage.setItem('userId', user.id);
        navigate('/alerts');
      } catch {
        setError('계정 생성에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, name, navigate],
  );

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <strong>Alert System</strong>
          <span>Get started</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/">
            홈
          </Link>
        </div>
      </nav>

      <section className="card auth-card">
        <div className="stack">
          <div>
            <p className="eyebrow">계정 만들기</p>
            <h1>시작하기</h1>
            <p className="muted">
              이메일과 이름만 입력하면 알림 설정으로 이동합니다.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '계정 만들기'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
