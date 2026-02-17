import type { DailyStatsResponse } from '@infrastructure/api/commute-api.client';

interface DailyBarChartProps {
  dailyStats: DailyStatsResponse[];
  bestDayDate: string | null;
  worstDayDate: string | null;
  maxDuration: number;
}

function getBarModifier(
  date: string,
  sessionCount: number,
  bestDayDate: string | null,
  worstDayDate: string | null,
): string {
  if (sessionCount === 0) return 'daily-bar__fill--empty';
  if (date === bestDayDate) return 'daily-bar__fill--best';
  if (date === worstDayDate) return 'daily-bar__fill--worst';
  return 'daily-bar__fill--normal';
}

function getShortDayName(dayName: string): string {
  return dayName.replace('요일', '');
}

function getDayBadge(
  date: string,
  bestDayDate: string | null,
  worstDayDate: string | null,
): string {
  if (date === bestDayDate) return '\u2605'; // ★
  if (date === worstDayDate) return '\u25CB'; // ○ (neutral marker)
  return '';
}

export function DailyBarChart({
  dailyStats,
  bestDayDate,
  worstDayDate,
  maxDuration,
}: DailyBarChartProps): JSX.Element {
  const safeMax = maxDuration > 0 ? maxDuration : 1;

  const chartLabel = dailyStats
    .filter(d => d.sessionCount > 0)
    .map(d => `${getShortDayName(d.dayName)} ${d.averageDuration}분`)
    .join(', ');

  return (
    <div
      className="daily-bar-chart"
      role="img"
      aria-label={`일별 소요시간: ${chartLabel || '데이터 없음'}`}
    >
      {dailyStats.map((day) => {
        const widthPercent = day.sessionCount > 0
          ? Math.round((day.averageDuration / safeMax) * 100)
          : 0;
        const modifier = getBarModifier(day.date, day.sessionCount, bestDayDate, worstDayDate);
        const badge = getDayBadge(day.date, bestDayDate, worstDayDate);

        return (
          <div
            className="daily-bar"
            key={day.date}
            aria-label={
              day.sessionCount > 0
                ? `${day.dayName} ${day.averageDuration}분`
                : `${day.dayName} 기록 없음`
            }
          >
            <span className="daily-bar__label">
              {getShortDayName(day.dayName)}
            </span>
            <div className="daily-bar__track">
              <div
                className={`daily-bar__fill ${modifier}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="daily-bar__value">
              {day.sessionCount > 0 ? (
                <>
                  {day.averageDuration}분
                  {badge && (
                    <span className="daily-bar__badge" aria-hidden="true">
                      {' '}{badge}
                    </span>
                  )}
                </>
              ) : (
                <span className="daily-bar__no-data">기록 없음</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
