import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApiClient } from '@infrastructure/api';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        if (mode === 'register') {
          const response = await authApiClient.register({ email, password, name });
          localStorage.setItem('userId', response.user.id);
          localStorage.setItem('accessToken', response.accessToken);
        } else {
          const response = await authApiClient.login({ email, password });
          localStorage.setItem('userId', response.user.id);
          localStorage.setItem('accessToken', response.accessToken);
        }
        navigate('/alerts');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '오류가 발생했습니다.';
        if (mode === 'register') {
          setError(errorMessage.includes('409') ? '이미 등록된 이메일입니다.' : '회원가입에 실패했습니다.');
        } else {
          setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, name, mode, navigate],
  );

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <main className="page">
      <a href="#auth-form" className="skip-link">
        본문으로 건너뛰기
      </a>
      <nav className="nav">
        <div className="brand">
          <strong>Alert System</strong>
          <span>{mode === 'login' ? '로그인' : '회원가입'}</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/">
            홈
          </Link>
        </div>
      </nav>

      <section id="auth-form" className="card auth-card">
        <div className="stack">
          <div>
            <p className="eyebrow">{mode === 'login' ? '다시 오셨군요!' : '처음이신가요?'}</p>
            <h1>{mode === 'login' ? '로그인' : '회원가입'}</h1>
            <p className="muted">
              {mode === 'login'
                ? '이메일과 비밀번호로 로그인하세요.'
                : '계정을 만들어 알림 서비스를 시작하세요.'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="name">이름</label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="password">비밀번호</label>
              <div className="input-group">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? '6자 이상' : '••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  minLength={6}
                  disabled={isLoading}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="input-addon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
              {isLoading ? (
                <>
                  <span className="spinner spinner-sm" aria-hidden="true" />
                  처리 중...
                </>
              ) : (
                mode === 'login' ? '로그인' : '회원가입'
              )}
            </button>
          </form>
          <div className="auth-toggle">
            <span className="muted">
              {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            </span>
            <button type="button" className="btn btn-link" onClick={toggleMode}>
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">
          <span>Alert System</span>
          <span className="footer-divider">·</span>
          <span>출퇴근 알림 서비스</span>
        </p>
        <p className="footer-copyright">© 2025 All rights reserved</p>
      </footer>
    </main>
  );
}
