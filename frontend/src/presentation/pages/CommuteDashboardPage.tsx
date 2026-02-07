import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

export function CommuteDashboardPage() {
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();
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
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load stats:', err);
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
          <p>통계를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="nav-back">← </Link>
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
          icon="📊"
          title="아직 기록이 없어요"
          description="출퇴근 트래킹을 시작해보세요. 이동 시간을 기록하면 통계를 볼 수 있어요."
          actionLink="/commute"
          actionText="트래킹 시작하기"
        />
      ) : (
        <div className="dashboard-container">
          {/* Tabs */}
          <div className="dashboard-tabs">
            {stats && stats.totalSessions > 0 && (
              <>
                <button
                  type="button"
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('overview'); setSearchParams({ tab: 'overview' }, { replace: true }); }}
                >
                  전체 요약
                </button>
                <button
                  type="button"
                  className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('routes'); setSearchParams({ tab: 'routes' }, { replace: true }); }}
                >
                  구간 분석
                </button>
                <button
                  type="button"
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
                className={`tab ${activeTab === 'stopwatch' ? 'active' : ''}`}
                onClick={() => { setActiveTab('stopwatch'); setSearchParams({ tab: 'stopwatch' }, { replace: true }); }}
              >
                ⏱️ 스톱워치 ({stopwatchRecords.length})
              </button>
            )}
            {routeAnalytics.length > 0 && (
              <button
                type="button"
                className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => { setActiveTab('analytics'); setSearchParams({ tab: 'analytics' }, { replace: true }); }}
              >
                📊 분석
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
                    icon="⏱️"
                    title="평균 시간"
                    value={`${stats.overallAverageDuration}분`}
                  />
                  <StatCard
                    icon="🚶"
                    title="이번 주"
                    value={`${stats.recentSessions}회`}
                  />
                </div>
              </section>

              {/* 상세 30일 요약 - 접힘 처리 */}
              <details className="detailed-stats-accordion">
                <summary className="accordion-summary">
                  <span>상세 통계 보기</span>
                  <span className="expand-icon">▼</span>
                </summary>
                <div className="accordion-content">
                  <div className="stats-grid-enhanced">
                    <StatCard
                      icon="🚶"
                      title="통근 횟수"
                      value={`${stats.recentSessions}회`}
                    />
                    <StatCard
                      icon="⏱️"
                      title="평균 소요 시간"
                      value={`${stats.overallAverageDuration}분`}
                    />
                    <StatCard
                      icon="⏳"
                      title="평균 대기/환승"
                      value={`${stats.overallAverageWaitTime}분`}
                      highlight
                    />
                    <StatCard
                      icon="📊"
                      title="대기 비율"
                      value={`${stats.waitTimePercentage}%`}
                    />
                  </div>
                </div>
              </details>

              {/* Insights */}
              {stats.insights.length > 0 && (
                <section className="insights-section">
                  <h2>💡 인사이트</h2>
                  <div className="insights-list">
                    {stats.insights.map((insight, index) => (
                      <div key={index} className="insight-item">
                        <span className="insight-bullet">•</span>
                        <span className="insight-text">{insight}</span>
                      </div>
                    ))}
                  </div>
                </section>
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
                  <h2>🌤️ 날씨 영향</h2>
                  <div className="weather-list">
                    {stats.weatherImpact.map((weather) => (
                      <div key={weather.condition} className="weather-item">
                        <span className="weather-condition">
                          {weather.condition === '맑음' && '☀️'}
                          {weather.condition === '흐림' && '☁️'}
                          {weather.condition === '비' && '🌧️'}
                          {weather.condition === '눈' && '❄️'}
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
                  <h2>📊 경로별 비교</h2>
                  <p className="section-subtitle">어떤 경로가 더 빠를까요?</p>

                  <div className="route-comparison-chart">
                    {stats.routeStats.map((route) => {
                      const maxDuration = Math.max(...stats.routeStats.map(r => r.averageTotalDuration || 1));
                      const barWidth = ((route.averageTotalDuration || 0) / maxDuration) * 100;

                      return (
                        <div
                          key={route.routeId}
                          className={`route-comparison-row ${selectedRouteId === route.routeId ? 'selected' : ''}`}
                          onClick={() => setSelectedRouteId(route.routeId)}
                        >
                          <div className="route-comparison-info">
                            <span className="route-comparison-icon">
                              {route.routeName.includes('출근') ? '🌅' : '🌆'}
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
                        <span className="best-icon">🏆</span>
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
                        <span className="bottleneck-icon">⚠️</span>
                        <span>
                          <strong>{selectedRouteStats.bottleneckCheckpoint}</strong> 구간이 가장 지연이 많아요
                        </span>
                      </div>
                    )}

                    {/* Variable checkpoint */}
                    {selectedRouteStats.mostVariableCheckpoint && (
                      <div className="variable-notice">
                        <span className="variable-icon">📈</span>
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
                    icon="📝"
                    title="기록이 없어요"
                    description="트래킹을 시작하면 이동 기록이 여기에 표시됩니다."
                  />
                ) : (
                  <div className="history-list-enhanced">
                    {history.sessions.map((session) => (
                      <div key={session.id} className="history-card">
                        <div className="history-card-header">
                          <div className="history-date-badge">
                            {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </div>
                          {session.weatherCondition && (
                            <span className="history-weather-icon" aria-label={session.weatherCondition}>
                              {session.weatherCondition === '맑음' && '☀️'}
                              {session.weatherCondition === '흐림' && '☁️'}
                              {session.weatherCondition === '비' && '🌧️'}
                              {session.weatherCondition === '눈' && '❄️'}
                            </span>
                          )}
                        </div>
                        <div className="history-card-body">
                          <div className="history-route-name">
                            <span className="route-type-icon" aria-hidden="true">
                              {(session.routeName || '').includes('출근') ? '🏢' : '🏠'}
                            </span>
                            {session.routeName || '경로'}
                          </div>
                          <div className="history-time-info">
                            <span className="history-start-time">
                              출발 {new Date(session.startedAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {session.totalDurationMinutes && (
                              <span className="history-duration-badge">{session.totalDurationMinutes}분</span>
                            )}
                            {session.completedAt && (
                              <span className="history-end-time">
                                도착 {new Date(session.completedAt).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="history-card-footer">
                          <span className={`history-status-badge ${session.status}`}>
                            {session.status === 'completed' ? '완료' : session.status === 'cancelled' ? '취소' : '진행중'}
                          </span>
                          {session.totalDelayMinutes > 0 && (
                            <span className="history-delay-badge delayed">
                              +{session.totalDelayMinutes}분 지연
                            </span>
                          )}
                          {session.totalWaitMinutes > 0 && (
                            <span className="history-wait-badge">
                              대기 {session.totalWaitMinutes}분
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {history.hasMore && (
                  <button type="button" className="btn btn-outline btn-load-more">
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
                <h2>⏱️ 스톱워치 기록 요약</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">🚶</span>
                    <span className="stat-value">{stopwatchRecords.length}회</span>
                    <span className="stat-label">총 기록</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⏱️</span>
                    <span className="stat-value">
                      {Math.round(
                        stopwatchRecords.reduce((sum, r) => sum + r.totalDurationSeconds, 0) /
                        stopwatchRecords.length / 60
                      )}분
                    </span>
                    <span className="stat-label">평균 소요 시간</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🌅</span>
                    <span className="stat-value">
                      {stopwatchRecords.filter((r) => r.type === 'morning').length}회
                    </span>
                    <span className="stat-label">출근</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🌆</span>
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
                        <span className="history-route">
                          {record.type === 'morning' ? '🌅 출근' : record.type === 'evening' ? '🌆 퇴근' : '🚶 이동'}
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
                  💡 스톱워치 기록은 이 기기에만 저장됩니다
                </p>
              </section>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && routeAnalytics.length > 0 && (
            <div className="tab-content">
              {/* Analytics Summary */}
              <section className="analytics-summary-section">
                <h2>📊 경로 분석 점수</h2>
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
                  <h2>🏆 추천 경로</h2>
                  {(() => {
                    const best = routeAnalytics.reduce((b, c) => c.score > b.score ? c : b);
                    return (
                      <div className="best-route-card">
                        <div className="best-route-header">
                          <span className="best-route-icon">
                            {best.routeName.includes('출근') ? '🌅' : '🌆'}
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
                  <h2>📈 경로 비교</h2>
                  <div className="comparison-chart">
                    {routeAnalytics.map((analytics) => {
                      const maxScore = Math.max(...routeAnalytics.map(a => a.score || 1));
                      const barWidth = ((analytics.score || 0) / maxScore) * 100;

                      return (
                        <div key={analytics.routeId} className="comparison-row">
                          <div className="comparison-info">
                            <span className="comparison-icon">
                              {analytics.routeName.includes('출근') ? '🌅' : '🌆'}
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
                    <span>💡 점수는 어떻게 계산되나요?</span>
                    <span className="expand-icon">▼</span>
                  </summary>
                  <div className="accordion-content score-explanation">
                    <div className="score-factor">
                      <span className="factor-icon">⚡</span>
                      <span className="factor-label">속도 (40%)</span>
                      <span className="factor-desc">예상 시간 대비 실제 시간</span>
                    </div>
                    <div className="score-factor">
                      <span className="factor-icon">📊</span>
                      <span className="factor-label">일관성 (40%)</span>
                      <span className="factor-desc">매번 비슷한 시간이 걸리는지</span>
                    </div>
                    <div className="score-factor">
                      <span className="factor-icon">🎯</span>
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

      {/* Delay indicator */}
      {checkpoint.averageDelay !== 0 && (
        <div className={`bar-delay ${checkpoint.averageDelay > 0 ? 'positive' : 'negative'}`}>
          {checkpoint.averageDelay > 0 ? '+' : ''}{checkpoint.averageDelay}분
        </div>
      )}

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
        <span className="analytics-icon">
          {analytics.routeName.includes('출근') ? '🌅' : '🌆'}
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
            <span className="detail-label">⏱️ 평균</span>
            <span className="detail-value">{analytics.duration.average}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">📊 범위</span>
            <span className="detail-value">{analytics.duration.min}-{analytics.duration.max}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">📈 편차</span>
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
          🏆 추천
        </div>
      )}
    </div>
  );
}
