import { useNeighborStats } from '@infrastructure/query/use-community-query';

interface NeighborSectionProps {
  routeId: string | undefined;
}

export function NeighborSection({ routeId }: NeighborSectionProps): JSX.Element | null {
  const { data, isLoading, isError } = useNeighborStats(routeId);

  // Don't render anything while loading or on error (subtle, optional feature)
  if (isLoading || isError || !data) return null;

  // Hide entirely if user has no route
  if (data.dataStatus === 'no_route') return null;

  return (
    <section className="neighbor-section" aria-label="경로 이웃 정보">
      <div className="neighbor-header">
        <span className="neighbor-icon" aria-hidden="true">&#x1F465;</span>
        <span className="neighbor-title">경로 이웃</span>
      </div>

      {data.dataStatus === 'insufficient' ? (
        <p className="neighbor-insufficient">
          아직 이웃 데이터가 부족해요
        </p>
      ) : (
        <>
          <p className="neighbor-count">
            이웃 <strong>{data.neighborCount}명</strong>이 비슷한 경로로 출퇴근해요
          </p>

          {data.avgDurationMinutes != null && (
            <div className="neighbor-comparison">
              <span className="neighbor-comparison-item">
                이웃 평균 <strong>{data.avgDurationMinutes}분</strong>
              </span>

              {data.myAvgDurationMinutes != null && data.diffMinutes != null && (
                <span className="neighbor-comparison-item">
                  내 평균 {data.myAvgDurationMinutes}분
                  {' '}
                  <span
                    className={`neighbor-diff ${
                      data.diffMinutes < 0
                        ? 'neighbor-diff--faster'
                        : data.diffMinutes > 0
                          ? 'neighbor-diff--slower'
                          : ''
                    }`}
                  >
                    ({data.diffMinutes > 0 ? '+' : ''}{data.diffMinutes}분)
                  </span>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
