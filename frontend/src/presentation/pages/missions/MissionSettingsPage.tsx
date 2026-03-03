import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useFocusTrap } from '@presentation/hooks/useFocusTrap';
import {
  useMissionsQuery,
  useCreateMissionMutation,
  useUpdateMissionMutation,
  useDeleteMissionMutation,
  useReorderMissionMutation,
  useToggleActiveMutation,
} from '@infrastructure/query';
import type { Mission, MissionType } from '@infrastructure/api';
import { MissionAddModal } from './MissionAddModal';

// ─── Constants ──────────────────────────────────────

const MAX_MISSIONS_PER_TYPE = 3;

const TYPE_CONFIG: Record<MissionType, { label: string; emoji: string }> = {
  commute: { label: '출근 미션', emoji: '🚌' },
  return: { label: '퇴근 미션', emoji: '🌙' },
};

// ─── Sub-components ─────────────────────────────────

function MissionCard({
  mission,
  isFirst,
  isLast,
  isToggling,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  mission: Mission;
  isFirst: boolean;
  isLast: boolean;
  isToggling: boolean;
  onToggle: (id: string) => void;
  onEdit: (mission: Mission) => void;
  onDelete: (mission: Mission) => void;
  onMoveUp: (mission: Mission) => void;
  onMoveDown: (mission: Mission) => void;
}): JSX.Element {
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isToggling) onToggle(mission.id);
    },
    [mission.id, onToggle, isToggling],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(mission);
    },
    [mission, onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(mission);
    },
    [mission, onDelete],
  );

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMoveUp(mission);
    },
    [mission, onMoveUp],
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMoveDown(mission);
    },
    [mission, onMoveDown],
  );

  return (
    <div className={`msettings-card ${!mission.isActive ? 'inactive' : ''} ${isToggling ? 'toggling' : ''}`}>
      {/* Reorder buttons */}
      <div className="msettings-card-reorder">
        <button
          type="button"
          className="msettings-reorder-btn"
          onClick={handleMoveUp}
          disabled={isFirst || isToggling}
          aria-label={`${mission.title} 위로 이동`}
        >
          <span aria-hidden="true">&#9650;</span>
        </button>
        <button
          type="button"
          className="msettings-reorder-btn"
          onClick={handleMoveDown}
          disabled={isLast || isToggling}
          aria-label={`${mission.title} 아래로 이동`}
        >
          <span aria-hidden="true">&#9660;</span>
        </button>
      </div>

      {/* Mission info */}
      <div className="msettings-card-info">
        <span className="msettings-card-emoji" aria-hidden="true">{mission.emoji}</span>
        <span className="msettings-card-title">{mission.title}</span>
      </div>

      {/* Actions */}
      <div className="msettings-card-actions">
        {/* Toggle switch */}
        <button
          type="button"
          className={`msettings-toggle ${mission.isActive ? 'active' : ''}`}
          onClick={handleToggle}
          disabled={isToggling}
          role="switch"
          aria-checked={mission.isActive}
          aria-label={`${mission.title} ${mission.isActive ? '비활성화' : '활성화'}`}
        >
          <span className="msettings-toggle-thumb" />
        </button>

        {/* Edit */}
        <button
          type="button"
          className="msettings-action-btn"
          onClick={handleEdit}
          disabled={isToggling}
          aria-label={`${mission.title} 수정`}
        >
          <span aria-hidden="true">✏️</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          className="msettings-action-btn msettings-action-delete"
          onClick={handleDelete}
          disabled={isToggling}
          aria-label={`${mission.title} 삭제`}
        >
          <span aria-hidden="true">🗑️</span>
        </button>
      </div>
    </div>
  );
}

function MissionTypeSection({
  type,
  missions,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAdd,
}: {
  type: MissionType;
  missions: Mission[];
  togglingId: string | null;
  onToggle: (id: string) => void;
  onEdit: (mission: Mission) => void;
  onDelete: (mission: Mission) => void;
  onMoveUp: (mission: Mission) => void;
  onMoveDown: (mission: Mission) => void;
  onAdd: (type: MissionType) => void;
}): JSX.Element {
  const config = TYPE_CONFIG[type];
  const isMaxReached = missions.length >= MAX_MISSIONS_PER_TYPE;

  return (
    <section className="msettings-section">
      <div className="msettings-section-header">
        <h2 className="msettings-section-title">
          {config.emoji} {config.label}
        </h2>
        <span className="msettings-section-count">
          {missions.length}/{MAX_MISSIONS_PER_TYPE}
        </span>
      </div>

      {missions.length === 0 ? (
        <div className="msettings-empty-section">
          <p className="msettings-empty-text">아직 미션이 없어요</p>
        </div>
      ) : (
        <div className="msettings-card-list">
          {missions.map((mission, index) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              isFirst={index === 0}
              isLast={index === missions.length - 1}
              isToggling={togglingId === mission.id}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="msettings-add-btn"
        onClick={() => onAdd(type)}
        disabled={isMaxReached}
        aria-label={isMaxReached ? `${config.label} 최대 ${MAX_MISSIONS_PER_TYPE}개` : `${config.label} 추가`}
      >
        {isMaxReached ? (
          <span className="msettings-add-label">최대 {MAX_MISSIONS_PER_TYPE}개까지 가능해요</span>
        ) : (
          <>
            <span className="msettings-add-icon" aria-hidden="true">+</span>
            <span className="msettings-add-label">미션 추가</span>
          </>
        )}
      </button>
    </section>
  );
}

// ─── Main Component ─────────────────────────────────

export function MissionSettingsPage(): JSX.Element {
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Queries
  const {
    data: missions,
    isLoading,
    error,
    refetch,
  } = useMissionsQuery();

  // Mutations
  const createMutation = useCreateMissionMutation();
  const updateMutation = useUpdateMissionMutation();
  const deleteMutation = useDeleteMissionMutation();
  const reorderMutation = useReorderMissionMutation();
  const toggleMutation = useToggleActiveMutation();

  // Local state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<MissionType>('commute');
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [deletingMission, setDeletingMission] = useState<Mission | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleCancelDelete = useCallback(() => {
    setDeletingMission(null);
    setDeleteError('');
  }, []);

  const deleteDialogRef = useFocusTrap({
    active: deletingMission !== null,
    onEscape: deleteMutation.isPending ? undefined : handleCancelDelete,
  });

  const togglingId = toggleMutation.isPending
    ? (toggleMutation.variables ?? null)
    : null;

  // Derived: group missions by type, sorted by sortOrder
  const commuteMissions = useMemo(() => {
    if (!missions) return [];
    return missions
      .filter((m) => m.missionType === 'commute')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [missions]);

  const returnMissions = useMemo(() => {
    if (!missions) return [];
    return missions
      .filter((m) => m.missionType === 'return')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [missions]);

  // ── Handlers ──

  const handleAdd = useCallback((type: MissionType) => {
    setModalType(type);
    setEditingMission(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((mission: Mission) => {
    setModalType(mission.missionType);
    setEditingMission(mission);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
    setEditingMission(null);
    setSaveError('');
  }, [createMutation.isPending, updateMutation.isPending]);

  const handleSave = useCallback(
    async (data: { title: string; emoji: string }) => {
      setSaveError('');
      try {
        if (editingMission) {
          await updateMutation.mutateAsync({
            id: editingMission.id,
            dto: { title: data.title, emoji: data.emoji },
          });
        } else {
          await createMutation.mutateAsync({
            title: data.title,
            emoji: data.emoji,
            missionType: modalType,
          });
        }
        setModalOpen(false);
        setEditingMission(null);
      } catch {
        setSaveError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    },
    [editingMission, modalType, createMutation, updateMutation],
  );

  const handleToggle = useCallback(
    (id: string) => {
      if (toggleMutation.isPending) return;
      toggleMutation.mutate(id);
    },
    [toggleMutation],
  );

  const handleDelete = useCallback((mission: Mission) => {
    setDeletingMission(mission);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingMission) return;
    setDeleteError('');
    try {
      await deleteMutation.mutateAsync(deletingMission.id);
      setDeletingMission(null);
    } catch {
      setDeleteError('삭제에 실패했습니다. 다시 시도해주세요.');
    }
  }, [deletingMission, deleteMutation]);

  const handleMoveUp = useCallback(
    (mission: Mission) => {
      const list = mission.missionType === 'commute' ? commuteMissions : returnMissions;
      const idx = list.findIndex((m) => m.id === mission.id);
      if (idx <= 0) return;
      const prevMission = list[idx - 1];
      // Swap sort orders
      reorderMutation.mutate({ id: mission.id, sortOrder: prevMission.sortOrder });
      reorderMutation.mutate({ id: prevMission.id, sortOrder: mission.sortOrder });
    },
    [commuteMissions, returnMissions, reorderMutation],
  );

  const handleMoveDown = useCallback(
    (mission: Mission) => {
      const list = mission.missionType === 'commute' ? commuteMissions : returnMissions;
      const idx = list.findIndex((m) => m.id === mission.id);
      if (idx < 0 || idx >= list.length - 1) return;
      const nextMission = list[idx + 1];
      reorderMutation.mutate({ id: mission.id, sortOrder: nextMission.sortOrder });
      reorderMutation.mutate({ id: nextMission.id, sortOrder: mission.sortOrder });
    },
    [commuteMissions, returnMissions, reorderMutation],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Auth required ──
  if (!userId) {
    return (
      <main className="page msettings-page">
        <div className="msettings-auth-required">
          <span className="msettings-auth-icon" aria-hidden="true">🔒</span>
          <p>로그인이 필요한 기능이에요</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/login')}>
            로그인
          </button>
        </div>
      </main>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <main className="page msettings-page">
        <header className="msettings-header">
          <button
            type="button"
            className="msettings-back"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
          >
            &lt;
          </button>
          <h1 className="msettings-title">미션 관리</h1>
        </header>
        <div className="msettings-skeleton">
          <div className="skeleton skeleton-card" style={{ height: 40 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 40 }} />
          <div className="skeleton skeleton-card" style={{ height: 40 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
        </div>
      </main>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <main className="page msettings-page">
        <header className="msettings-header">
          <button
            type="button"
            className="msettings-back"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
          >
            &lt;
          </button>
          <h1 className="msettings-title">미션 관리</h1>
        </header>
        <div className="msettings-error" role="alert">
          <p>데이터를 불러오는 데 실패했습니다.</p>
          <button
            type="button"
            className="btn-retry"
            onClick={() => void refetch()}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page msettings-page">
      {/* Header */}
      <header className="msettings-header">
        <button
          type="button"
          className="msettings-back"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          &lt;
        </button>
        <h1 className="msettings-title">미션 관리</h1>
      </header>

      {/* Description */}
      <p className="msettings-description">
        출퇴근 시간에 할 미션을 설정하세요. 각 유형별 최대 {MAX_MISSIONS_PER_TYPE}개까지 가능해요.
      </p>

      {/* Commute missions */}
      <MissionTypeSection
        type="commute"
        missions={commuteMissions}
        togglingId={togglingId}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onAdd={handleAdd}
      />

      {/* Return missions */}
      <MissionTypeSection
        type="return"
        missions={returnMissions}
        togglingId={togglingId}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onAdd={handleAdd}
      />

      {/* Add/Edit Modal */}
      <MissionAddModal
        key={modalOpen ? `modal-${editingMission?.id ?? 'new'}` : 'closed'}
        open={modalOpen}
        missionType={modalType}
        editingMission={editingMission}
        isLoading={isSaving}
        error={saveError}
        onSave={handleSave}
        onClose={handleCloseModal}
      />

      {/* Delete Confirm */}
      {deletingMission ? (
        <div
          className="msettings-modal-overlay"
          onClick={deleteMutation.isPending ? undefined : handleCancelDelete}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div
            ref={deleteDialogRef}
            className="msettings-confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-confirm-title" className="msettings-confirm-title">
              미션 삭제
            </h2>
            <p className="msettings-confirm-text">
              <span className="msettings-confirm-emoji" aria-hidden="true">{deletingMission.emoji}</span>
              &quot;{deletingMission.title}&quot;을 삭제할까요?
            </p>
            {deleteError ? (
              <p className="msettings-confirm-error" role="alert">{deleteError}</p>
            ) : null}
            <div className="msettings-confirm-actions">
              <button
                type="button"
                className="msettings-btn-cancel"
                onClick={handleCancelDelete}
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                type="button"
                className="msettings-btn-delete"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
