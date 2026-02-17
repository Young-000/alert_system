import { useState } from 'react';

interface LoadMoreButtonProps {
  onLoad: () => Promise<void>;
}

export function LoadMoreButton({ onLoad }: LoadMoreButtonProps): JSX.Element {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline btn-load-more"
        disabled={isLoadingMore}
        onClick={async () => {
          if (isLoadingMore) return;
          setIsLoadingMore(true);
          setLoadError('');
          try {
            await onLoad();
          } catch {
            setLoadError('불러오기에 실패했습니다. 다시 시도해주세요.');
          } finally {
            setIsLoadingMore(false);
          }
        }}
      >
        {isLoadingMore ? '불러오는 중...' : '더 보기'}
      </button>
      {loadError && (
        <p className="muted" role="alert" style={{ textAlign: 'center', color: 'var(--color-danger, #ef4444)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
          {loadError}
        </p>
      )}
    </div>
  );
}
