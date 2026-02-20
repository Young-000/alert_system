import { useState } from 'react';
import type { WeeklyReportResponse } from '@infrastructure/api/commute-api.client';
import { DailyBarChart } from './DailyBarChart';
import { TrendIndicator } from './TrendIndicator';

interface WeeklyReportCardProps {
  report: WeeklyReportResponse | null;
  isLoading: boolean;
  error: string;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}

const MAX_WEEK_OFFSET = 4;

function renderSkeleton(): JSX.Element {
  return (
    <section className="weekly-report-card" aria-label="주간 리포트 로딩 중">
      <div className="weekly-report-header">
        <span className="skeleton" style={{ width: 120, height: 18 }} />
        <span className="skeleton" style={{ width: 80, height: 18 }} />
      </div>
      <div className="weekly-report-summary">
        <span className="skeleton" style={{ width: 200, height: 16 }} />
      </div>
    </section>
  );
}

function renderEmpty(): JSX.Element {
  return (
    <section className="weekly-report-card weekly-report-card--empty" aria-label="주간 리포트">
      <div className="weekly-report-header">
        <h2 className="weekly-report-title">주간 리포트</h2>
      </div>
      <p className="weekly-report-empty-msg">
        이번 주 기록이 아직 없어요. 출퇴근을 기록해보세요!
      </p>
    </section>
  );
}

export function WeeklyReportCard({
  report,
  isLoading,
  error,
  weekOffset,
  onWeekChange,
}: WeeklyReportCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) return renderSkeleton();
  if (error) {
    return (
      <section className="weekly-report-card weekly-report-card--empty" aria-label="주간 리포트">
        <div className="weekly-report-header">
          <h2 className="weekly-report-title">주간 리포트</h2>
        </div>
        <p className="weekly-report-empty-msg" role="alert">{error}</p>
      </section>
    );
  }
  if (!report) return renderEmpty();
  if (report.totalSessions === 0 && weekOffset === 0) return renderEmpty();

  const canGoNewer = weekOffset > 0;
  const canGoOlder = weekOffset < MAX_WEEK_OFFSET;

  const streakGoalMet = report.streakWeeklyCount >= report.streakWeeklyGoal;

  return (
    <section
      className={`weekly-report-card ${isExpanded ? 'weekly-report-card--expanded' : ''}`}
      aria-label={`${report.weekLabel} 주간 리포트`}
    >
      {/* Header: Title + Week Navigation */}
      <div className="weekly-report-header">
        <h2 className="weekly-report-title">주간 리포트</h2>
        <div className="weekly-report-nav" role="group" aria-label="주 선택">
          <button
            type="button"
            className="weekly-report-nav-btn"
            disabled={!canGoOlder}
            onClick={() => onWeekChange(weekOffset + 1)}
            aria-label="이전 주"
          >
            &#9664;
          </button>
          <span className="weekly-report-week-label">{report.weekLabel}</span>
          <button
            type="button"
            className="weekly-report-nav-btn"
            disabled={!canGoNewer}
            onClick={() => onWeekChange(weekOffset - 1)}
            aria-label="다음 주"
          >
            &#9654;
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="weekly-report-summary">
        <span className="weekly-report-avg">
          평균 <strong>{report.averageDuration}분</strong>
        </span>
        {report.trend !== null && (
          <TrendIndicator
            changeFromPrevious={report.changeFromPrevious}
            changePercentage={report.changePercentage}
            trend={report.trend}
          />
        )}
      </div>

      {/* Streak progress line */}
      <div className="weekly-report-streak">
        <span className={`weekly-report-streak-text ${streakGoalMet ? 'weekly-report-streak--met' : ''}`}>
          기록 {report.streakWeeklyCount}일 / 목표 {report.streakWeeklyGoal}일
          {streakGoalMet && <span aria-label="목표 달성"> &#10003;</span>}
        </span>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        type="button"
        className="weekly-report-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="weekly-report-detail"
      >
        {isExpanded ? '접기 \u25B2' : '펼치기 \u25BC'}
      </button>

      {/* Detail (Accordion) */}
      <div
        id="weekly-report-detail"
        className={`weekly-report-detail ${isExpanded ? 'weekly-report-detail--open' : ''}`}
      >
        {/* Daily Bar Chart */}
        <div className="weekly-report-section">
          <h3 className="weekly-report-section-title">일별 소요시간</h3>
          <DailyBarChart
            dailyStats={report.dailyStats}
            bestDayDate={report.bestDay?.date ?? null}
            worstDayDate={report.worstDay?.date ?? null}
            maxDuration={report.maxDuration}
          />
        </div>

        {/* Best / Worst day highlights */}
        {(report.bestDay || report.worstDay) && (
          <div className="weekly-report-highlights">
            {report.bestDay && (
              <div className="weekly-report-highlight weekly-report-highlight--best">
                <span className="weekly-report-highlight-icon" aria-hidden="true">&#9733;</span>
                <span>최고: {report.bestDay.dayName} {report.bestDay.averageDuration}분</span>
              </div>
            )}
            {report.worstDay && report.worstDay.date !== report.bestDay?.date && (
              <div className="weekly-report-highlight weekly-report-highlight--worst">
                <span className="weekly-report-highlight-icon" aria-hidden="true">&#9675;</span>
                <span>최저: {report.worstDay.dayName} {report.worstDay.averageDuration}분</span>
              </div>
            )}
          </div>
        )}

        {/* Insights */}
        {report.insights.length > 0 && (
          <div className="weekly-report-section">
            <h3 className="weekly-report-section-title">인사이트</h3>
            <ul className="weekly-report-insights" aria-label="주간 인사이트">
              {report.insights.map((insight) => (
                <li key={insight} className="weekly-report-insight">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Insufficient data notice */}
        {report.totalRecordedDays > 0 && report.totalRecordedDays < 3 && (
          <p className="weekly-report-notice">
            데이터가 부족해 정확도가 낮을 수 있어요
          </p>
        )}

        {/* First report notice */}
        {report.trend === null && report.totalSessions > 0 && (
          <p className="weekly-report-notice">
            이번 주가 첫 리포트예요!
          </p>
        )}
      </div>
    </section>
  );
}
