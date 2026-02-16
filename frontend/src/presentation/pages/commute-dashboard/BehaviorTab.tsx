import type { BehaviorAnalytics, UserPattern } from '@infrastructure/api/behavior-api.client';
import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { MIN_DATA_FOR_BEHAVIOR } from './types';

interface BehaviorTabProps {
  behaviorAnalytics: BehaviorAnalytics | null;
  behaviorPatterns: UserPattern[];
}

export function BehaviorTab({
  behaviorAnalytics,
  behaviorPatterns,
}: BehaviorTabProps): JSX.Element {
  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-behavior" aria-labelledby="tab-behavior">
      {behaviorAnalytics?.hasEnoughData ? (
        <>
          <section className="stats-section stats-compact">
            <h2>행동 패턴 분석</h2>
            <div className="stats-grid-compact">
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>}
                title="학습된 패턴"
                value={`${behaviorAnalytics.totalPatterns}개`}
              />
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M10 16H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h6"/><path d="M12 12H4"/></svg>}
                title="출퇴근 기록"
                value={`${behaviorAnalytics.totalCommuteRecords}회`}
              />
            </div>
            {behaviorAnalytics.averageConfidence > 0 && (
              <div className="insight-inline" style={{ marginTop: '12px' }}>
                <span className="insight-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
                </span>
                <span className="insight-text">
                  평균 신뢰도 {Math.round(behaviorAnalytics.averageConfidence * 100)}%
                </span>
              </div>
            )}
          </section>

          {behaviorPatterns.length > 0 ? (
            <BehaviorPatternList patterns={behaviorPatterns} />
          ) : (
            <div className="settings-empty" style={{ marginTop: '16px' }}>
              <p className="muted">패턴 데이터를 분석 중입니다. 기록이 더 쌓이면 구체적인 패턴이 표시됩니다.</p>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>}
          title="데이터가 부족해요"
          description={`${MIN_DATA_FOR_BEHAVIOR}회 이상 출퇴근 기록 후 분석이 시작돼요`}
          actionLink="/commute"
          actionText="트래킹 시작하기"
        />
      )}
    </div>
  );
}

function BehaviorPatternList({
  patterns,
}: {
  patterns: UserPattern[];
}): JSX.Element {
  return (
    <section className="behavior-patterns-section">
      <h2>발견된 패턴</h2>
      <div className="behavior-pattern-list">
        {patterns.map(pattern => (
          <div key={pattern.id} className="behavior-pattern-item">
            <div className="behavior-pattern-info">
              <span className="behavior-pattern-type">
                {pattern.patternType === 'departure_time' ? '출발 시간' :
                 pattern.patternType === 'day_preference' ? '요일별' :
                 pattern.patternType === 'weather_impact' ? '날씨 영향' :
                 pattern.patternType}
              </span>
              {pattern.dayOfWeek != null && (
                <span className="behavior-pattern-detail">
                  {['일', '월', '화', '수', '목', '금', '토'][pattern.dayOfWeek]}요일
                </span>
              )}
              {pattern.weatherCondition && (
                <span className="behavior-pattern-detail">
                  {pattern.weatherCondition}
                </span>
              )}
              {pattern.averageDepartureTime && (
                <span className="behavior-pattern-detail">
                  평균 {pattern.averageDepartureTime}
                </span>
              )}
            </div>
            <div className="behavior-pattern-confidence">
              <div
                className="confidence-bar"
                role="progressbar"
                aria-valuenow={Math.round(pattern.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`신뢰도 ${Math.round(pattern.confidence * 100)}%`}
              >
                <div
                  className="confidence-fill"
                  style={{ width: `${Math.round(pattern.confidence * 100)}%` }}
                />
              </div>
              <span className="confidence-text">
                {Math.round(pattern.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
