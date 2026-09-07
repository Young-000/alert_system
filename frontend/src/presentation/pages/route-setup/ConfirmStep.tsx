import type { RouteType } from '@infrastructure/api/commute-api.client';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { SelectedStop, SetupStep } from './types';
import type { ValidationResult } from './types';

interface ConfirmStepProps {
  routeType: RouteType;
  selectedStops: SelectedStop[];
  editingRoute: RouteResponse | null;
  routeName: string;
  defaultRouteName: string;
  createReverse: boolean;
  isSaving: boolean;
  error: string;
  validation: ValidationResult;
  onRouteNameChange: (name: string) => void;
  onCreateReverseChange: (checked: boolean) => void;
  onSave: () => void;
  onStepChange: (step: SetupStep) => void;
  getTransferInfo: (from: SelectedStop, to: SelectedStop) => string | null;
}

export function ConfirmStep({
  routeType,
  selectedStops,
  editingRoute,
  routeName,
  defaultRouteName,
  createReverse,
  isSaving,
  error,
  validation,
  onRouteNameChange,
  onCreateReverseChange,
  onSave,
  onStepChange,
  getTransferInfo,
}: ConfirmStepProps): JSX.Element {
  return (
    <section className="apple-step">
      <div className="apple-step-content">
        <h1 className="apple-question">{editingRoute ? <>수정된 경로를<br />확인해주세요</> : <>이 경로가<br />맞나요?</>}</h1>

        {/* 개선된 경로 미리보기 패널 */}
        <div className="route-preview-panel">
          <div className="preview-panel-header">
            <span className="preview-type-badge">
              {routeType === 'morning' ? '출근 경로' : '퇴근 경로'}
            </span>
            <span className="preview-stop-count">{selectedStops.length + 2}개 정류장</span>
          </div>

          {/* 시각적 경로 표시 */}
          <div className="route-visual-enhanced">
            {/* 시작점 */}
            <div className="preview-stop start">
              <div className="stop-marker">
                <span className="marker-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
                <span className="marker-line" />
              </div>
              <div className="stop-details">
                <span className="stop-name-main">{routeType === 'morning' ? '집' : '회사'}</span>
                <span className="stop-transport">도보로 이동</span>
              </div>
            </div>

            {/* 중간 정류장들 */}
            {selectedStops.map((stop, i) => {
              const transferInfo = i > 0 ? getTransferInfo(selectedStops[i - 1], stop) : null;

              return (
                <div key={stop.uniqueKey} className="preview-stop middle">
                  <div className="stop-marker">
                    <span className="marker-icon" aria-hidden="true">
                      {stop.transportMode === 'subway' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg>
                      )}
                    </span>
                    <span className="marker-line" />
                  </div>
                  <div className="stop-details">
                    <span className="stop-name-main">{stop.name}</span>
                    {stop.line && <span className="stop-line-info">{stop.line}</span>}
                    {transferInfo && (
                      <span className="stop-transfer-badge">{transferInfo} 환승</span>
                    )}
                    <span className="stop-transport">
                      {stop.transportMode === 'subway' ? '지하철' : '버스'}로 이동
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 도착점 */}
            <div className="preview-stop end">
              <div className="stop-marker">
                <span className="marker-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
              </div>
              <div className="stop-details">
                <span className="stop-name-main">{routeType === 'morning' ? '회사' : '집'}</span>
                <span className="stop-complete">도착!</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="preview-edit-btn"
            onClick={() => onStepChange('ask-more')}
          >
            경로 수정하기
          </button>
        </div>

        {/* 경로 이름 입력 */}
        <div className="route-name-input">
          <label htmlFor="route-name-field">경로 이름 (선택)</label>
          <input
            id="route-name-field"
            type="text"
            placeholder={defaultRouteName}
            value={routeName}
            onChange={(e) => onRouteNameChange(e.target.value)}
            maxLength={30}
            className="route-name-field"
          />
          <span className="char-count">{routeName.length}/30</span>
        </div>

        {/* 퇴근 경로 자동 생성 옵션 */}
        {routeType === 'morning' && (
          <label className="reverse-route-option">
            <input
              type="checkbox"
              checked={createReverse}
              onChange={(e) => onCreateReverseChange(e.target.checked)}
            />
            <span>퇴근 경로도 자동으로 만들기 (역순)</span>
          </label>
        )}

        <div className="apple-info-card">
          <span className="info-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
          <p>소요시간은 실제 출퇴근을 기록하면서 자동으로 측정됩니다</p>
        </div>

        {/*
          저장이 막힌 이유를 이 화면이 직접 말한다.

          `validation.errors`를 읽는 곳은 원래 `handleSave` 하나뿐이었는데, 저장 버튼이
          `!validation.isValid`로 disabled라 그 코드는 실행될 수가 없다. 정류장을 고를
          때는 검증을 통과한 것만 목록에 들어가지만, 그 뒤에 목록을 바꾸는 세 경로
          (삭제·드래그 순서 변경·기존 경로 수정 진입)는 검증을 다시 태우지 않는다.
          예: 환승역을 지우면 앞뒤 구간이 이어지지 않아 여기서 저장이 막히는데,
          화면에는 눌리지 않는 버튼만 남아 이유도 다음 행동도 없었다.

          사유는 첫 줄만 그린다 — 인접 중복은 중복 검사와 연속 구간 검사에 동시에
          걸려 같은 말이 두 줄로 쌓인다. 페이지의 `error`가 이미 있으면 그쪽을 우선한다.
        */}
        {error ? (
          <div className="apple-error" role="alert">{error}</div>
        ) : (
          !validation.isValid && validation.errors.length > 0 && (
            <div className="apple-error" role="alert">{validation.errors[0]}</div>
          )
        )}
      </div>

      <div className="apple-step-footer">
        <button
          type="button"
          className="apple-btn-primary apple-btn-full"
          onClick={onSave}
          disabled={isSaving || !validation.isValid}
        >
          {getSaveButtonLabel(isSaving, !!editingRoute, routeType, createReverse)}
        </button>
      </div>
    </section>
  );
}

function getSaveButtonLabel(
  isSaving: boolean,
  isEditing: boolean,
  routeType: RouteType,
  createReverse: boolean,
): string {
  if (isSaving) return '저장 중...';
  if (isEditing) return '수정 완료';
  if (routeType === 'morning' && createReverse) return '경로 2개 저장';
  return '경로 저장';
}
