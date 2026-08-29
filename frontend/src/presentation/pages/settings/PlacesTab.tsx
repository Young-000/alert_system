import { useCallback, useState } from 'react';
import { useAuth } from '@presentation/hooks/useAuth';
import {
  usePlacesQuery,
  useCreatePlaceMutation,
  useDeletePlaceMutation,
  useTogglePlaceMutation,
} from '@infrastructure/query';
import { getApiErrorMessage } from '@infrastructure/query/error-utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { LoadErrorNotice } from '../../components/LoadErrorNotice';
import type { Place, PlaceType } from '@infrastructure/api';

const PLACE_ICONS: Record<PlaceType, string> = { home: '🏠', work: '🏢' };
const PLACE_LABELS: Record<PlaceType, string> = { home: '집', work: '직장' };

/** 등록 가능한 유형은 이 둘뿐이다. 사용자당 유형별 1개까지만 서버가 받는다. */
const PLACE_TYPE_ORDER: PlaceType[] = ['home', 'work'];

function PlaceCard({
  place,
  onToggle,
  onDelete,
  isDeleting: isDeletingProp,
}: {
  place: Place;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className={`settings-place-card ${!place.isActive ? 'inactive' : ''}`}>
      <div className="settings-place-left">
        <span className="settings-place-icon" aria-hidden="true">
          {PLACE_ICONS[place.placeType as PlaceType] ?? '📍'}
        </span>
        <div className="settings-place-info">
          <div className="settings-place-name">
            <span>{place.label}</span>
            <span className="settings-place-type">
              {PLACE_LABELS[place.placeType as PlaceType] ?? place.placeType}
            </span>
          </div>
          {place.address && (
            <p className="settings-place-address">{place.address}</p>
          )}
          <span className="settings-place-radius">반경 {place.radiusM}m</span>
        </div>
      </div>
      <div className="settings-place-actions">
        <button
          type="button"
          className={`settings-toggle-btn ${place.isActive ? 'active' : ''}`}
          onClick={() => onToggle(place.id)}
          aria-label={`${place.label} ${place.isActive ? '비활성화' : '활성화'}`}
        >
          {place.isActive ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          className="settings-delete-btn"
          onClick={() => onDelete(place.id)}
          disabled={isDeletingProp}
          aria-label={`${place.label} 삭제`}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export function PlacesTab(): JSX.Element {
  const { userId } = useAuth();
  const { data: places, isLoading, isError, refetch } = usePlacesQuery(!!userId);
  const createMutation = useCreatePlaceMutation();
  const deleteMutation = useDeletePlaceMutation();
  const toggleMutation = useTogglePlaceMutation();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<PlaceType>('home');
  const [formLabel, setFormLabel] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [actionError, setActionError] = useState('');

  // 서버는 같은 유형이 이미 있으면 409로 거절한다(manage-places.use-case.ts createPlace).
  // 유형이 집·직장 둘뿐이라, 이미 등록한 유형을 고를 수 있게 두면 제출이 반드시 실패한다.
  const availableTypes = PLACE_TYPE_ORDER.filter(
    (type) => !places?.some((p) => p.placeType === type),
  );

  // 조회에 실패하면 places가 undefined라 availableTypes가 두 개 다 열린다.
  // 무엇이 등록돼 있는지 모르는 상태에서는 등록을 권하지 않는다 — 이미 둘 다
  // 등록해 둔 사용자를 실패가 예정된 폼으로 밀어 넣게 된다.
  const canAddMore = !isError && availableTypes.length > 0;

  const handleToggleForm = useCallback(() => {
    setShowForm((prev) => {
      if (prev) return false;
      // 폼을 열 때마다 고를 수 있는 유형으로 맞춘다. 'home' 고정 기본값은
      // 집을 이미 등록한 사용자에게 그대로 409를 안긴다.
      setFormType(availableTypes[0] ?? 'home');
      return true;
    });
  }, [availableTypes]);

  const handleCreate = useCallback(async () => {
    if (!formLabel.trim()) return;
    setActionError('');
    try {
      await createMutation.mutateAsync({
        placeType: formType,
        label: formLabel.trim(),
        latitude: 37.5665, // Default Seoul coordinates
        longitude: 126.978,
        address: formAddress.trim() || undefined,
      });
      setFormLabel('');
      setFormAddress('');
      setShowForm(false);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, '장소 등록에 실패했습니다.'));
    }
  }, [formLabel, formType, formAddress, createMutation]);

  const handleDeleteClick = useCallback((id: string) => {
    const place = places?.find((p) => p.id === id);
    setDeleteTarget({ id, label: place?.label ?? '장소' });
  }, [places]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError('');
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setActionError('장소 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }, [deleteTarget, deleteMutation]);

  // 등록·삭제와 같은 계약: 실패하면 actionError로 표면화한다.
  // 전역 MutationCache.onError는 텔레메트리 로깅만 하므로 여기서 알리지 않으면
  // 사용자에게는 "눌렀는데 아무 일도 안 일어남"으로만 보인다.
  const handleToggle = useCallback((id: string) => {
    if (toggleMutation.isPending) return;
    setActionError('');
    toggleMutation.mutate(id, {
      onError: () => setActionError('장소 상태 변경에 실패했습니다.'),
    });
  }, [toggleMutation]);

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-places" aria-labelledby="tab-places">
        <div className="settings-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>장소 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-places" aria-labelledby="tab-places">
      {actionError && (
        <div className="notice error" role="alert">{actionError}</div>
      )}
      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">내 장소</h2>
          {(canAddMore || showForm) && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleToggleForm}
            >
              {showForm ? '취소' : '+ 추가'}
            </button>
          )}
        </div>

        <p className="settings-section-desc">
          집과 직장을 등록하면 출퇴근 자동 감지에 사용됩니다.
        </p>

        {showForm && (
          <div className="settings-place-form">
            <div className="settings-form-row">
              <label htmlFor="place-type">유형</label>
              <select
                id="place-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as PlaceType)}
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {PLACE_ICONS[type]} {PLACE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-form-row">
              <label htmlFor="place-label">이름</label>
              <input
                id="place-label"
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="예: 우리집, 강남 사무실"
                maxLength={100}
              />
            </div>
            <div className="settings-form-row">
              <label htmlFor="place-address">주소 (선택)</label>
              <input
                id="place-address"
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="서울시 강남구..."
                maxLength={500}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCreate()}
              disabled={!formLabel.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? '등록 중...' : '장소 등록'}
            </button>
          </div>
        )}

        {/* 조회 실패는 data=undefined로 들어온다. 그대로 빈 상태를 그리면
            등록해 둔 집·직장이 지워진 것처럼 보이므로 실패는 실패라고 말한다. */}
        {isError ? (
          <LoadErrorNotice
            message="장소를 불러오지 못했습니다."
            onRetry={() => void refetch()}
          />
        ) : !places || places.length === 0 ? (
          <div className="settings-empty">
            <span aria-hidden="true">📍</span>
            <p>등록된 장소가 없습니다</p>
          </div>
        ) : (
          <div className="settings-place-list">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onToggle={handleToggle}
                onDelete={handleDeleteClick}
                isDeleting={deletingId === place.id}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        open={!!deleteTarget}
        title="장소 삭제"
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isLoading={!!deletingId}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      >
        <p><strong>{deleteTarget?.label}</strong>을(를) 삭제하시겠습니까?</p>
      </ConfirmModal>
    </div>
  );
}
