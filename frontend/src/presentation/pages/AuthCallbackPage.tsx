import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { safeSetItem } from '@infrastructure/storage/safe-storage';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const processCallback = () => {
      const token = searchParams.get('token');
      const userId = searchParams.get('userId');
      const error = searchParams.get('error');

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

        // 이메일과 이름도 저장 (선택적)
        const email = searchParams.get('email');
        const name = searchParams.get('name');
        if (email) safeSetItem('userEmail', email);
        if (name) safeSetItem('userName', name);

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
              <span style={{ fontSize: '3rem' }}>✅</span>
              <h2>로그인 성공!</h2>
              <p className="muted">잠시 후 알림 설정 페이지로 이동합니다.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <span style={{ fontSize: '3rem' }}>❌</span>
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
