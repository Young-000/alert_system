import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCommuteApiClient,
  type RouteResponse,
  type SessionResponse,
  type CheckpointResponse,
  type CheckpointRecordResponse,
} from '@infrastructure/api/commute-api.client';

// Stopwatch record stored in localStorage
interface StopwatchRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  totalDurationSeconds: number;
  type: 'morning' | 'evening' | 'custom';
  notes?: string;
}

const STOPWATCH_STORAGE_KEY = 'commute_stopwatch_records';

function getStopwatchRecords(): StopwatchRecord[] {
  try {
    const data = localStorage.getItem(STOPWATCH_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStopwatchRecord(record: StopwatchRecord): void {
  const records = getStopwatchRecords();
  records.unshift(record);
  // Keep only last 50 records
  localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
}

export function CommuteTrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  // Check for stopwatch mode
  const isStopwatchMode = searchParams.get('mode') === 'stopwatch';
  const routeIdParam = searchParams.get('routeId');

  // State
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteResponse | null>(null);
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Timer (shared between modes)
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stopwatch mode state
  const [stopwatchState, setStopwatchState] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [stopwatchStartTime, setStopwatchStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);
  const [stopwatchType, setStopwatchType] = useState<'morning' | 'evening' | 'custom'>('morning');
  const [completedDuration, setCompletedDuration] = useState(0);

  // Load routes and check for active session (only in route mode)
  useEffect(() => {
    if (isStopwatchMode) {
      setIsLoading(false);
      return;
    }

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

        setRoutes(userRoutes);

        if (inProgress) {
          setActiveSession(inProgress);
          const route = userRoutes.find((r) => r.id === inProgress.routeId);
          setSelectedRoute(route || null);
        } else if (routeIdParam) {
          const route = userRoutes.find((r) => r.id === routeIdParam);
          setSelectedRoute(route || null);
        } else if (userRoutes.length > 0) {
          const preferred = userRoutes.find((r) => r.isPreferred) || userRoutes[0];
          setSelectedRoute(preferred);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, commuteApi, isStopwatchMode, routeIdParam]);

  // Timer effect for route-based session
  useEffect(() => {
    if (activeSession && activeSession.status === 'in_progress') {
      const startTime = new Date(activeSession.startedAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [activeSession]);

  // Stopwatch timer effect
  useEffect(() => {
    if (stopwatchState === 'running' && stopwatchStartTime) {
      const updateStopwatch = () => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - stopwatchStartTime) / 1000) + pausedTime);
      };

      updateStopwatch();
      timerRef.current = setInterval(updateStopwatch, 100); // More frequent for smoother display

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [stopwatchState, stopwatchStartTime, pausedTime]);

  // Format time for route mode
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };

  // Format time for stopwatch (00:00:00)
  const formatStopwatchTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Stopwatch controls
  const handleStartStopwatch = () => {
    setStopwatchStartTime(Date.now());
    setStopwatchState('running');
    setError('');
  };

  const handlePauseStopwatch = () => {
    setPausedTime(elapsedTime);
    setStopwatchState('paused');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleResumeStopwatch = () => {
    setStopwatchStartTime(Date.now());
    setStopwatchState('running');
  };

  const handleCompleteStopwatch = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finalDuration = elapsedTime;
    setCompletedDuration(finalDuration);
    setStopwatchState('completed');

    // Save to localStorage
    const record: StopwatchRecord = {
      id: Date.now().toString(),
      startedAt: new Date(Date.now() - finalDuration * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationSeconds: finalDuration,
      type: stopwatchType,
    };
    saveStopwatchRecord(record);
  };

  const handleResetStopwatch = () => {
    setStopwatchState('idle');
    setStopwatchStartTime(null);
    setPausedTime(0);
    setElapsedTime(0);
    setCompletedDuration(0);
  };

  // Start session (route mode)
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
      setError('');
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('세션 시작에 실패했습니다.');
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
      setError('세션 완료에 실패했습니다.');
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
    } catch (err) {
      console.error('Failed to cancel session:', err);
      setError('세션 취소에 실패했습니다.');
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

  // ========== STOPWATCH MODE RENDER ==========
  if (isStopwatchMode) {
    return (
      <main className="page stopwatch-page">
        <nav className="nav">
          <div className="brand">
            <Link to="/routes" className="nav-back">←</Link>
            <strong>스톱워치 모드</strong>
          </div>
          <div className="nav-actions">
            <Link className="btn btn-ghost" to="/commute/dashboard">
              통계
            </Link>
          </div>
        </nav>

        <div className="stopwatch-container">
          {/* Type Selection (only when idle) */}
          {stopwatchState === 'idle' && (
            <section className="stopwatch-type-section">
              <h2>어떤 출퇴근인가요?</h2>
              <div className="stopwatch-type-buttons">
                <button
                  type="button"
                  className={`type-btn ${stopwatchType === 'morning' ? 'active' : ''}`}
                  onClick={() => setStopwatchType('morning')}
                >
                  <span className="type-icon">🌅</span>
                  <span>출근</span>
                </button>
                <button
                  type="button"
                  className={`type-btn ${stopwatchType === 'evening' ? 'active' : ''}`}
                  onClick={() => setStopwatchType('evening')}
                >
                  <span className="type-icon">🌆</span>
                  <span>퇴근</span>
                </button>
              </div>
            </section>
          )}

          {/* Timer Display */}
          <section className="stopwatch-display-section">
            <div className={`stopwatch-display ${stopwatchState === 'running' ? 'pulse' : ''}`}>
              <span className="stopwatch-time">
                {stopwatchState === 'completed'
                  ? formatStopwatchTime(completedDuration)
                  : formatStopwatchTime(elapsedTime)}
              </span>
              {stopwatchState === 'running' && (
                <span className="stopwatch-label">기록 중...</span>
              )}
              {stopwatchState === 'paused' && (
                <span className="stopwatch-label paused">일시정지</span>
              )}
            </div>
          </section>

          {/* Completed State */}
          {stopwatchState === 'completed' && (
            <section className="stopwatch-complete">
              <div className="complete-badge">
                <span className="complete-icon">✅</span>
                <h2>{stopwatchType === 'morning' ? '출근' : '퇴근'} 완료!</h2>
              </div>
              <div className="complete-summary">
                <div className="summary-item">
                  <span className="summary-label">총 소요 시간</span>
                  <span className="summary-value">
                    {Math.floor(completedDuration / 60)}분 {completedDuration % 60}초
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">기록 시간</span>
                  <span className="summary-value muted">
                    {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="complete-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetStopwatch}
                >
                  새로 시작
                </button>
                <Link to="/commute/dashboard" className="btn btn-primary">
                  통계 보기
                </Link>
              </div>
            </section>
          )}

          {/* Control Buttons */}
          {stopwatchState !== 'completed' && (
            <section className="stopwatch-controls">
              {stopwatchState === 'idle' && (
                <button
                  type="button"
                  className="btn btn-stopwatch btn-start"
                  onClick={handleStartStopwatch}
                >
                  <span className="btn-icon">▶</span>
                  <span>시작</span>
                </button>
              )}

              {stopwatchState === 'running' && (
                <div className="control-group">
                  <button
                    type="button"
                    className="btn btn-stopwatch btn-pause"
                    onClick={handlePauseStopwatch}
                  >
                    <span className="btn-icon">⏸</span>
                    <span>일시정지</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-stopwatch btn-complete"
                    onClick={handleCompleteStopwatch}
                  >
                    <span className="btn-icon">⏹</span>
                    <span>완료</span>
                  </button>
                </div>
              )}

              {stopwatchState === 'paused' && (
                <div className="control-group">
                  <button
                    type="button"
                    className="btn btn-stopwatch btn-resume"
                    onClick={handleResumeStopwatch}
                  >
                    <span className="btn-icon">▶</span>
                    <span>재개</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-stopwatch btn-complete"
                    onClick={handleCompleteStopwatch}
                  >
                    <span className="btn-icon">⏹</span>
                    <span>완료</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleResetStopwatch}
                  >
                    초기화
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Hint */}
          {stopwatchState === 'idle' && (
            <p className="stopwatch-hint">
              경로 설정 없이 시간만 기록하는 간편 모드입니다
            </p>
          )}

          {error && <div className="notice error">{error}</div>}
        </div>

        <footer className="footer">
          <p className="footer-text">출퇴근 메이트 · 스톱워치 모드</p>
        </footer>
      </main>
    );
  }

  // ========== ROUTE MODE RENDER ==========
  if (!userId) {
    return (
      <main className="page">
        <nav className="nav">
          <Link to="/" className="brand">← 홈</Link>
        </nav>
        <div className="notice warning">먼저 로그인해주세요.</div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page">
        <nav className="nav">
          <Link to="/" className="brand">← 홈</Link>
        </nav>
        <div className="loading-container">
          <span className="spinner" />
          <p>불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="nav-back">← </Link>
          <strong>통근 트래킹</strong>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/routes">
            경로 설정
          </Link>
          <Link className="btn btn-ghost" to="/commute/dashboard">
            통계
          </Link>
        </div>
      </nav>

      {routes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗺️</span>
          <h2>경로를 먼저 설정해주세요</h2>
          <p>출퇴근 경로를 설정하면 트래킹을 시작할 수 있어요.</p>
          <Link to="/routes" className="btn btn-primary">
            경로 설정하기
          </Link>
        </div>
      ) : (
        <div className="tracking-container">
          {/* Route Selection (only when no active session) */}
          {!activeSession && (
            <section className="route-selection">
              <h2>경로 선택</h2>
              <div className="route-buttons">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    className={`route-button ${selectedRoute?.id === route.id ? 'active' : ''}`}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <span className="route-icon">
                      {route.routeType === 'morning' ? '🌅' : route.routeType === 'evening' ? '🌆' : '🚶'}
                    </span>
                    <span className="route-name">{route.name}</span>
                    <span className="route-duration">{route.totalExpectedDuration}분</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Active Session Status */}
          {activeSession && activeSession.status === 'in_progress' && (
            <section className="session-status">
              <div className="timer-display">
                <span className="timer-label">경과 시간</span>
                <span className="timer-value">{formatTime(elapsedTime)}</span>
              </div>
              <div className="progress-info">
                <span>진행률: {activeSession.progress}%</span>
                <span>{activeSession.delayStatus}</span>
              </div>
            </section>
          )}

          {/* Completed Session Summary */}
          {activeSession && activeSession.status === 'completed' && (
            <section className="session-complete">
              <div className="complete-header">
                <span className="complete-icon">✅</span>
                <h2>통근 완료!</h2>
              </div>
              <div className="complete-stats">
                <div className="stat-item">
                  <span className="stat-label">총 소요 시간</span>
                  <span className="stat-value">{activeSession.totalDurationMinutes}분</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">대기/환승 시간</span>
                  <span className="stat-value highlight">{activeSession.totalWaitMinutes}분</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">지연 상태</span>
                  <span className={`stat-value ${activeSession.totalDelayMinutes > 0 ? 'delayed' : 'on-time'}`}>
                    {activeSession.delayStatus}
                  </span>
                </div>
              </div>
              <p className="redirect-message">잠시 후 통계 페이지로 이동합니다...</p>
            </section>
          )}

          {/* Checkpoint Progress */}
          {selectedRoute && (
            <section className="checkpoint-progress">
              <h2>
                {activeSession ? '진행 상황' : '체크포인트 미리보기'}
              </h2>

              <div className="checkpoint-timeline">
                {selectedRoute.checkpoints.map((checkpoint, index) => {
                  const status = getCheckpointStatus(checkpoint);
                  const recordedInfo = getRecordedInfo(checkpoint.id);
                  const isLast = index === selectedRoute.checkpoints.length - 1;

                  return (
                    <div
                      key={checkpoint.id}
                      className={`timeline-item ${status}`}
                    >
                      <div className="timeline-marker">
                        {status === 'completed' ? '✓' : index + 1}
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="checkpoint-name">{checkpoint.name}</span>
                          {checkpoint.lineInfo && (
                            <span className="line-badge">{checkpoint.lineInfo}</span>
                          )}
                        </div>

                        {/* Recorded info */}
                        {recordedInfo && (
                          <div className="recorded-info">
                            <span className="arrival-time">
                              {recordedInfo.arrivalTimeString} 도착
                            </span>
                            {recordedInfo.durationFromPrevious !== undefined && (
                              <span className={`duration ${recordedInfo.isDelayed ? 'delayed' : ''}`}>
                                {recordedInfo.durationFromPrevious}분
                                {recordedInfo.delayMinutes !== 0 && (
                                  <span className="delay-badge">{recordedInfo.delayStatus}</span>
                                )}
                              </span>
                            )}
                            {recordedInfo.actualWaitTime > 0 && (
                              <span className="wait-time">
                                대기 {recordedInfo.actualWaitTime}분
                                {recordedInfo.waitDelayMinutes !== 0 && (
                                  <span className="wait-delay">{recordedInfo.waitDelayStatus}</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Expected info (when not recorded) */}
                        {!recordedInfo && !isLast && (
                          <div className="expected-info">
                            {typeof checkpoint.expectedDurationToNext === 'number' && (
                              <span>이동 {checkpoint.expectedDurationToNext}분</span>
                            )}
                            {checkpoint.expectedWaitTime > 0 && (
                              <span className="wait-expected">
                                대기 {checkpoint.expectedWaitTime}분
                              </span>
                            )}
                            {checkpoint.transportMode && (
                              <span className="transport-mode">
                                {checkpoint.transportMode === 'walk' && '🚶'}
                                {checkpoint.transportMode === 'subway' && '🚇'}
                                {checkpoint.transportMode === 'bus' && '🚌'}
                                {checkpoint.transportMode === 'transfer' && '🔄'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action button for current checkpoint */}
                        {status === 'current' && activeSession && (
                          <div className="checkpoint-action">
                            <button
                              type="button"
                              className="btn btn-primary btn-checkpoint"
                              onClick={() => {
                                if (isLast) {
                                  handleRecordCheckpoint(checkpoint.id).then(() => {
                                    handleCompleteSession();
                                  });
                                } else {
                                  handleRecordCheckpoint(checkpoint.id);
                                }
                              }}
                            >
                              {isLast ? '🏁 최종 도착!' : '✓ 도착'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Connector line */}
                      {!isLast && <div className="timeline-connector" />}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Action Buttons */}
          <div className="tracking-actions">
            {!activeSession && selectedRoute && (
              <button
                type="button"
                className="btn btn-primary btn-large btn-start"
                onClick={handleStartSession}
              >
                🚀 출발!
              </button>
            )}

            {activeSession && activeSession.status === 'in_progress' && (
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={handleCancelSession}
              >
                취소
              </button>
            )}
          </div>

          {/* Error display */}
          {error && <div className="notice error">{error}</div>}
        </div>
      )}

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 출퇴근 트래킹</p>
      </footer>
    </main>
  );
}
