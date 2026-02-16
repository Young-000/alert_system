import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { RouteType } from '@infrastructure/api/commute-api.client';
import type { SelectedStop, SetupStep } from './types';
import { SortableStopItem } from './SortableStopItem';

interface AskMoreStepProps {
  routeType: RouteType;
  selectedStops: SelectedStop[];
  warning: string;
  onRemoveStop: (index: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onStepChange: (step: SetupStep) => void;
  getTransferInfo: (from: SelectedStop, to: SelectedStop) => string | null;
}

export function AskMoreStep({
  routeType,
  selectedStops,
  warning,
  onRemoveStop,
  onDragEnd,
  onStepChange,
  getTransferInfo,
}: AskMoreStepProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <section className="apple-step">
      <div className="apple-step-content">
        <h1 className="apple-question">다른 곳도<br />거쳐가시나요?</h1>

        {/* 현재까지 경로 표시 - 드래그앤드롭 */}
        <div className="apple-route-progress">
          <div className="progress-title">
            지금까지 경로
            {selectedStops.length > 1 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginLeft: '0.5rem' }}>
                (드래그로 순서 변경)
              </span>
            )}
          </div>
          <div className="progress-route">
            <span className="progress-point start">
              {routeType === 'morning' ? '집' : '회사'}
            </span>

            {/* Sortable stops */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={selectedStops.map(s => s.uniqueKey)}
                strategy={verticalListSortingStrategy}
              >
                {selectedStops.map((stop, i) => (
                  <SortableStopItem
                    key={stop.uniqueKey}
                    stop={stop}
                    index={i}
                    onRemove={onRemoveStop}
                    transferInfo={i > 0 ? getTransferInfo(selectedStops[i - 1], stop) : null}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="progress-segment">
              <div className="progress-line dashed" />
              <span className="progress-point end">
                {routeType === 'morning' ? '회사' : '집'}
              </span>
            </div>
          </div>
        </div>

        {/* 검증 경고 */}
        {warning && (
          <div className="route-validation-warning">
            {warning}
          </div>
        )}

        <div className="apple-choice-cards">
          <button
            type="button"
            className="apple-choice-card"
            onClick={() => onStepChange('select-transport')}
          >
            <span className="choice-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            <span className="choice-text">
              <strong>네, 더 있어요</strong>
              <span>환승하거나 다른 곳을 거쳐요</span>
            </span>
          </button>

          <button
            type="button"
            className="apple-choice-card primary"
            onClick={() => onStepChange('confirm')}
          >
            <span className="choice-icon" aria-hidden="true">✓</span>
            <span className="choice-text">
              <strong>아니요, 이게 끝이에요</strong>
              <span>바로 목적지로 가요</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
