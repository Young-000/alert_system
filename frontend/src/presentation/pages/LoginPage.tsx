import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApiClient } from '@infrastructure/api';

type AuthMode = 'login' | 'register';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);
  const [serverStatus, setServerStatus] = useState<'warming' | 'ready' | 'error'>('warming');
  const navigate = useNavigate();

  // 서버 예열 (Cold Start 대응)
  useEffect(() => {
    let isMounted = true;

    const warmUpServer = async () => {
      const startTime = Date.now();
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(45000), // 45초 타임아웃
        });
        if (!isMounted) return;
        if (response.ok) {
          setServerStatus('ready');
          const elapsed = Date.now() - startTime;
          if (elapsed > 5000) {
            console.log(`Server warmed up in ${(elapsed / 1000).toFixed(1)}s`);
          }
        }
      } catch {
        // 실패해도 사용자가 시도할 수 있도록 ready로 설정
        if (isMounted) {
          setServerStatus('ready');
        }
      }
    };
    warmUpServer();

    return () => {
      isMounted = false;
    };
  }, []);

  // Google OAuth 상태 확인
  useEffect(() => {
    if (serverStatus !== 'ready') return;

    let isMounted = true;

    const checkGoogleStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/google/status`);
        if (!isMounted) return;
        if (response.ok) {
          const data = await response.json();
          setIsGoogleEnabled(data.enabled);
        }
      } catch {
        // Google 상태 확인 실패 시 무시
      }
    };

    checkGoogleStatus();

    return () => {
      isMounted = false;
    };
  }, [serverStatus]);

  const handleGoogleLogin = () => {
    // 백엔드 Google OAuth 엔드포인트로 리다이렉트
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        if (mode === 'register') {
          const response = await authApiClient.register({ email, password, name, phoneNumber });
          localStorage.setItem('userId', response.user.id);
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('userName', name);
          // 신규 회원은 온보딩으로 이동
          navigate('/onboarding');
          return;
        } else {
          const response = await authApiClient.login({ email, password });
          localStorage.setItem('userId', response.user.id);
          localStorage.setItem('accessToken', response.accessToken);
        }
        navigate('/');
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
    [email, password, name, phoneNumber, mode, navigate],
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
              <>
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
                <div className="field">
                  <label htmlFor="phoneNumber">전화번호</label>
                  <input
                    id="phoneNumber"
                    className="input"
                    type="tel"
                    placeholder="01012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    aria-required="true"
                    disabled={isLoading}
                    autoComplete="tel"
                    pattern="01[0-9]{8,9}"
                    maxLength={11}
                  />
                  <span className="field-hint">알림톡 발송에 사용됩니다</span>
                </div>
              </>
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
              disabled={isLoading || serverStatus === 'warming'}
            >
              {serverStatus === 'warming' ? (
                <>
                  <span className="spinner spinner-sm" aria-hidden="true" />
                  서버 연결 중...
                </>
              ) : isLoading ? (
                <>
                  <span className="spinner spinner-sm" aria-hidden="true" />
                  처리 중...
                </>
              ) : (
                mode === 'login' ? '로그인' : '회원가입'
              )}
            </button>
          </form>

          {/* Google 로그인 (로그인 모드에서만 표시) */}
          {mode === 'login' && isGoogleEnabled && (
            <>
              <div className="divider-text">
                <span>또는</span>
              </div>
              <button
                type="button"
                className="btn btn-google"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 계속하기
              </button>
            </>
          )}

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
