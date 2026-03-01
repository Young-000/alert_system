import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { Alert } from '@infrastructure/api';
import type { SharedRouteData } from './types';
import { RouteCard } from './RouteCard';
import { SharedRouteBanner } from './SharedRouteBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PageHeader } from '../../components/PageHeader';

interface RouteListViewProps {
  sortedRoutes: RouteResponse[];
  filteredRoutes: RouteResponse[];
  userAlerts: Alert[];
  routeTab: 'all' | 'morning' | 'evening';
  sharedRoute: SharedRouteData | null;
  userId: string;
  isSaving: boolean;
  deleteTarget: { id: string; name: string } | null;
  isDeleting: boolean;
  loadError?: string;
  onRetryLoad?: () => void;
  onTabChange: (tab: 'all' | 'morning' | 'evening') => void;
  onStartCreating: () => void;
  onEditRoute: (route: RouteResponse) => void;
  onDeleteClick: (route: RouteResponse) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onImportSharedRoute: () => void;
  onDismissSharedRoute: () => void;
}

export function RouteListView({
  sortedRoutes,
  filteredRoutes,
  userAlerts,
  routeTab,
  sharedRoute,
  userId,
  isSaving,
  deleteTarget,
  isDeleting,
  loadError,
  onRetryLoad,
  onTabChange,
  onStartCreating,
  onEditRoute,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onImportSharedRoute,
  onDismissSharedRoute,
}: RouteListViewProps): JSX.Element {
  const getRouteAlertCount = (routeId: string): number =>
    userAlerts.filter(a => a.routeId === routeId && a.enabled).length;

  return (
    <main className="page route-page-v2">
      <PageHeader title="경로" action={<button type="button" className="btn btn-primary btn-sm" onClick={onStartCreating}>+ 새 경로</button>} />

      {loadError && (
        <div className="notice error" role="alert" style={{ margin: '0 1rem 0.75rem' }}>
          {loadError}
          {onRetryLoad && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetryLoad} style={{ marginLeft: '0.5rem' }}>
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* Shared route banner */}
      {sharedRoute && userId && (
        <SharedRouteBanner
          sharedRoute={sharedRoute}
          isSaving={isSaving}
          onImport={onImportSharedRoute}
          onDismiss={onDismissSharedRoute}
        />
      )}

      {sortedRoutes.length === 0 ? (
        <div className="route-empty-v2">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6" cy="19" r="3" />
            <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
            <circle cx="18" cy="5" r="3" />
          </svg>
          <h2>경로가 없어요</h2>
          <p>출퇴근 경로를 추가해보세요</p>
          <button type="button" className="btn btn-primary" onClick={onStartCreating}>
            경로 추가
          </button>
        </div>
      ) : (
        <div className="route-list-v2">
          {/* 출근/퇴근 탭 필터 */}
          <div className="route-filter-tabs" role="tablist" aria-label="경로 필터">
            <button
              type="button"
              role="tab"
              id="tab-route-all"
              aria-selected={routeTab === 'all'}
              aria-controls="tabpanel-route-list"
              className={`route-filter-tab ${routeTab === 'all' ? 'active' : ''}`}
              onClick={() => onTabChange('all')}
            >
              전체 ({sortedRoutes.length})
            </button>
            <button
              type="button"
              role="tab"
              id="tab-route-morning"
              aria-selected={routeTab === 'morning'}
              aria-controls="tabpanel-route-list"
              className={`route-filter-tab ${routeTab === 'morning' ? 'active' : ''}`}
              onClick={() => onTabChange('morning')}
            >
              출근 ({sortedRoutes.filter(r => r.routeType === 'morning').length})
            </button>
            <button
              type="button"
              role="tab"
              id="tab-route-evening"
              aria-selected={routeTab === 'evening'}
              aria-controls="tabpanel-route-list"
              className={`route-filter-tab ${routeTab === 'evening' ? 'active' : ''}`}
              onClick={() => onTabChange('evening')}
            >
              퇴근 ({sortedRoutes.filter(r => r.routeType === 'evening').length})
            </button>
          </div>

          <div role="tabpanel" id="tabpanel-route-list" aria-labelledby={`tab-route-${routeTab}`}>
          {filteredRoutes.length === 0 ? (
            <div className="route-filter-empty">
              <p>{routeTab === 'morning' ? '출근' : '퇴근'} 경로가 없어요</p>
            </div>
          ) : (
            filteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                alertCount={getRouteAlertCount(route.id)}
                onEdit={onEditRoute}
                onDelete={onDeleteClick}
              />
            ))
          )}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <ConfirmModal
          open={true}
          title="경로 삭제"
          confirmText="삭제"
          cancelText="취소"
          confirmVariant="danger"
          isLoading={isDeleting}
          onConfirm={onDeleteConfirm}
          onCancel={onDeleteCancel}
        >
          <p>&ldquo;{deleteTarget.name}&rdquo; 경로를 삭제할까요?</p>
          <p className="muted">삭제 후에는 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}
    </main>
  );
}
