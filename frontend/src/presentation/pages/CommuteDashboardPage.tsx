import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CommuteStatsResponse,
  type CommuteHistoryResponse,
  type CheckpointStats,
  type RouteAnalyticsResponse,
} from '@infrastructure/api/commute-api.client';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';

// Stopwatch record type (same as CommuteTrackingPage)
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

export function CommuteDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = useMemo(() => getCommuteApiClient(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [stats, setStats] = useState<CommuteStatsResponse | null>(null);
  const [history, setHistory] = useState<CommuteHistoryResponse | null>(null);
  const [stopwatchRecords, setStopwatchRecords] = useState<StopwatchRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'history' | 'stopwatch' | 'analytics'>('overview');
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalyticsResponse[]>([]);

  // Handle URL tab parameter first (highest priority)
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['overview', 'routes', 'history', 'stopwatch', 'analytics'].includes(urlTab)) {
      setActiveTab(urlTab as 'overview' | 'routes' | 'history' | 'stopwatch' | 'analytics');
    }
  }, [searchParams]);

  // Load stopwatch records from localStorage (no auto tab switch)
  useEffect(() => {
    const records = getStopwatchRecords();
    setStopwatchRecords(records);
  }, []);

  // Load data from API
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsData, historyData, analyticsData] = await Promise.all([
          commuteApi.getStats(userId, 30),
          commuteApi.getHistory(userId, 10),
          commuteApi.getUserAnalytics(userId).catch(() => [] as RouteAnalyticsResponse[]),
        ]);
        if (!isMounted) return;
        setStats(statsData);
        setHistory(historyData);
        setRouteAnalytics(analyticsData);

        if (statsData.routeStats.length > 0) {
          setSelectedRouteId(statsData.routeStats[0].routeId);
        }
      } catch {
        if (!isMounted) return;
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
  }, [userId, commuteApi]);

  const selectedRouteStats = stats?.routeStats.find((r) => r.routeId === selectedRouteId);

  if (!userId) {
    return (
      <main className="page">
        <nav className="nav">
          <button type="button" className="brand nav-back-btn" onClick={() => navigate(-1)} aria-label="뒤로 가기">← 홈</button>
        </nav>
        <div className="notice warning">먼저 로그인해주세요.</div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page">
        <nav className="nav">
          <button type="button" className="brand nav-back-btn" onClick={() => navigate(-1)} aria-label="뒤로 가기">← 홈</button>
        </nav>
        <div className="loading-container" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>통계를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <button type="button" className="nav-back" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <strong>통근 통계</strong>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/commute">
            트래킹
          </Link>
          <Link className="btn btn-ghost" to="/routes">
            경로 설정
          </Link>
        </div>
      </nav>

      {(!stats || stats.totalSessions === 0) && stopwatchRecords.length === 0 ? (
        <EmptyState
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
          title="아직 기록이 없어요"
          description="출퇴근 트래킹을 시작해보세요. 이동 시간을 기록하면 통계를 볼 수 있어요."
          actionLink="/commute"
          actionText="트래킹 시작하기"
        />
      ) : (
        <div className="dashboard-container">
          {/* Tabs */}
          <div className="dashboard-tabs" role="tablist" aria-label="통근 통계 탭">
            {stats && stats.totalSessions > 0 && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'overview'}
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('overview'); setSearchParams({ tab: 'overview' }, { replace: true }); }}
                >
                  전체 요약
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'routes'}
                  className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('routes'); setSearchParams({ tab: 'routes' }, { replace: true }); }}
                >
                  경로 비교
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'history'}
                  className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('history'); setSearchParams({ tab: 'history' }, { replace: true }); }}
                >
                  기록
                </button>
              </>
            )}
            {stopwatchRecords.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'stopwatch'}
                className={`tab ${activeTab === 'stopwatch' ? 'active' : ''}`}
                onClick={() => { setActiveTab('stopwatch'); setSearchParams({ tab: 'stopwatch' }, { replace: true }); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                스톱워치 ({stopwatchRecords.length})
              </button>
            )}
            {routeAnalytics.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analytics'}
                className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => { setActiveTab('analytics'); setSearchParams({ tab: 'analytics' }, { replace: true }); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                분석
              </button>
            )}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="tab-content">
              {/* 핵심 통계 - 간소화 */}
              <section className="stats-section stats-compact">
                <div className="stats-grid-compact">
                  <StatCard
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                    title="평균 시간"
                    value={`${stats.overallAverageDuration}분`}
                  />
                  <StatCard
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M10 16H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h6"/><path d="M12 12H4"/></svg>}
                    title="이번 주"
                    value={`${stats.recentSessions}회`}
                  />
                </div>
              </section>

              {/* 인사이트 - 1개만 인라인 표시 */}
              {stats.insights.length > 0 && (
                <div className="insight-inline">
                  <span className="insight-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg></span>
                  <span className="insight-text">{stats.insights[0]}</span>
                </div>
              )}

              {/* Day of Week Stats - 개선된 주간 차트 */}
              <section className="weekly-chart-section">
                <h2>요일별 패턴</h2>
                {(() => {
                  const daysWithData = stats.dayOfWeekStats.filter((d) => d.sampleCount > 0);
                  const allZero = daysWithData.every((d) => d.averageDuration === 0);

                  if (daysWithData.length === 0 || allZero) {
                    return (
                      <div className="empty-state" role="status">
                        <p className="empty-title">아직 요일별 데이터가 부족해요</p>
                        <p className="empty-desc">기록이 쌓이면 요일별 패턴을 확인할 수 있어요.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="weekly-chart">
                      {daysWithData.map((day) => {
                        const maxDuration = Math.max(
                          ...daysWithData.map((d) => d.averageDuration)
                        );
                        const barHeight = maxDuration > 0
                          ? (day.averageDuration / maxDuration) * 100
                          : 0;
                        const isHighest = day.averageDuration === maxDuration;

                        return (
                          <div key={day.dayOfWeek} className="chart-bar-wrapper">
                            <div className="chart-bar-container">
                              <div
                                className={`chart-bar-fill ${isHighest ? 'highest' : ''}`}
                                style={{ height: `${barHeight}%` }}
                                role="img"
                                aria-label={`${day.dayName}: ${day.averageDuration}분`}
                              >
                                <span className="chart-bar-value">{day.averageDuration}분</span>
                              </div>
                            </div>
                            <span className="chart-day-label">{day.dayName.slice(0, 1)}</span>
                            <span className="chart-day-count">({day.sampleCount}회)</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>

              {/* Weather Impact */}
              {stats.weatherImpact.length > 1 && (
                <section className="weather-section">
                  <h2>날씨 영향</h2>
                  <div className="weather-list">
                    {stats.weatherImpact.map((weather) => (
                      <div key={weather.condition} className="weather-item">
                        <span className="weather-condition">
                          <span className={`weather-icon weather-icon--${weather.condition === '맑음' ? 'sunny' : weather.condition === '흐림' ? 'cloudy' : weather.condition === '비' ? 'rainy' : weather.condition === '눈' ? 'snowy' : 'default'}`} aria-hidden="true" />
                          {' '}{weather.condition}
                        </span>
                        <span className="weather-duration">{weather.averageDuration}분</span>
                        {weather.comparedToNormal !== 0 && (
                          <span className={`weather-diff ${weather.comparedToNormal > 0 ? 'slower' : 'faster'}`}>
                            {weather.comparedToNormal > 0 ? '+' : ''}{weather.comparedToNormal}분
                          </span>
                        )}
                        <span className="weather-count">({weather.sampleCount}회)</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Routes Tab */}
          {activeTab === 'routes' && stats && (
            <div className="tab-content">
              {/* Route Comparison Section - 경로별 비교 */}
              {stats.routeStats.length > 1 && (
                <section className="route-comparison-section">
                  <h2>경로별 비교</h2>
                  <p className="section-subtitle">어떤 경로가 더 빠를까요?</p>

                  <div className="route-comparison-chart">
                    {stats.routeStats.map((route) => {
                      const maxDuration = Math.max(...stats.routeStats.map(r => r.averageTotalDuration || 1));
                      const barWidth = ((route.averageTotalDuration || 0) / maxDuration) * 100;

                      return (
                        <div
                          key={route.routeId}
                          className={`route-comparison-row ${selectedRouteId === route.routeId ? 'selected' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedRouteId(route.routeId)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRouteId(route.routeId); } }}
                        >
                          <div className="route-comparison-info">
                            <span className={`route-badge ${route.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
                              {route.routeName.includes('출근') ? '출' : '퇴'}
                            </span>
                            <span className="route-comparison-name">{route.routeName}</span>
                            <span className="route-comparison-count">({route.totalSessions}회)</span>
                          </div>
                          <div className="route-comparison-bar-container">
                            <div
                              className="route-comparison-bar"
                              style={{ width: `${barWidth}%` }}
                            >
                              <span className="route-comparison-value">{route.averageTotalDuration}분</span>
                            </div>
                            {route.averageTotalWaitTime > 0 && (
                              <span className="route-comparison-wait">
                                (대기 {route.averageTotalWaitTime}분)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Best route highlight */}
                  {(() => {
                    const fastest = stats.routeStats.reduce((min, route) =>
                      (route.averageTotalDuration || 999) < (min.averageTotalDuration || 999) ? route : min
                    );
                    return fastest.totalSessions > 0 && (
                      <div className="best-route-notice">
                        <span className="best-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span>
                        <span><strong>{fastest.routeName}</strong>이 평균 {fastest.averageTotalDuration}분으로 가장 빨라요</span>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Route Selector */}
              <div className="route-selector">
                {stats.routeStats.map((route) => (
                  <button
                    key={route.routeId}
                    type="button"
                    className={`route-tab ${selectedRouteId === route.routeId ? 'active' : ''}`}
                    onClick={() => setSelectedRouteId(route.routeId)}
                  >
                    {route.routeName}
                  </button>
                ))}
              </div>

              {selectedRouteStats && (
                <>
                  {/* Route Summary */}
                  <section className="route-summary">
                    <h2>{selectedRouteStats.routeName} 분석</h2>
                    <div className="route-stats-grid">
                      <div className="route-stat">
                        <span className="route-stat-value">{selectedRouteStats.totalSessions}회</span>
                        <span className="route-stat-label">총 이용</span>
                      </div>
                      <div className="route-stat">
                        <span className="route-stat-value">{selectedRouteStats.averageTotalDuration}분</span>
                        <span className="route-stat-label">평균 시간</span>
                      </div>
                      <div className="route-stat highlight">
                        <span className="route-stat-value">{selectedRouteStats.averageTotalWaitTime}분</span>
                        <span className="route-stat-label">평균 대기</span>
                      </div>
                      <div className="route-stat">
                        <span className="route-stat-value">{selectedRouteStats.waitTimePercentage}%</span>
                        <span className="route-stat-label">대기 비율</span>
                      </div>
                    </div>
                  </section>

                  {/* Checkpoint Analysis */}
                  <section className="checkpoint-analysis">
                    <h2>구간별 분석</h2>
                    <p className="section-subtitle">
                      어느 구간에서 시간이 많이 걸리나요?
                    </p>

                    <div className="checkpoint-bars">
                      {selectedRouteStats.checkpointStats.map((cp) => (
                        <CheckpointAnalysisBar key={cp.checkpointId} checkpoint={cp} />
                      ))}
                    </div>

                    {/* Bottleneck highlight */}
                    {selectedRouteStats.bottleneckCheckpoint && (
                      <div className="bottleneck-notice">
                        <span className="bottleneck-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                        <span>
                          <strong>{selectedRouteStats.bottleneckCheckpoint}</strong> 구간이 가장 지연이 많아요
                        </span>
                      </div>
                    )}

                    {/* Variable checkpoint */}
                    {selectedRouteStats.mostVariableCheckpoint && (
                      <div className="variable-notice">
                        <span className="variable-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
                        <span>
                          <strong>{selectedRouteStats.mostVariableCheckpoint}</strong> 구간은 시간이 들쑥날쑥해요
                        </span>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && history && (
            <div className="tab-content">
              <section className="history-section">
                <h2>최근 기록</h2>

                {history.sessions.length === 0 ? (
                  <EmptyState
                    icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                    title="기록이 없어요"
                    description="트래킹을 시작하면 이동 기록이 여기에 표시됩니다."
                  />
                ) : (
                  <div className="history-list-enhanced">
                    {history.sessions.map((session) => {
                      const startTime = new Date(session.startedAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const endTime = session.completedAt
                        ? new Date(session.completedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : null;
                      const routeType = (session.routeName || '').includes('출근') ? 'morning' : 'evening';

                      return (
                        <div key={session.id} className="history-card">
                          <div className="history-card-header">
                            <div className="history-date-badge">
                              {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                weekday: 'short',
                              })}
                            </div>
                            <span className={`history-route-type-badge ${routeType}`}>
                              {routeType === 'morning' ? '출근' : '퇴근'}
                            </span>
                          </div>
                          <div className="history-card-body">
                            <div className="history-route-name">
                              {session.routeName || '경로'}
                            </div>
                            <div className="history-time-flow">
                              <span className="history-start-time">{startTime} 출발</span>
                              <span className="history-time-arrow">→</span>
                              {endTime && (
                                <span className="history-end-time">{endTime} 도착</span>
                              )}
                              {session.totalDurationMinutes && (
                                <span className="history-duration-badge">({session.totalDurationMinutes}분)</span>
                              )}
                            </div>
                          </div>
                          <div className="history-card-footer">
                            <span className={`history-status-badge ${session.status}`}>
                              {session.status === 'completed' ? '완료' : session.status === 'cancelled' ? '취소' : '진행중'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {history.hasMore && (
                  <button
                    type="button"
                    className="btn btn-outline btn-load-more"
                    onClick={async () => {
                      try {
                        const moreHistory = await commuteApi.getHistory(userId, 10, history.sessions.length);
                        setHistory(prev => {
                          if (!prev) return moreHistory;
                          return {
                            ...prev,
                            sessions: [...prev.sessions, ...moreHistory.sessions],
                            hasMore: moreHistory.hasMore,
                          };
                        });
                      } catch { /* ignore */ }
                    }}
                  >
                    더 보기
                  </button>
                )}
              </section>
            </div>
          )}

          {/* Stopwatch Tab */}
          {activeTab === 'stopwatch' && stopwatchRecords.length > 0 && (
            <div className="tab-content">
              {/* Stopwatch Stats Summary */}
              <section className="stats-section">
                <h2>스톱워치 기록 요약</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M10 16H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h6"/><path d="M12 12H4"/></svg></span>
                    <span className="stat-value">{stopwatchRecords.length}회</span>
                    <span className="stat-label">총 기록</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                    <span className="stat-value">
                      {Math.round(
                        stopwatchRecords.reduce((sum, r) => sum + r.totalDurationSeconds, 0) /
                        stopwatchRecords.length / 60
                      )}분
                    </span>
                    <span className="stat-label">평균 소요 시간</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><span className="route-badge morning" aria-hidden="true">출</span></span>
                    <span className="stat-value">
                      {stopwatchRecords.filter((r) => r.type === 'morning').length}회
                    </span>
                    <span className="stat-label">출근</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><span className="route-badge evening" aria-hidden="true">퇴</span></span>
                    <span className="stat-value">
                      {stopwatchRecords.filter((r) => r.type === 'evening').length}회
                    </span>
                    <span className="stat-label">퇴근</span>
                  </div>
                </div>
              </section>

              {/* Stopwatch Records List */}
              <section className="history-section">
                <h2>최근 스톱워치 기록</h2>
                <div className="history-list">
                  {stopwatchRecords.slice(0, 20).map((record) => (
                    <div key={record.id} className="history-item">
                      <div className="history-header">
                        <span className={`history-route ${record.type}`}>
                          {record.type === 'morning' ? '출근' : record.type === 'evening' ? '퇴근' : '이동'}
                        </span>
                        <span className="history-status completed">완료</span>
                      </div>
                      <div className="history-details">
                        <span className="history-date">
                          {new Date(record.startedAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                        <span className="history-time">
                          {new Date(record.startedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="history-duration">
                          {Math.floor(record.totalDurationSeconds / 60)}분 {record.totalDurationSeconds % 60}초
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="stopwatch-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  스톱워치 기록은 이 기기에만 저장됩니다
                </p>
              </section>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && routeAnalytics.length > 0 && (
            <div className="tab-content">
              {/* Analytics Summary */}
              <section className="analytics-summary-section">
                <h2>경로 분석 점수</h2>
                <p className="section-subtitle">어떤 경로가 가장 좋을까요?</p>

                <div className="analytics-cards">
                  {routeAnalytics.map((analytics) => (
                    <RouteAnalyticsCard key={analytics.routeId} analytics={analytics} />
                  ))}
                </div>
              </section>

              {/* Best Route Recommendation */}
              {routeAnalytics.filter(a => a.isRecommended).length > 0 && (
                <section className="recommendation-section">
                  <h2>추천 경로</h2>
                  {(() => {
                    const best = routeAnalytics.reduce((b, c) => c.score > b.score ? c : b);
                    return (
                      <div className="best-route-card">
                        <div className="best-route-header">
                          <span className={`route-badge ${best.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
                            {best.routeName.includes('출근') ? '출' : '퇴'}
                          </span>
                          <span className="best-route-name">{best.routeName}</span>
                          <span className={`grade-badge grade-${best.grade.toLowerCase()}`}>
                            {best.grade}
                          </span>
                        </div>
                        <div className="best-route-stats">
                          <div className="best-stat">
                            <span className="best-stat-value">{best.duration.average}분</span>
                            <span className="best-stat-label">평균 시간</span>
                          </div>
                          <div className="best-stat">
                            <span className="best-stat-value">{best.score}점</span>
                            <span className="best-stat-label">종합 점수</span>
                          </div>
                          <div className="best-stat">
                            <span className="best-stat-value">{best.totalTrips}회</span>
                            <span className="best-stat-label">측정 횟수</span>
                          </div>
                        </div>
                        <p className="best-route-summary">{best.summary}</p>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Route Comparison */}
              {routeAnalytics.length >= 2 && (
                <section className="comparison-section">
                  <h2>경로 비교</h2>
                  <div className="comparison-chart">
                    {routeAnalytics.map((analytics) => {
                      const maxScore = Math.max(...routeAnalytics.map(a => a.score || 1));
                      const barWidth = ((analytics.score || 0) / maxScore) * 100;

                      return (
                        <div key={analytics.routeId} className="comparison-row">
                          <div className="comparison-info">
                            <span className={`route-badge ${analytics.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
                              {analytics.routeName.includes('출근') ? '출' : '퇴'}
                            </span>
                            <span className="comparison-name">{analytics.routeName}</span>
                            <span className={`grade-badge-small grade-${analytics.grade.toLowerCase()}`}>
                              {analytics.grade}
                            </span>
                          </div>
                          <div className="comparison-bar-container">
                            <div
                              className="comparison-bar"
                              style={{ width: `${barWidth}%` }}
                            >
                              <span className="comparison-score">{analytics.score}점</span>
                            </div>
                          </div>
                          <div className="comparison-detail">
                            {analytics.duration.average}분 · {analytics.variabilityText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Score Factors Explanation */}
              <section className="score-factors-section">
                <details className="score-factors-accordion">
                  <summary className="accordion-summary">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> 점수는 어떻게 계산되나요?</span>
                    <span className="expand-icon">▼</span>
                  </summary>
                  <div className="accordion-content score-explanation">
                    <div className="score-factor">
                      <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                      <span className="factor-label">속도 (40%)</span>
                      <span className="factor-desc">예상 시간 대비 실제 시간</span>
                    </div>
                    <div className="score-factor">
                      <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
                      <span className="factor-label">일관성 (40%)</span>
                      <span className="factor-desc">매번 비슷한 시간이 걸리는지</span>
                    </div>
                    <div className="score-factor">
                      <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                      <span className="factor-label">편의성 (20%)</span>
                      <span className="factor-desc">환승 횟수, 대기 시간 비율</span>
                    </div>
                  </div>
                </details>
              </section>
            </div>
          )}
        </div>
      )}

      <div className="cross-link-section">
        <Link to="/alerts" className="cross-link-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span>알림 설정하기</span>
          <span className="cross-link-arrow">→</span>
        </Link>
      </div>

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 출퇴근 통계</p>
      </footer>
    </main>
  );
}

// Sub-component for checkpoint analysis bar
function CheckpointAnalysisBar({ checkpoint }: { checkpoint: CheckpointStats }) {
  const totalExpected = checkpoint.expectedDuration + checkpoint.expectedWaitTime;
  const totalActual = checkpoint.averageActualDuration + checkpoint.averageActualWaitTime;
  const maxTime = Math.max(totalExpected, totalActual, 1);

  return (
    <div className={`checkpoint-bar-item ${checkpoint.isBottleneck ? 'bottleneck' : ''}`}>
      <div className="bar-header">
        <span className="bar-name">{checkpoint.checkpointName}</span>
        <span className="bar-samples">({checkpoint.sampleCount}회)</span>
      </div>

      <div className="bar-comparison">
        {/* Expected */}
        <div className="bar-row">
          <span className="bar-label">예상</span>
          <div className="bar-track">
            <div
              className="bar-fill expected"
              style={{ width: `${(totalExpected / maxTime) * 100}%` }}
            >
              <span className="bar-value">{totalExpected}분</span>
            </div>
          </div>
        </div>

        {/* Actual */}
        <div className="bar-row">
          <span className="bar-label">실제</span>
          <div className="bar-track">
            <div
              className="bar-fill actual"
              style={{ width: `${(totalActual / maxTime) * 100}%` }}
            >
              <span className="bar-value">{Math.round(totalActual * 10) / 10}분</span>
            </div>
            {checkpoint.averageActualWaitTime > 0 && (
              <div
                className="bar-fill wait"
                style={{
                  width: `${(checkpoint.averageActualWaitTime / maxTime) * 100}%`,
                  marginLeft: `${(checkpoint.averageActualDuration / maxTime) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Variability indicator */}
      {checkpoint.variability >= 3 && (
        <div className="bar-variability">
          ±{checkpoint.variability}분 변동
        </div>
      )}
    </div>
  );
}

// Sub-component for route analytics card
function RouteAnalyticsCard({ analytics }: { analytics: RouteAnalyticsResponse }) {
  const gradeColors: Record<string, string> = {
    S: '#FFD700',
    A: '#4CAF50',
    B: '#2196F3',
    C: '#FF9800',
    D: '#F44336',
  };

  return (
    <div className={`analytics-card ${analytics.isRecommended ? 'recommended' : ''}`}>
      <div className="analytics-card-header">
        <span className={`route-badge ${analytics.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
          {analytics.routeName.includes('출근') ? '출' : '퇴'}
        </span>
        <div className="analytics-title-area">
          <h3 className="analytics-route-name">{analytics.routeName}</h3>
          <span className="analytics-trips">{analytics.totalTrips}회 측정</span>
        </div>
        <div
          className={`analytics-grade grade-${analytics.grade.toLowerCase()}`}
          style={{ backgroundColor: gradeColors[analytics.grade] || '#888' }}
        >
          {analytics.grade}
        </div>
      </div>

      <div className="analytics-card-body">
        <div className="analytics-score-ring">
          <svg viewBox="0 0 36 36" className="score-circle">
            <path
              className="score-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="score-fill"
              strokeDasharray={`${analytics.score}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="score-value">{analytics.score}</span>
        </div>

        <div className="analytics-details">
          <div className="analytics-detail-row">
            <span className="detail-label">평균</span>
            <span className="detail-value">{analytics.duration.average}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">범위</span>
            <span className="detail-value">{analytics.duration.min}-{analytics.duration.max}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">편차</span>
            <span className="detail-value">±{analytics.duration.stdDev}분</span>
          </div>
        </div>
      </div>

      <div className="analytics-card-footer">
        <div className="score-factors">
          <div className="factor-bar">
            <span className="factor-label">속도</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.speed}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.speed}</span>
          </div>
          <div className="factor-bar">
            <span className="factor-label">일관성</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.reliability}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.reliability}</span>
          </div>
          <div className="factor-bar">
            <span className="factor-label">편의</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.comfort}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.comfort}</span>
          </div>
        </div>
        <p className="analytics-variability">{analytics.variabilityText}</p>
      </div>

      {analytics.isRecommended && (
        <div className="recommended-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          추천
        </div>
      )}
    </div>
  );
}
