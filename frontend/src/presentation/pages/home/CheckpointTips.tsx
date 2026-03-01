import { useState, useCallback } from 'react';
import {
  useCheckpointTips,
  useCreateTip,
  useMarkHelpful,
  useReportTip,
} from '@infrastructure/query/use-community-query';
import { TipCard } from './TipCard';
import { TipForm } from './TipForm';

interface CheckpointTipsProps {
  checkpointKey: string;
  checkpointName: string;
  isLoggedIn?: boolean;
  isEligible?: boolean;
}

export function CheckpointTips({
  checkpointKey,
  checkpointName,
  isLoggedIn = false,
  isEligible = true,
}: CheckpointTipsProps): JSX.Element {
  const [page] = useState(1);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const { data, isLoading, isError, refetch } = useCheckpointTips(checkpointKey, page);
  const createTipMutation = useCreateTip();
  const markHelpfulMutation = useMarkHelpful();
  const reportTipMutation = useReportTip();

  const handleCreateTip = useCallback(
    (cpKey: string, content: string): void => {
      createTipMutation.mutate(
        { checkpointKey: cpKey, content },
        {
          onError: (error) => {
            // 429 rate limit error
            if (error.message.includes('429') || error.message.includes('Too Many')) {
              setIsRateLimited(true);
            }
          },
        },
      );
    },
    [createTipMutation],
  );

  const handleHelpful = useCallback(
    (tipId: string): void => {
      markHelpfulMutation.mutate(tipId);
    },
    [markHelpfulMutation],
  );

  const handleReport = useCallback(
    (tipId: string): void => {
      reportTipMutation.mutate(tipId);
    },
    [reportTipMutation],
  );

  return (
    <section className="checkpoint-tips" aria-label={`${checkpointName} 팁`}>
      <div className="checkpoint-tips-header">
        <h3 className="checkpoint-tips-title">
          <span aria-hidden="true">&#x1F4AC;</span>
          {checkpointName} 팁
          {data && data.total > 0 && (
            <span className="checkpoint-tips-count">{data.total}개</span>
          )}
        </h3>
      </div>

      {isLoading && (
        <div className="tips-loading" role="status">
          <span className="spinner spinner-sm" aria-hidden="true" />
          팁을 불러오는 중...
        </div>
      )}

      {isError && (
        <div className="tips-error" role="alert">
          팁을 불러올 수 없습니다
          <div className="tips-error-retry">
            <button type="button" className="btn btn-sm" onClick={() => refetch()}>
              다시 시도
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && data && data.tips.length === 0 && (
        <div className="tips-empty">
          <p className="tips-empty-text">
            아직 팁이 없어요. 첫 번째 팁을 남겨보세요!
          </p>
        </div>
      )}

      {!isLoading && !isError && data && data.tips.length > 0 && (
        <div role="list" aria-label="팁 목록">
          {data.tips.map((tip) => (
            <div role="listitem" key={tip.id}>
              <TipCard
                tip={tip}
                onHelpful={handleHelpful}
                onReport={handleReport}
                isHelpfulLoading={markHelpfulMutation.isPending}
                isReportLoading={reportTipMutation.isPending}
              />
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && (
        <TipForm
          checkpointKey={checkpointKey}
          onSubmit={handleCreateTip}
          isSubmitting={createTipMutation.isPending}
          isEligible={isEligible}
          isRateLimited={isRateLimited}
        />
      )}
    </section>
  );
}
