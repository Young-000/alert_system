import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useRoutesQuery } from '@infrastructure/query';
import {
  useSmartDepartureSettingsQuery,
  useCreateSmartDepartureMutation,
  useDeleteSmartDepartureMutation,
  useToggleSmartDepartureMutation,
} from '@infrastructure/query';
import { getApiErrorMessage } from '@infrastructure/query/error-utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { LoadErrorNotice } from '../../components/LoadErrorNotice';
import type { SmartDepartureSetting, DepartureType } from '@infrastructure/api';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE_LABELS: Record<DepartureType, string> = { commute: '출근', return: '퇴근' };
const TYPE_ICONS: Record<DepartureType, string> = { commute: '🌅', return: '🌇' };

/** 등록 가능한 유형은 이 둘뿐이다. 사용자당 유형별 1개까지만 서버가 받는다. */
const DEPARTURE_TYPE_ORDER: DepartureType[] = ['commute', 'return'];

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
  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useSmartDepartureSettingsQuery(!!userId);
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    isError: isRoutesError,
    refetch: refetchRoutes,
  } = useRoutesQuery(userId || '');
  // 경로 응답 전에는 빈 상태를 확정할 수 없다 — 경로가 있는 사용자에게
  // "먼저 경로를 등록해주세요"가 잘못 스쳐 보이기 때문이다.
  const isLoading = isLoadingSettings || isLoadingRoutes;
  // 같은 이유로 조회가 실패한 뒤에도 빈 상태를 확정하면 안 된다.
  // 둘 중 어느 쪽이 실패해도 화면은 사실과 다른 빈 상태를 그리게 된다.
  const isLoadError = isSettingsError || isRoutesError;
  const retryLoad = useCallback(() => {
    if (isSettingsError) void refetchSettings();
    if (isRoutesError) void refetchRoutes();
  }, [isSettingsError, isRoutesError, refetchSettings, refetchRoutes]);
  const createMutation = useCreateSmartDepartureMutation();
  const deleteMutation = useDeleteSmartDepartureMutation();
  const toggleMutation = useToggleSmartDepartureMutation();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<DepartureType>('commute');
  const [formRouteId, setFormRouteId] = useState('');
  const [formTarget, setFormTarget] = useState('09:00');
  const [formPrep, setFormPrep] = useState(15);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [actionError, setActionError] = useState('');

  const routeMap = new Map((routes ?? []).map((r) => [r.id, r.name]));

  // 서버는 같은 departureType이 이미 있으면 409로 거절한다
  // (manage-smart-departure.use-case.ts createSetting). 유형이 출근·퇴근 둘뿐이라
  // 이미 등록한 유형을 고를 수 있게 두면 제출이 반드시 실패한다.
  const availableTypes = DEPARTURE_TYPE_ORDER.filter(
    (type) => !settings?.some((s) => s.departureType === type),
  );

  // 조회에 실패하면 settings가 undefined라 두 유형 다 열린다. 무엇이 등록돼
  // 있는지 모르는 상태에서는 등록을 권하지 않는다.
  const canAddMore = !isLoadError && availableTypes.length > 0;

  const handleToggleForm = useCallback(() => {
    setShowForm((prev) => {
      if (prev) return false;
      // 'commute' 고정 기본값은 출근을 이미 등록한 사용자에게 그대로 409를 안긴다.
      setFormType(availableTypes[0] ?? 'commute');
      return true;
    });
  }, [availableTypes]);

  const handleCreate = useCallback(async () => {
    const routeId = formRouteId || routes?.[0]?.id;
    if (!routeId) {
      setActionError('먼저 경로를 등록해주세요.');
      return;
    }
    setActionError('');
    try {
      await createMutation.mutateAsync({
        routeId,
        departureType: formType,
        arrivalTarget: formTarget,
        prepTimeMinutes: formPrep,
        activeDays: [1, 2, 3, 4, 5], // Mon-Fri default
      });
      setShowForm(false);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, '스마트 출발 설정에 실패했습니다.'));
    }
  }, [formRouteId, formType, formTarget, formPrep, routes, createMutation]);

  const handleDeleteClick = useCallback((id: string) => {
    const setting = settings?.find((s) => s.id === id);
    const label = setting
      ? `${TYPE_LABELS[setting.departureType]} ${setting.arrivalTarget}`
      : '설정';
    setDeleteTarget({ id, label });
  }, [settings]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError('');
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      // 생성(:159)과 같은 계약: 서버가 준 사유를 그대로 올린다.
      // 고정 문구로 덮으면 이미 지워진 설정(404)에도 "다시 시도"로 읽힌다.
      setActionError(getApiErrorMessage(err, '삭제에 실패했습니다.'));
    } finally {
      setDeletingId(null);
    }
  }, [deleteTarget, deleteMutation]);

  // 생성·삭제와 같은 계약: 실패하면 actionError로 표면화한다.
  // 전역 MutationCache.onError는 텔레메트리 로깅만 하므로 여기서 알리지 않으면
  // 켜고 끈 결과가 서버에 반영되지 않은 채 화면만 그대로 남는다.
  const handleToggle = useCallback((id: string) => {
    if (toggleMutation.isPending) return;
    setActionError('');
    toggleMutation.mutate(id, {
      onError: () => setActionError('설정 상태 변경에 실패했습니다.'),
    });
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
      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">스마트 출발</h2>
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
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                  </option>
                ))}
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
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  setFormPrep(isNaN(parsed) ? 15 : parsed);
                }}
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

        {isLoadError ? (
          <LoadErrorNotice
            message="스마트 출발 설정을 불러오지 못했습니다."
            onRetry={retryLoad}
          />
        ) : !routes || routes.length === 0 ? (
          <div className="settings-empty">
            <span aria-hidden="true">🗺️</span>
            <p>먼저 경로를 등록해주세요</p>
            <Link to="/routes" className="btn btn-primary btn-sm">
              경로 등록하러 가기
            </Link>
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

      <ConfirmModal
        open={!!deleteTarget}
        title="스마트 출발 설정 삭제"
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isLoading={!!deletingId}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      >
        <p><strong>{deleteTarget?.label}</strong> 설정을 삭제하시겠습니까?</p>
      </ConfirmModal>
    </div>
  );
}
