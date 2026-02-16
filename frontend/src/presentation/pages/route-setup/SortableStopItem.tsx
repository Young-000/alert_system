import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SelectedStop } from './types';

interface SortableStopItemProps {
  stop: SelectedStop;
  index: number;
  onRemove: (index: number) => void;
  transferInfo: string | null;
}

export const SortableStopItem = memo(function SortableStopItem({
  stop,
  index,
  onRemove,
  transferInfo,
}: SortableStopItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.uniqueKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-stop-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* 드래그 핸들 - 터치 영역 44px 이상 확보 */}
      <button
        type="button"
        className="drag-handle-btn"
        aria-label="순서 변경"
        {...attributes}
        {...listeners}
      >
        <span className="drag-handle-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></span>
      </button>
      <div className="sortable-stop-content">
        <span className="stop-icon" aria-hidden="true">
          {stop.transportMode === 'subway' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg>
          )}
        </span>
        <div className="stop-info">
          <span className="stop-name">{stop.name}</span>
          {stop.line && <span className="stop-line">{stop.line}</span>}
          {transferInfo && (
            <span className="transfer-badge">{transferInfo}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="sortable-stop-remove"
        onClick={() => onRemove(index)}
        aria-label={`${stop.name} 삭제`}
      >
        ×
      </button>
    </div>
  );
});
