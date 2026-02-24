import { useCallback, useState } from 'react';
import { useAuth } from '@presentation/hooks/useAuth';
import {
  usePlacesQuery,
  useCreatePlaceMutation,
  useDeletePlaceMutation,
  useTogglePlaceMutation,
} from '@infrastructure/query';
import type { Place, PlaceType } from '@infrastructure/api';

const PLACE_ICONS: Record<PlaceType, string> = { home: '🏠', work: '🏢' };
const PLACE_LABELS: Record<PlaceType, string> = { home: '집', work: '직장' };

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
  const { data: places, isLoading } = usePlacesQuery(!!userId);
  const createMutation = useCreatePlaceMutation();
  const deleteMutation = useDeletePlaceMutation();
  const toggleMutation = useTogglePlaceMutation();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<PlaceType>('home');
  const [formLabel, setFormLabel] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!formLabel.trim()) return;
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
    } catch {
      alert('장소 등록에 실패했습니다.');
    }
  }, [formLabel, formType, formAddress, createMutation]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 장소를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      alert('장소 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }, [deleteMutation]);

  const handleToggle = useCallback((id: string) => {
    toggleMutation.mutate(id);
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
      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">내 장소</h2>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '취소' : '+ 추가'}
          </button>
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
                <option value="home">🏠 집</option>
                <option value="work">🏢 직장</option>
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

        {!places || places.length === 0 ? (
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
                onDelete={handleDelete}
                isDeleting={deletingId === place.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
