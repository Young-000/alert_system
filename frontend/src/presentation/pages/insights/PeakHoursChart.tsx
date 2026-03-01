interface PeakHoursChartProps {
  distribution: Record<number, number>;
  peakHour: number;
  totalSessions: number;
}

const MAJOR_HOURS = [0, 6, 8, 10, 12, 14, 16, 18, 20, 23];

export function PeakHoursChart({
  distribution,
  peakHour,
  totalSessions,
}: PeakHoursChartProps): JSX.Element {
  // Build array of 24 hours with their counts
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: distribution[i] ?? 0,
  }));

  const maxCount = Math.max(...hours.map((h) => h.count), 1);

  return (
    <section className="insight-peak-hours" aria-label="시간대별 출퇴근 분포">
      <div className="insight-peak-hours-header">
        <h4 className="insight-section-title">시간대별 분포</h4>
        <span className="insight-peak-hours-total">
          총 {totalSessions}회 기록
        </span>
      </div>

      <div className="insight-peak-chart" role="img" aria-label="시간대별 출퇴근 세션 분포 차트">
        {hours.map(({ hour, count }) => {
          const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isPeak = hour === peakHour;
          const showLabel = MAJOR_HOURS.includes(hour);

          return (
            <div
              key={hour}
              className={`insight-peak-bar-wrapper ${isPeak ? 'insight-peak-bar-wrapper--peak' : ''}`}
            >
              <div
                className={`insight-peak-bar ${isPeak ? 'insight-peak-bar--peak' : ''}`}
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                title={`${hour}시: ${count}회`}
                role="presentation"
              />
              {showLabel && (
                <span className="insight-peak-label">{hour}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="insight-peak-legend">
        <span className="insight-peak-legend-item">
          <span className="insight-peak-legend-dot insight-peak-legend-dot--peak" aria-hidden="true" />
          피크 시간: {peakHour}시
        </span>
      </div>
    </section>
  );
}
