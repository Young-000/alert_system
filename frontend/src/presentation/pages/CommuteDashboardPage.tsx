import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CommuteStatsResponse,
  type CommuteHistoryResponse,
  type CheckpointStats,
} from '@infrastructure/api/commute-api.client';

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

  // State
  const [stats, setStats] = useState<CommuteStatsResponse | null>(null);
  const [history, setHistory] = useState<CommuteHistoryResponse | null>(null);
  const [stopwatchRecords, setStopwatchRecords] = useState<StopwatchRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'history' | 'stopwatch'>('overview');

  // Load stopwatch records from localStorage
  useEffect(() => {
    const records = getStopwatchRecords();
    setStopwatchRecords(records);

    // If we have stopwatch records but no API data, show stopwatch tab by default
    if (records.length > 0 && !stats?.totalSessions) {
      setActiveTab('stopwatch');
    }
  }, [stats?.totalSessions]);

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
        const [statsData, historyData] = await Promise.all([
          commuteApi.getStats(userId, 30),
          commuteApi.getHistory(userId, 10),
        ]);
        if (!isMounted) return;
        setStats(statsData);
        setHistory(historyData);

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
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h2>아직 데이터가 없어요</h2>
          <p>통근 트래킹을 시작하면 여기서 통계를 볼 수 있어요.</p>
          <Link to="/commute" className="btn btn-primary">
            트래킹 시작하기
          </Link>
        </div>
      ) : (
        <div className="dashboard-container">
          {/* Tabs */}
          <div className="dashboard-tabs">
            {stats && stats.totalSessions > 0 && (
              <>
                <button
                  type="button"
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  전체 요약
                </button>
                <button
                  type="button"
                  className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('routes')}
                >
                  구간 분석
                </button>
                <button
                  type="button"
                  className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  기록
                </button>
              </>
            )}
            {stopwatchRecords.length > 0 && (
              <button
                type="button"
                className={`tab ${activeTab === 'stopwatch' ? 'active' : ''}`}
                onClick={() => setActiveTab('stopwatch')}
              >
                ⏱️ 스톱워치 ({stopwatchRecords.length})
              </button>
            )}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="tab-content">
              {/* Overall Stats */}
              <section className="stats-section">
                <h2>최근 30일 요약</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">🚶</span>
                    <span className="stat-value">{stats.recentSessions}회</span>
                    <span className="stat-label">통근 횟수</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⏱️</span>
                    <span className="stat-value">{stats.overallAverageDuration}분</span>
                    <span className="stat-label">평균 소요 시간</span>
                  </div>
                  <div className="stat-card highlight">
                    <span className="stat-icon">⏳</span>
                    <span className="stat-value">{stats.overallAverageWaitTime}분</span>
                    <span className="stat-label">평균 대기/환승</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">📊</span>
                    <span className="stat-value">{stats.waitTimePercentage}%</span>
                    <span className="stat-label">대기 비율</span>
                  </div>
                </div>
              </section>

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

              {/* Day of Week Stats */}
              <section className="day-stats-section">
                <h2>요일별 패턴</h2>
                <div className="day-chart">
                  {stats.dayOfWeekStats
                    .filter((d) => d.sampleCount > 0)
                    .map((day) => {
                      const maxDuration = Math.max(
                        ...stats.dayOfWeekStats.map((d) => d.averageDuration || 1)
                      );
                      const barHeight = (day.averageDuration / maxDuration) * 100;

                      return (
                        <div key={day.dayOfWeek} className="day-bar-wrapper">
                          <div className="day-bar-container">
                            <div
                              className="day-bar"
                              style={{ height: `${barHeight}%` }}
                            >
                              <span className="day-value">{day.averageDuration}분</span>
                            </div>
                          </div>
                          <span className="day-label">{day.dayName.slice(0, 1)}</span>
                        </div>
                      );
                    })}
                </div>
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
                  <div className="empty-history">
                    <p>아직 기록이 없어요.</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.sessions.map((session) => (
                      <div key={session.id} className="history-item">
                        <div className="history-header">
                          <span className="history-route">
                            {session.routeName || '경로'}
                          </span>
                          <span className={`history-status ${session.status}`}>
                            {session.status === 'completed' ? '완료' : session.status === 'cancelled' ? '취소' : '진행중'}
                          </span>
                        </div>
                        <div className="history-details">
                          <span className="history-date">
                            {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </span>
                          {session.totalDurationMinutes && (
                            <span className="history-duration">
                              {session.totalDurationMinutes}분
                            </span>
                          )}
                          <span className={`history-delay ${session.totalDelayMinutes > 0 ? 'delayed' : 'on-time'}`}>
                            {session.delayStatus}
                          </span>
                          {session.totalWaitMinutes > 0 && (
                            <span className="history-wait">
                              대기 {session.totalWaitMinutes}분
                            </span>
                          )}
                        </div>
                        {session.weatherCondition && (
                          <span className="history-weather">
                            {session.weatherCondition === '맑음' && '☀️'}
                            {session.weatherCondition === '흐림' && '☁️'}
                            {session.weatherCondition === '비' && '🌧️'}
                            {session.weatherCondition === '눈' && '❄️'}
                          </span>
                        )}
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
