import { useState } from 'react';
import type { CommunityTip } from '@infrastructure/api/commute-api.client';

interface TipCardProps {
  tip: CommunityTip;
  onHelpful: (tipId: string) => void;
  onReport: (tipId: string) => void;
  isHelpfulLoading?: boolean;
  isReportLoading?: boolean;
}

/** Returns a human-readable Korean relative time string. */
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export function TipCard({
  tip,
  onHelpful,
  onReport,
  isHelpfulLoading = false,
  isReportLoading = false,
}: TipCardProps): JSX.Element {
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  const handleReportClick = (): void => {
    if (tip.isReportedByMe) return;
    setShowReportConfirm(true);
  };

  const handleReportConfirm = (): void => {
    onReport(tip.id);
    setShowReportConfirm(false);
  };

  return (
    <div className="tip-card" data-testid={`tip-card-${tip.id}`}>
      <p className="tip-card-content">{tip.content}</p>
      <div className="tip-card-footer">
        <span className="tip-card-meta">{formatRelativeTime(tip.createdAt)}</span>
        <div className="tip-card-actions">
          <button
            type="button"
            className={`tip-action-btn ${tip.isHelpfulByMe ? 'tip-action-btn--active' : ''}`}
            onClick={() => onHelpful(tip.id)}
            disabled={isHelpfulLoading}
            aria-label={tip.isHelpfulByMe ? '도움이 됐어요 취소' : '도움이 됐어요'}
            aria-pressed={tip.isHelpfulByMe}
          >
            {tip.isHelpfulByMe ? '\u{1F44D}' : '\u{1F44D}'} {tip.helpfulCount > 0 && tip.helpfulCount}
          </button>

          {showReportConfirm ? (
            <span className="tip-card-actions" role="group" aria-label="신고 확인">
              <button
                type="button"
                className="tip-action-btn tip-action-btn--report"
                onClick={handleReportConfirm}
                disabled={isReportLoading}
              >
                확인
              </button>
              <button
                type="button"
                className="tip-action-btn"
                onClick={() => setShowReportConfirm(false)}
              >
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={`tip-action-btn ${
                tip.isReportedByMe ? 'tip-action-btn--reported' : 'tip-action-btn--report'
              }`}
              onClick={handleReportClick}
              disabled={tip.isReportedByMe || isReportLoading}
              aria-label={tip.isReportedByMe ? '이미 신고한 팁' : '이 팁 신고하기'}
            >
              {tip.isReportedByMe ? '신고됨' : '신고'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
