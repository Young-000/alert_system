import type { SharedRouteData } from './types';

interface SharedRouteBannerProps {
  sharedRoute: SharedRouteData;
  isSaving: boolean;
  onImport: () => void;
  onDismiss: () => void;
}

export function SharedRouteBanner({
  sharedRoute,
  isSaving,
  onImport,
  onDismiss,
}: SharedRouteBannerProps): JSX.Element {
  return (
    <div className="shared-route-banner">
      <div className="shared-route-info">
        <strong>공유 경로</strong>
        <span>{sharedRoute.name}</span>
        <span className="muted">{sharedRoute.checkpoints.map(c => c.name).join(' → ')}</span>
      </div>
      <div className="shared-route-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onImport}
          disabled={isSaving}
        >
          {isSaving ? '저장 중...' : '내 경로에 추가'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onDismiss}
        >
          무시
        </button>
      </div>
    </div>
  );
}
