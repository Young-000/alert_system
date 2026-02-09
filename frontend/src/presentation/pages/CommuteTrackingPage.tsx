import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getCommuteApiClient,
  type RouteResponse,
  type SessionResponse,
} from '@infrastructure/api/commute-api.client';
import { ConfirmModal } from '../components/ConfirmModal';

export function CommuteTrackingPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  // State from navigation (홈에서 전달)
  const navState = location.state as {
    sessionId?: string;
    routeId?: string;
  } | null;

  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState('');

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancel modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!userId) navigate('/login');
  }, [userId, navigate]);

  // Load data: check for existing session or start new one
  useEffect(() => {
    let isMounted = true;
    if (!userId) { setIsLoading(false); return; }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      try {
        // Check for in-progress session first
        const inProgress = await commuteApi.getInProgressSession(userId).catch(() => null);

        if (inProgress && isMounted) {
          setSession(inProgress);
          // Load the route for this session
          const routes = await commuteApi.getUserRoutes(userId);
          const matchingRoute = routes.find(r => r.id === inProgress.routeId);
          if (matchingRoute) setRoute(matchingRoute);
          return;
        }

        // No in-progress session: check if we have a routeId to start
        const routeId = navState?.routeId;
        if (routeId && isMounted) {
          const routes = await commuteApi.getUserRoutes(userId);
          const matchingRoute = routes.find(r => r.id === routeId);
          if (matchingRoute) {
            setRoute(matchingRoute);
            // Auto-start session
            const newSession = await commuteApi.startSession({
              userId,
              routeId: matchingRoute.id,
            });
            if (isMounted) setSession(newSession);
          }
          return;
        }

        // No route provided and no active session
        if (isMounted) {
          navigate('/', { replace: true });
        }
      } catch {
        if (isMounted) setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Timer effect
  useEffect(() => {
    if (session && session.status === 'in_progress') {
      const startTime = new Date(session.startedAt).getTime();
      const updateTimer = (): void => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [session]);

  // Warn on browser close during active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
      if (session?.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = '진행 중인 기록이 있습니다.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  // Format elapsed time
  const formatTime = (seconds: number): { main: string; sub: string } => {
    const totalMins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    if (hours > 0) {
      return {
        main: `${hours}:${mins.toString().padStart(2, '0')}`,
        sub: secs.toString().padStart(2, '0'),
      };
    }
    return {
      main: mins.toString().padStart(2, '0'),
      sub: secs.toString().padStart(2, '0'),
    };
  };

  // Complete session (도착 버튼)
  const handleComplete = async (): Promise<void> => {
    if (!session || isCompleting) return;
    setIsCompleting(true);
    setError('');

    try {
      // Auto-record any unrecorded checkpoints
      if (route) {
        let currentSession = session;
        const recordedIds = new Set(currentSession.checkpointRecords.map(r => r.checkpointId));
        const unrecorded = route.checkpoints.filter(cp => !recordedIds.has(cp.id));

        for (const cp of unrecorded) {
          currentSession = await commuteApi.recordCheckpoint({
            sessionId: currentSession.id,
            checkpointId: cp.id,
            actualWaitTime: 0,
          });
        }
      }

      const completed = await commuteApi.completeSession({ sessionId: session.id });
      setSession(completed);
    } catch {
      setError('기록 완료에 실패했습니다.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Cancel session
  const handleCancelConfirm = async (): Promise<void> => {
    if (!session) return;
    setIsCancelling(true);
    try {
      await commuteApi.cancelSession(session.id);
      navigate('/', { replace: true });
    } catch {
      setError('취소에 실패했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <main className="page commute-page-v2">
        <div className="commute-v2-loading">
          <span className="spinner spinner-lg" />
          <p>준비 중...</p>
        </div>
      </main>
    );
  }

  // Completed state
  if (session?.status === 'completed') {
    const durationMin = session.totalDurationMinutes || 0;
    const expected = route?.totalExpectedDuration || 0;
    const diff = expected > 0 ? durationMin - expected : 0;

    return (
      <main className="page commute-page-v2">
        <div className="commute-v2-completed">
          <div className="completed-check-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="completed-title">
            {route?.routeType === 'morning' ? '출근' : '퇴근'} 완료!
          </h1>
          <div className="completed-duration">
            <span className="completed-duration-value">{durationMin}</span>
            <span className="completed-duration-unit">분</span>
          </div>
          {diff !== 0 && expected > 0 && (
            <p className="completed-comparison">
              {diff > 0
                ? `평소보다 ${diff}분 더 걸렸어요`
                : `평소보다 ${Math.abs(diff)}분 빨랐어요`}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary completed-home-btn"
            onClick={() => navigate('/', { replace: true })}
          >
            홈으로
          </button>
        </div>
      </main>
    );
  }

  // Active tracking
  const time = formatTime(elapsedTime);

  return (
    <main className="page commute-page-v2">
      {/* Header */}
      <header className="commute-v2-header">
        <button
          type="button"
          className="commute-v2-back"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="commute-v2-title">
          {route?.routeType === 'morning' ? '출근' : '퇴근'} 중
        </span>
        <span />
      </header>

      {/* Route name */}
      {route && (
        <div className="commute-v2-route-badge">
          {route.name}
        </div>
      )}

      {/* Big Timer */}
      <div className="commute-v2-timer">
        <span className="commute-v2-timer-main">{time.main}</span>
        <span className="commute-v2-timer-sep">:</span>
        <span className="commute-v2-timer-sub">{time.sub}</span>
      </div>

      <p className="commute-v2-timer-label">경과 시간</p>

      {/* Route checkpoints (read-only display) */}
      {route && route.checkpoints.length > 0 && (
        <div className="commute-v2-route-preview">
          {route.checkpoints.map((cp, i) => (
            <span key={cp.id} className="commute-v2-cp">
              {cp.name}
              {i < route.checkpoints.length - 1 && (
                <span className="commute-v2-cp-arrow"> → </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Arrive Button */}
      <div className="commute-v2-actions">
        <button
          type="button"
          className="commute-v2-arrive-btn"
          onClick={handleComplete}
          disabled={isCompleting}
        >
          {isCompleting ? '저장 중...' : '도착'}
        </button>

        <button
          type="button"
          className="commute-v2-cancel-btn"
          onClick={() => setShowCancelConfirm(true)}
        >
          기록 취소
        </button>
      </div>

      {error && <div className="commute-v2-error">{error}</div>}

      <ConfirmModal
        open={showCancelConfirm}
        title="기록 취소"
        confirmText="취소하기"
        cancelText="계속 기록"
        confirmVariant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelConfirm(false)}
      >
        <p>정말 취소하시겠습니까?</p>
        <p className="muted">현재까지의 기록이 모두 삭제됩니다.</p>
      </ConfirmModal>
    </main>
  );
}
