import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCommuteApiClient,
  type RouteResponse,
  type SessionResponse,
  type CheckpointResponse,
  type CheckpointRecordResponse,
} from '@infrastructure/api/commute-api.client';

type ViewTab = 'ready' | 'tracking' | 'history';

export function CommuteTrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  const routeIdParam = searchParams.get('routeId');

  // State
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteResponse | null>(null);
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab state - 자동으로 현재 상태에 맞는 탭 선택
  const [activeTab, setActiveTab] = useState<ViewTab>('ready');

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  // Load routes and check for active session
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [userRoutes, inProgress] = await Promise.all([
          commuteApi.getUserRoutes(userId),
          commuteApi.getInProgressSession(userId),
        ]);

        if (!isMounted) return;

        setRoutes(userRoutes);

        if (inProgress) {
          setActiveSession(inProgress);
          const route = userRoutes.find((r) => r.id === inProgress.routeId);
          setSelectedRoute(route || null);
          setActiveTab('tracking'); // 진행 중인 세션이 있으면 트래킹 탭으로
        } else if (routeIdParam) {
          const route = userRoutes.find((r) => r.id === routeIdParam);
          setSelectedRoute(route || null);
        } else if (userRoutes.length > 0) {
          const preferred = userRoutes.find((r) => r.isPreferred) || userRoutes[0];
          setSelectedRoute(preferred);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load data:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, commuteApi, routeIdParam]);

  // Timer effect
  useEffect(() => {
    let isMounted = true;

    if (activeSession && activeSession.status === 'in_progress') {
      const startTime = new Date(activeSession.startedAt).getTime();
      const updateTimer = () => {
        if (!isMounted) return;
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        isMounted = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    return () => {
      isMounted = false;
    };
  }, [activeSession]);

  // Warn user when trying to close browser with active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSession && activeSession.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = '진행 중인 기록이 있습니다. 페이지를 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };

  // Start session
  const handleStartSession = async () => {
    if (!selectedRoute) {
      setError('경로를 선택해주세요.');
      return;
    }

    try {
      const session = await commuteApi.startSession({
        userId,
        routeId: selectedRoute.id,
        weatherCondition: '맑음',
      });
      setActiveSession(session);
      setActiveTab('tracking');
      setError('');
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('기록 시작에 실패했습니다.');
    }
  };

  // Record checkpoint
  const handleRecordCheckpoint = async (checkpointId: string, actualWaitTime?: number) => {
    if (!activeSession) return;

    try {
      const updatedSession = await commuteApi.recordCheckpoint({
        sessionId: activeSession.id,
        checkpointId,
        actualWaitTime,
      });
      setActiveSession(updatedSession);
      setError('');
    } catch (err) {
      console.error('Failed to record checkpoint:', err);
      setError('체크포인트 기록에 실패했습니다.');
    }
  };

  // Complete session
  const handleCompleteSession = async () => {
    if (!activeSession) return;

    try {
      const completedSession = await commuteApi.completeSession({
        sessionId: activeSession.id,
      });
      setActiveSession(completedSession);

      setTimeout(() => {
        navigate('/commute/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to complete session:', err);
      setError('기록 완료에 실패했습니다.');
    }
  };

  // Cancel session
  const handleCancelSession = async () => {
    if (!activeSession) return;

    if (!confirm('정말 취소하시겠습니까?')) return;

    try {
      await commuteApi.cancelSession(activeSession.id);
      setActiveSession(null);
      setElapsedTime(0);
      setActiveTab('ready');
    } catch (err) {
      console.error('Failed to cancel session:', err);
      setError('취소에 실패했습니다.');
    }
  };

  // Get checkpoint status
  const getCheckpointStatus = useCallback(
    (checkpoint: CheckpointResponse): 'completed' | 'current' | 'pending' => {
      if (!activeSession) return 'pending';

      const isRecorded = activeSession.checkpointRecords.some(
        (r) => r.checkpointId === checkpoint.id
      );

      if (isRecorded) return 'completed';

      const recordedIds = new Set(activeSession.checkpointRecords.map((r) => r.checkpointId));
      const nextUnrecorded = selectedRoute?.checkpoints.find((cp) => !recordedIds.has(cp.id));

      if (nextUnrecorded?.id === checkpoint.id) return 'current';

      return 'pending';
    },
    [activeSession, selectedRoute]
  );

  // Get recorded info for checkpoint
  const getRecordedInfo = useCallback(
    (checkpointId: string): CheckpointRecordResponse | undefined => {
      return activeSession?.checkpointRecords.find((r) => r.checkpointId === checkpointId);
    },
    [activeSession]
  );

  // Loading state
  if (isLoading) {
    return (
      <main className="page commute-page">
        <nav className="commute-nav">
          <Link to="/" className="nav-back">←</Link>
          <span className="nav-title">출퇴근 기록</span>
          <span />
        </nav>
        <div className="commute-loading">불러오는 중...</div>
      </main>
    );
  }

  // No routes state
  if (routes.length === 0) {
    return (
      <main className="page commute-page">
        <nav className="commute-nav">
          <Link to="/" className="nav-back">←</Link>
          <span className="nav-title">출퇴근 기록</span>
          <span />
        </nav>
        <div className="commute-empty">
          <div className="empty-icon">🗺️</div>
          <h2>경로를 먼저 설정해주세요</h2>
          <p>출퇴근 경로를 설정하면<br />시간을 기록할 수 있어요</p>
          <Link to="/routes" className="btn-primary">경로 설정하기</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page commute-page">
      {/* Navigation */}
      <nav className="commute-nav">
        <Link to="/" className="nav-back">←</Link>
        <span className="nav-title">출퇴근 기록</span>
        <Link to="/commute/dashboard" className="nav-action">내 기록</Link>
      </nav>

      {/* Tab Navigation */}
      <div className="commute-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'ready' ? 'active' : ''}`}
          onClick={() => setActiveTab('ready')}
          disabled={activeSession?.status === 'in_progress'}
        >
          <span className="tab-icon">🏠</span>
          <span>출발 준비</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          <span className="tab-icon">🚶</span>
          <span>이동 중</span>
          {activeSession?.status === 'in_progress' && (
            <span className="tab-badge">●</span>
          )}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => navigate('/commute/dashboard')}
        >
          <span className="tab-icon">📊</span>
          <span>기록</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="commute-content">
        {/* 출발 준비 탭 */}
        {activeTab === 'ready' && !activeSession && (
          <section className="ready-section">
            <h2 className="section-title">어디로 가시나요?</h2>

            <div className="route-cards">
              {routes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`route-card ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRoute(route)}
                >
                  <span className="route-emoji">
                    {route.routeType === 'morning' ? '🌅' : '🌆'}
                  </span>
                  <div className="route-details">
                    <strong>{route.name}</strong>
                    <span className="route-path">
                      {route.checkpoints.map(c => c.name).join(' → ')}
                    </span>
                    <span className="route-time">예상 {route.totalExpectedDuration}분</span>
                  </div>
                  {selectedRoute?.id === route.id && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>

            {selectedRoute && (
              <div className="start-action">
                <button
                  type="button"
                  className="btn-start"
                  onClick={handleStartSession}
                >
                  <span className="start-icon">🚀</span>
                  <span>출발!</span>
                </button>
                <p className="start-hint">
                  버튼을 누르면 시간 기록이 시작됩니다
                </p>
              </div>
            )}

            <Link to="/routes" className="link-routes">
              경로 추가/수정 →
            </Link>
          </section>
        )}

        {/* 이동 중 탭 */}
        {activeTab === 'tracking' && (
          <section className="tracking-section">
            {/* No active session */}
            {!activeSession && (
              <div className="no-session">
                <div className="no-session-icon">💤</div>
                <h3>진행 중인 기록이 없어요</h3>
                <p>출발 준비 탭에서 기록을 시작하세요</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab('ready')}
                >
                  출발 준비로 이동
                </button>
              </div>
            )}

            {/* Active session - in progress */}
            {activeSession && activeSession.status === 'in_progress' && selectedRoute && (
              <>
                {/* Timer */}
                <div className="timer-card">
                  <span className="timer-label">경과 시간</span>
                  <span className="timer-value">{formatTime(elapsedTime)}</span>
                  <div className="timer-progress">
                    <span>진행률: {activeSession.progress}%</span>
                    <span className={activeSession.totalDelayMinutes > 0 ? 'delayed' : 'on-time'}>
                      {activeSession.delayStatus}
                    </span>
                  </div>
                </div>

                {/* Current checkpoint action */}
                <div className="checkpoint-action">
                  {(() => {
                    const recordedIds = new Set(activeSession.checkpointRecords.map((r) => r.checkpointId));
                    const currentCheckpoint = selectedRoute.checkpoints.find((cp) => !recordedIds.has(cp.id));
                    const isLast = currentCheckpoint && selectedRoute.checkpoints.indexOf(currentCheckpoint) === selectedRoute.checkpoints.length - 1;

                    if (!currentCheckpoint) return null;

                    return (
                      <button
                        type="button"
                        className={`btn-checkpoint ${isLast ? 'finish' : ''}`}
                        onClick={() => {
                          if (isLast) {
                            handleRecordCheckpoint(currentCheckpoint.id).then(() => {
                              handleCompleteSession();
                            });
                          } else {
                            handleRecordCheckpoint(currentCheckpoint.id);
                          }
                        }}
                      >
                        <span className="checkpoint-icon">
                          {isLast ? '🏁' : '📍'}
                        </span>
                        <span className="checkpoint-text">
                          <strong>{currentCheckpoint.name}</strong>
                          <span>{isLast ? '도착 완료!' : '도착 체크'}</span>
                        </span>
                        <span className="checkpoint-arrow">→</span>
                      </button>
                    );
                  })()}
                </div>

                {/* Checkpoint timeline */}
                <div className="checkpoint-timeline">
                  <h3>진행 상황</h3>
                  {selectedRoute.checkpoints.map((checkpoint, index) => {
                    const status = getCheckpointStatus(checkpoint);
                    const recordedInfo = getRecordedInfo(checkpoint.id);
                    const isLast = index === selectedRoute.checkpoints.length - 1;

                    return (
                      <div
                        key={checkpoint.id}
                        className={`timeline-item ${status}`}
                      >
                        {index > 0 && (
                          <div className={`timeline-line ${status === 'pending' ? '' : 'active'}`} />
                        )}
                        <div className="timeline-marker">
                          {status === 'completed' ? '✓' : status === 'current' ? '●' : (index + 1)}
                        </div>
                        <div className="timeline-content">
                          <span className="timeline-name">{checkpoint.name}</span>
                          {recordedInfo ? (
                            <span className="timeline-time recorded">
                              {recordedInfo.arrivalTimeString}
                            </span>
                          ) : !isLast && checkpoint.expectedDurationToNext ? (
                            <span className="timeline-time expected">
                              {checkpoint.transportMode === 'subway' && '🚇'}
                              {checkpoint.transportMode === 'bus' && '🚌'}
                              {checkpoint.transportMode === 'walk' && '🚶'}
                              {' '}{checkpoint.expectedDurationToNext}분
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cancel button */}
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelSession}
                >
                  기록 취소
                </button>
              </>
            )}

            {/* Completed session */}
            {activeSession && activeSession.status === 'completed' && (
              <div className="completed-card">
                <div className="completed-icon">✅</div>
                <h2>{selectedRoute?.routeType === 'morning' ? '출근' : '퇴근'} 완료!</h2>
                <div className="completed-stats">
                  <div className="stat">
                    <span className="stat-label">총 소요 시간</span>
                    <span className="stat-value">{activeSession.totalDurationMinutes}분</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">대기 시간</span>
                    <span className="stat-value">{activeSession.totalWaitMinutes}분</span>
                  </div>
                </div>
                <p className="redirect-hint">잠시 후 기록 페이지로 이동합니다...</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Error display */}
      {error && <div className="commute-error">{error}</div>}
    </main>
  );
}
