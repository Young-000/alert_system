import { useState } from 'react';

interface LoadMoreButtonProps {
  onLoad: () => Promise<void>;
}

export function LoadMoreButton({ onLoad }: LoadMoreButtonProps): JSX.Element {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline btn-load-more"
      disabled={isLoadingMore}
      onClick={async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        try {
          await onLoad();
        } catch {
          // ignore load error
        } finally {
          setIsLoadingMore(false);
        }
      }}
    >
      {isLoadingMore ? '불러오는 중...' : '더 보기'}
    </button>
  );
}
