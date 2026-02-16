import type { CheckpointStats } from '@infrastructure/api/commute-api.client';

interface CheckpointAnalysisBarProps {
  checkpoint: CheckpointStats;
}

export function CheckpointAnalysisBar({ checkpoint }: CheckpointAnalysisBarProps): JSX.Element {
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

      {/* Variability indicator */}
      {checkpoint.variability >= 3 && (
        <div className="bar-variability">
          ±{checkpoint.variability}분 변동
        </div>
      )}
    </div>
  );
}
