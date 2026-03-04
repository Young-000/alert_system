import { useCallback, useState } from 'react';
import { useAuth } from '@presentation/hooks/useAuth';
import { useRoutesQuery } from '@infrastructure/query';
import {
  useSmartDepartureSettingsQuery,
  useCreateSmartDepartureMutation,
  useDeleteSmartDepartureMutation,
  useToggleSmartDepartureMutation,
} from '@infrastructure/query';
import type { SmartDepartureSetting, DepartureType } from '@infrastructure/api';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE_LABELS: Record<DepartureType, string> = { commute: '출근', return: '퇴근' };
const TYPE_ICONS: Record<DepartureType, string> = { commute: '🌅', return: '🌇' };

function SettingCard({
  setting,
  routeName,
  onToggle,
  onDelete,
  isDeleting,
}: {
  setting: SmartDepartureSetting;
  routeName: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const activeDayLabels = setting.activeDays
    .map((d) => DAY_LABELS[d])
    .join(', ');

  return (
    <div className={`settings-departure-card ${!setting.isEnabled ? 'inactive' : ''}`}>
      <div className="settings-departure-header">
        <span className="settings-departure-icon" aria-hidden="true">
          {TYPE_ICONS[setting.departureType]}
        </span>
        <div className="settings-departure-info">
          <span className="settings-departure-type">
            {TYPE_LABELS[setting.departureType]}
          </span>
          <span className="settings-departure-target">
            {setting.arrivalTarget} 도착 목표
          </span>
        </div>
        <button
          type="button"
          className={`settings-toggle-btn ${setting.isEnabled ? 'active' : ''}`}
          onClick={() => onToggle(setting.id)}
          aria-label={`${TYPE_LABELS[setting.departureType]} ${setting.isEnabled ? '비활성화' : '활성화'}`}
        >
          {setting.isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="settings-departure-details">
        <span>경로: {routeName}</span>
        <span>준비시간: {setting.prepTimeMinutes}분</span>
        <span>요일: {activeDayLabels}</span>
        {setting.preAlerts.length > 0 && (
          <span>사전 알림: {setting.preAlerts.join(', ')}분 전</span>
        )}
      </div>
      <button
        type="button"
        className="settings-delete-btn"
        onClick={() => onDelete(setting.id)}
        disabled={isDeleting}
      >
        삭제
      </button>
    </div>
  );
}

export function SmartDepartureTab(): JSX.Element {
  const { userId } = useAuth();
  const { data: settings, isLoading } = useSmartDepartureSettingsQuery(!!userId);
  const { data: routes } = useRoutesQuery(userId || '');
  const createMutation = useCreateSmartDepartureMutation();
  const deleteMutation = useDeleteSmartDepartureMutation();
  const toggleMutation = useToggleSmartDepartureMutation();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<DepartureType>('commute');
  const [formRouteId, setFormRouteId] = useState('');
  const [formTarget, setFormTarget] = useState('09:00');
  const [formPrep, setFormPrep] = useState(15);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const routeMap = new Map((routes ?? []).map((r) => [r.id, r.name]));

  const handleCreate = useCallback(async () => {
    const routeId = formRouteId || routes?.[0]?.id;
    if (!routeId) {
      setActionError('먼저 경로를 등록해주세요.');
      setTimeout(() => setActionError(''), 3000);
      return;
    }
    try {
      await createMutation.mutateAsync({
        routeId,
        departureType: formType,
        arrivalTarget: formTarget,
        prepTimeMinutes: formPrep,
        activeDays: [1, 2, 3, 4, 5], // Mon-Fri default
      });
      setShowForm(false);
    } catch {
      setActionError('스마트 출발 설정에 실패했습니다.');
      setTimeout(() => setActionError(''), 3000);
    }
  }, [formRouteId, formType, formTarget, formPrep, routes, createMutation]);

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deleteMutation.mutateAsync(confirmDeleteId);
    } catch {
      setActionError('삭제에 실패했습니다.');
      setTimeout(() => setActionError(''), 3000);
    } finally {
      setDeletingId(null);
    }
  }, [confirmDeleteId, deleteMutation]);

  const handleToggle = useCallback((id: string) => {
    toggleMutation.mutate(id);
  }, [toggleMutation]);

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-departure" aria-labelledby="tab-departure">
        <div className="settings-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-departure" aria-labelledby="tab-departure">
      {actionError && (
        <div className="notice error" role="alert">{actionError}</div>
      )}
      {confirmDeleteId && (
        <div className="confirm-modal-overlay" role="dialog" aria-label="삭제 확인">
          <div className="confirm-modal">
            <p>이 스마트 출발 설정을 삭제하시겠습니까?</p>
            <div className="confirm-modal-actions">
              <button type="button" className="btn" onClick={() => setConfirmDeleteId(null)}>취소</button>
              <button type="button" className="btn btn-danger" onClick={() => void handleDeleteConfirm()}>삭제</button>
            </div>
          </div>
        </div>
      )}
      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">스마트 출발</h2>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '취소' : '+ 추가'}
          </button>
        </div>

        <p className="settings-section-desc">
          도착 목표 시간을 설정하면 날씨, 교통 상황을 고려한 최적 출발 시간을 알려드립니다.
        </p>

        {showForm && (
          <div className="settings-departure-form">
            <div className="settings-form-row">
              <label htmlFor="dep-type">유형</label>
              <select
                id="dep-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as DepartureType)}
              >
                <option value="commute">🌅 출근</option>
                <option value="return">🌇 퇴근</option>
              </select>
            </div>
            {routes && routes.length > 0 && (
              <div className="settings-form-row">
                <label htmlFor="dep-route">경로</label>
                <select
                  id="dep-route"
                  value={formRouteId || routes[0]?.id || ''}
                  onChange={(e) => setFormRouteId(e.target.value)}
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="settings-form-row">
              <label htmlFor="dep-target">도착 목표 시간</label>
              <input
                id="dep-target"
                type="time"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
              />
            </div>
            <div className="settings-form-row">
              <label htmlFor="dep-prep">준비 시간 (분)</label>
              <input
                id="dep-prep"
                type="number"
                min={10}
                max={60}
                value={formPrep}
                onChange={(e) => setFormPrep(parseInt(e.target.value) || 15)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '설정 중...' : '설정 저장'}
            </button>
          </div>
        )}

        {!routes || routes.length === 0 ? (
          <div className="settings-empty">
            <span aria-hidden="true">🗺️</span>
            <p>먼저 경로를 등록해주세요</p>
          </div>
        ) : !settings || settings.length === 0 ? (
          <div className="settings-empty">
            <span aria-hidden="true">⏰</span>
            <p>등록된 스마트 출발 설정이 없습니다</p>
          </div>
        ) : (
          <div className="settings-departure-list">
            {settings.map((setting) => (
              <SettingCard
                key={setting.id}
                setting={setting}
                routeName={routeMap.get(setting.routeId) ?? '알 수 없는 경로'}
                onToggle={handleToggle}
                onDelete={handleDeleteClick}
                isDeleting={deletingId === setting.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
