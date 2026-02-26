import { useState } from 'react';
import { useAuth } from '@presentation/hooks/useAuth';
import { useWeeklyReportQuery } from '@infrastructure/query/use-weekly-report-query';
import { getQueryErrorMessage } from '@infrastructure/query/error-utils';
import { DailyBarChart } from '../home/DailyBarChart';
import { TrendIndicator } from '../home/TrendIndicator';

const MAX_WEEK_OFFSET = 12;

function WeeklyTabSkeleton(): JSX.Element {
  return (
    <div className="report-tab-content" aria-label="주간 리포트 로딩 중" role="status">
      <div className="report-card">
        <div className="skeleton" style={{ width: 160, height: 20 }} />
        <div className="skeleton" style={{ width: '100%', height: 14, marginTop: 12 }} />
        <div className="skeleton" style={{ width: '80%', height: 14, marginTop: 8 }} />
      </div>
      <div className="report-card">
        <div className="skeleton" style={{ width: 120, height: 18 }} />
        <div className="skeleton" style={{ width: '100%', height: 120, marginTop: 12 }} />
      </div>
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

export function WeeklyTab(): JSX.Element {
  const { userId } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: report, isLoading, error } = useWeeklyReportQuery(userId, weekOffset);

  const canGoNewer = weekOffset > 0;
  const canGoOlder = weekOffset < MAX_WEEK_OFFSET;

  if (isLoading) return <WeeklyTabSkeleton />;

  if (error) {
    const errorMsg = getQueryErrorMessage(error, '주간 리포트를 불러올 수 없습니다.');
    return (
      <div className="report-tab-content">
        <div className="report-card report-card--empty" role="alert">
          <p className="report-empty-msg">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!report || (report.totalSessions === 0 && weekOffset === 0)) {
    return (
      <div className="report-tab-content">
        <div className="report-card report-card--empty">
          <p className="report-empty-icon" aria-hidden="true">&#128202;</p>
          <p className="report-empty-msg">이번 주 기록이 아직 없어요</p>
          <p className="report-empty-hint">출퇴근을 기록하면 주간 리포트가 생성돼요!</p>
        </div>
      </div>
    );
  }

  const streakGoalMet = report.streakWeeklyCount >= report.streakWeeklyGoal;
  const streakPercent = report.streakWeeklyGoal > 0
    ? Math.min(100, Math.round((report.streakWeeklyCount / report.streakWeeklyGoal) * 100))
    : 0;

  return (
    <div className="report-tab-content" aria-label={`${report.weekLabel} 주간 리포트`}>
      {/* Week Navigation */}
      <div className="report-week-nav" role="group" aria-label="주 선택">
        <button
          type="button"
          className="report-nav-btn"
          disabled={!canGoOlder}
          onClick={() => setWeekOffset(weekOffset + 1)}
          aria-label="이전 주"
        >
          &#9664;
        </button>
        <span className="report-week-label">{report.weekLabel}</span>
        <button
          type="button"
          className="report-nav-btn"
          disabled={!canGoNewer}
          onClick={() => setWeekOffset(weekOffset - 1)}
          aria-label="다음 주"
        >
          &#9654;
        </button>
      </div>

      {/* Summary Card */}
      <div className="report-card">
        <div className="report-summary-row">
          <div className="report-stat-block">
            <span className="report-stat-value">{report.averageDuration}분</span>
            <span className="report-stat-label">평균 소요시간</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{report.totalSessions}회</span>
            <span className="report-stat-label">총 세션</span>
          </div>
          <div className="report-stat-block">
            <span className="report-stat-value">{report.totalRecordedDays}일</span>
            <span className="report-stat-label">기록일</span>
          </div>
        </div>
        {report.trend !== null && (
          <div className="report-trend-row">
            <TrendIndicator
              changeFromPrevious={report.changeFromPrevious}
              changePercentage={report.changePercentage}
              trend={report.trend}
            />
          </div>
        )}
      </div>

      {/* Daily Bar Chart */}
      <div className="report-card">
        <h3 className="report-section-title">일별 소요시간</h3>
        <DailyBarChart
          dailyStats={report.dailyStats}
          bestDayDate={report.bestDay?.date ?? null}
          worstDayDate={report.worstDay?.date ?? null}
          maxDuration={report.maxDuration}
        />
      </div>

      {/* Best/Worst Highlights */}
      {(report.bestDay || report.worstDay) && (
        <div className="report-card">
          <h3 className="report-section-title">하이라이트</h3>
          <div className="report-highlights">
            {report.bestDay && (
              <div className="report-highlight report-highlight--best">
                <span className="report-highlight-icon" aria-hidden="true">&#9733;</span>
                <div>
                  <span className="report-highlight-label">최고</span>
                  <span className="report-highlight-value">
                    {report.bestDay.dayName} {report.bestDay.averageDuration}분
                  </span>
                </div>
              </div>
            )}
            {report.worstDay && report.worstDay.date !== report.bestDay?.date && (
              <div className="report-highlight report-highlight--worst">
                <span className="report-highlight-icon" aria-hidden="true">&#9675;</span>
                <div>
                  <span className="report-highlight-label">최저</span>
                  <span className="report-highlight-value">
                    {report.worstDay.dayName} {report.worstDay.averageDuration}분
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Streak Progress */}
      <div className="report-card">
        <h3 className="report-section-title">주간 스트릭</h3>
        <div className="report-streak">
          <div className="report-streak-bar">
            <div
              className={`report-streak-fill ${streakGoalMet ? 'report-streak-fill--met' : ''}`}
              style={{ width: `${streakPercent}%` }}
            />
          </div>
          <span className={`report-streak-text ${streakGoalMet ? 'report-streak-text--met' : ''}`}>
            {report.streakWeeklyCount}일 / {report.streakWeeklyGoal}일
            {streakGoalMet && <span aria-label="목표 달성"> &#10003;</span>}
          </span>
        </div>
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="report-card">
          <h3 className="report-section-title">인사이트</h3>
          <ul className="report-insights" aria-label="주간 인사이트">
            {report.insights.map((insight) => (
              <li key={insight} className="report-insight">{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notices */}
      {report.totalRecordedDays > 0 && report.totalRecordedDays < 3 && (
        <p className="report-notice">
          데이터가 부족해 정확도가 낮을 수 있어요
        </p>
      )}
      {report.trend === null && report.totalSessions > 0 && (
        <p className="report-notice">이번 주가 첫 리포트예요!</p>
      )}
    </div>
  );
}
