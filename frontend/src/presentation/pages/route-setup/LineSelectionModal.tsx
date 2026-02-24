import { useFocusTrap } from '@presentation/hooks/use-focus-trap';
import type { GroupedStation } from './types';

interface LineSelectionModalProps {
  station: GroupedStation;
  onSelect: (stationName: string, line: string, stationId: string) => void;
  onClose: () => void;
}

export function LineSelectionModal({
  station,
  onSelect,
  onClose,
}: LineSelectionModalProps): JSX.Element {
  const trapRef = useFocusTrap({
    active: true,
    onEscape: onClose,
  });

  return (
    <div
      className="line-selection-modal"
      role="dialog"
      aria-modal="true"
      aria-label="호선 선택"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="line-selection-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{station.name}역</h3>
        <p style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          어떤 호선을 이용하세요?
        </p>
        <div className="line-selection-list">
          {station.lines.map(({ line, id }) => (
            <button
              key={id}
              type="button"
              className="line-selection-btn"
              onClick={() => onSelect(station.name, line, id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>
              <span>{line}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="line-selection-cancel"
          onClick={onClose}
        >
          취소
        </button>
      </div>
    </div>
  );
}
