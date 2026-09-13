import { useNeighborStats } from '@infrastructure/query/use-community-query';

interface NeighborSectionProps {
  routeId: string | undefined;
}

export function NeighborSection({ routeId }: NeighborSectionProps): JSX.Element | null {
  const { data, isLoading, isError, refetch } = useNeighborStats(routeId);

  // 로딩 중에는 아직 실패가 아니다 — 조회가 끝나기 전에 실패 문구가 스쳐 보이면 안 된다.
  if (isLoading) return null;

  // 실패 검사가 `!data`보다 앞에 와야 한다. 조회에 실패하면 data는 undefined로
  // 들어오므로, 순서가 뒤집히면 아래 실패 문구는 도달할 수 없는 코드가 된다.
  if (isError) {
    return (
      <section className="neighbor-section" aria-label="경로 이웃 정보">
        <p className="neighbor-error">이웃 정보를 불러올 수 없습니다</p>
        <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
          다시 시도
        </button>
      </section>
    );
  }

  if (!data) return null;

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
