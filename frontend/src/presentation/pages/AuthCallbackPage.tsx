import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { safeSetItem } from '@infrastructure/storage/safe-storage';
import { notifyAuthChange } from '@presentation/hooks/useAuth';

function getCallbackParams(): URLSearchParams {
  // fragment hash 우선 (보안: query string은 서버 로그/referrer에 노출됨)
  const hash = window.location.hash.slice(1);
  if (hash) {
    return new URLSearchParams(hash);
  }
  // fallback: query string (에러 리다이렉트는 여전히 query 사용)
  return new URLSearchParams(window.location.search);
}

export function AuthCallbackPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const processCallback = (): void => {
      const params = getCallbackParams();
      const token = params.get('token');
      const userId = params.get('userId');
      const error = params.get('error') || searchParams.get('error');

      if (error) {
        setStatus('error');
        switch (error) {
          case 'google_not_configured':
            setErrorMessage('Google 로그인이 설정되지 않았습니다.');
            break;
          case 'google_auth_failed':
            setErrorMessage('Google 인증에 실패했습니다. 다시 시도해주세요.');
            break;
          default:
            setErrorMessage('로그인 중 오류가 발생했습니다.');
        }
        timerId = setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (token && userId) {
        safeSetItem('accessToken', token);
        safeSetItem('userId', userId);

        const email = params.get('email');
        const name = params.get('name');
        if (email) safeSetItem('userEmail', email);
        if (name) safeSetItem('userName', name);

        // fragment에서 토큰 정보 제거 (브라우저 히스토리 보호)
        window.history.replaceState(null, '', window.location.pathname);
        notifyAuthChange();

        setStatus('success');
        timerId = setTimeout(() => navigate('/alerts'), 500);
      } else {
        setStatus('error');
        setErrorMessage('인증 정보가 올바르지 않습니다.');
        timerId = setTimeout(() => navigate('/login'), 3000);
      }
    };

    processCallback();
    return () => clearTimeout(timerId);
  }, [searchParams, navigate]);

  return (
    <main className="page">
      <section className="card auth-card">
        <div className="stack" style={{ textAlign: 'center' }}>
          {status === 'processing' && (
            <>
              <span className="spinner spinner-lg" aria-hidden="true" />
              <p>로그인 처리 중...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <h2>로그인 성공!</h2>
              <p className="muted">잠시 후 알림 설정 페이지로 이동합니다.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              <h2>로그인 실패</h2>
              <p className="muted">{errorMessage}</p>
              <p className="muted">잠시 후 로그인 페이지로 이동합니다.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
