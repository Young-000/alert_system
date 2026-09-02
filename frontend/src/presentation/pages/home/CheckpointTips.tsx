import { useCallback, useState } from 'react';
import { getApiErrorStatus } from '@infrastructure/query/error-utils';
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
  const page = 1;
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, isError, refetch } = useCheckpointTips(checkpointKey, page);
  const createTipMutation = useCreateTip();
  const markHelpfulMutation = useMarkHelpful();
  const reportTipMutation = useReportTip();

  const handleCreateTip = useCallback(
    (cpKey: string, content: string, clearForm: () => void): void => {
      setSubmitError('');
      createTipMutation.mutate(
        { checkpointKey: cpKey, content },
        {
          onSuccess: () => {
            clearForm();
          },
          onError: (error) => {
            // 429 rate limit error
            const status = getApiErrorStatus(error);
            if (status === 429 || (status === null && error.message.includes('Too Many'))) {
              setIsRateLimited(true);
            } else {
              // 500/네트워크 등 그 외 실패 — 조용히 무시하지 말고 사용자에게 알림 (입력은 보존됨)
              setSubmitError('팁 등록에 실패했어요. 잠시 후 다시 시도해주세요.');
            }
          },
        },
      );
    },
    [createTipMutation],
  );

  const handleHelpful = useCallback(
    (tipId: string): void => {
      setActionError('');
      markHelpfulMutation.mutate(tipId, {
        onError: () => {
          setActionError('처리에 실패했어요. 다시 시도해주세요.');
        },
      });
    },
    [markHelpfulMutation],
  );

  const handleReport = useCallback(
    (tipId: string): void => {
      setActionError('');
      reportTipMutation.mutate(tipId, {
        onError: () => {
          setActionError('신고에 실패했어요. 다시 시도해주세요.');
        },
      });
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

      {actionError && (
        <div className="tips-action-error" role="alert">
          {actionError}
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
          errorMessage={submitError}
        />
      )}
    </section>
  );
}
