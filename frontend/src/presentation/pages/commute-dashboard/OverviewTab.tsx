import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import { StatCard } from '../../components/StatCard';

interface OverviewTabProps {
  stats: CommuteStatsResponse;
}

export function OverviewTab({ stats }: OverviewTabProps): JSX.Element {
  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
      {/* Core stats - compact */}
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

      {/* Insight - show 1 inline */}
      {stats.insights.length > 0 && (
        <div className="insight-inline">
          <span className="insight-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg></span>
          <span className="insight-text">{stats.insights[0]}</span>
        </div>
      )}

      {/* Day of Week Stats - weekly chart */}
      <section className="weekly-chart-section">
        <h2>요일별 패턴</h2>
        <DayOfWeekChart stats={stats} />
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
  );
}

function DayOfWeekChart({ stats }: { stats: CommuteStatsResponse }): JSX.Element {
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

  const maxDuration = Math.max(...daysWithData.map((d) => d.averageDuration));

  return (
    <div className="weekly-chart">
      {daysWithData.map((day) => {
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
}
