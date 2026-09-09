import { useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { PageHeader } from '../components/PageHeader';
import { AuthRequired } from '../components/AuthRequired';
import {
  alertApiClient,
} from '@infrastructure/api';
import type { AlertType, CreateAlertDto } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import { getApiErrorMessage } from '@infrastructure/query/error-utils';
import {
  useAlertCrud,
  useTransportSearch,
  useWizardNavigation,
  cronToHuman,
  generateSchedule,
  generateAlertName,
  getNotificationTimes,
  getEffectiveTransports,
  AlertList,
  DeleteConfirmModal,
  EditAlertModal,
  WizardStepIndicator,
  TypeSelectionStep,
  TransportTypeStep,
  StationSearchStep,
  RoutineStep,
  ConfirmStep,
  QuickPresets,
  WizardNavButtons,
  TOAST_DURATION_MS,
} from './alert-settings';
import type { Routine, TransportItem } from './alert-settings';

export function AlertSettingsPage(): JSX.Element {
  // Wizard-specific local state
  const [wantsWeather, setWantsWeather] = useState(false);
  const [wantsTransport, setWantsTransport] = useState(false);
  const [transportTypes, setTransportTypes] = useState<('subway' | 'bus')[]>([]);
  const [routine, setRoutine] = useState<Routine>({
    wakeUp: '07:00',
    leaveHome: '08:00',
    leaveWork: '18:00',
  });
  const [showRouteImport, setShowRouteImport] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const { userId } = useAuth();

  // Ref to break circular dependency: handleSubmit needs wizard.setStep,
  // but wizard needs handleSubmit as onSubmit prop.
  const wizardSetStepRef = useRef<(step: 'type' | 'transport' | 'station' | 'routine' | 'confirm') => void>(() => {});

  // Alert CRUD operations
  const alertCrud = useAlertCrud(userId);
  const {
    setError: setCrudError,
    setDuplicateAlert,
    setIsSubmitting,
    setSuccess: setCrudSuccess,
    reloadAlerts,
    checkDuplicateAlert,
  } = alertCrud;

  // Transport search
  const transportSearch = useTransportSearch(transportTypes);
  const {
    setSelectedTransports,
    setSearchQuery: setTransportSearchQuery,
  } = transportSearch;

  // Derived values via utility functions (no circular dependency)
  const schedule = useMemo(
    () => generateSchedule(wantsWeather, wantsTransport, routine),
    [wantsWeather, wantsTransport, routine],
  );

  // '교통' 체크를 끈 뒤에도 고른 정류장은 남는다. 표시·미리보기·저장이 갈리지
  // 않도록 실제로 반영할 값을 한 번만 정한다.
  const effectiveTransports = useMemo(
    () => getEffectiveTransports(wantsTransport, transportSearch.selectedTransports),
    [wantsTransport, transportSearch.selectedTransports],
  );

  const alertName = useMemo(
    () => generateAlertName(wantsWeather, effectiveTransports),
    [wantsWeather, effectiveTransports],
  );

  const notificationTimes = useMemo(
    () => getNotificationTimes(wantsWeather, wantsTransport, routine, effectiveTransports),
    [wantsWeather, wantsTransport, routine, effectiveTransports],
  );

  // Submit handler
  const handleSubmit = useCallback(async (): Promise<void> => {
    setCrudError('');
    setDuplicateAlert(null);

    if (!userId) {
      setCrudError('로그인이 필요합니다.');
      return;
    }

    // 시각을 못 읽으면 `generateSchedule`이 빈 문자열을 준다. 그대로 보내면 서버는
    // 통과시키고 EventBridge 변환에서 던져, 원인을 알 수 없는 실패만 남는다.
    if (!schedule) {
      setCrudError('알림 시간을 입력해주세요.');
      return;
    }

    const alertTypes: AlertType[] = [];
    if (wantsWeather) {
      alertTypes.push('weather', 'airQuality');
    }

    const subwayStation = effectiveTransports.find((t) => t.type === 'subway');
    const busStop = effectiveTransports.find((t) => t.type === 'bus');

    if (subwayStation) alertTypes.push('subway');
    if (busStop) alertTypes.push('bus');

    const duplicate = checkDuplicateAlert(schedule, alertTypes);
    if (duplicate) {
      setDuplicateAlert(duplicate);
      setCrudError(
        `이미 같은 시간(${cronToHuman(duplicate.schedule)})에 동일한 알림이 있습니다.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateAlertDto = {
        userId,
        name: alertName,
        schedule,
        alertTypes,
        subwayStationId: subwayStation?.id,
        busStopId: busStop?.id,
        // 경로는 교통 단계에서만 가져온다. 교통을 끄면 연결도 함께 놓는다.
        routeId: (wantsTransport && selectedRouteId) || undefined,
      };

      await alertApiClient.createAlert(dto);
      setCrudSuccess('알림이 설정되었습니다! 알림톡으로 받아요.');
      reloadAlerts();

      setTimeout(() => {
        wizardSetStepRef.current('type');
        setWantsWeather(false);
        setWantsTransport(false);
        setTransportTypes([]);
        setSelectedTransports([]);
        setTransportSearchQuery('');
        setSelectedRouteId(null);
        setCrudSuccess('');
      }, TOAST_DURATION_MS);
    } catch (err: unknown) {
      setCrudError(getApiErrorMessage(err, '알림 생성에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    userId,
    wantsWeather,
    wantsTransport,
    effectiveTransports,
    selectedRouteId,
    schedule,
    alertName,
    checkDuplicateAlert,
    setCrudError,
    setDuplicateAlert,
    setIsSubmitting,
    setCrudSuccess,
    reloadAlerts,
    setSelectedTransports,
    setTransportSearchQuery,
  ]);

  // Wizard navigation
  const wizard = useWizardNavigation({
    wantsWeather,
    wantsTransport,
    transportTypes,
    selectedTransports: transportSearch.selectedTransports,
    deleteTarget: alertCrud.deleteTarget,
    isSubmitting: alertCrud.isSubmitting,
    success: alertCrud.success,
    // 저장에 쓸 크론이 실제로 만들어졌는지. 루틴 단계의 시각을 비우면 만들어지지 않는다.
    hasSchedule: schedule !== '',
    onSubmit: handleSubmit,
  });

  // Keep ref in sync so handleSubmit can call wizard.setStep without circular deps
  wizardSetStepRef.current = wizard.setStep;

  // Wizard visibility: show when no alerts (automatic) or user clicked "+" (explicit)
  const shouldShowWizard = (alertCrud.alerts.length === 0 && !alertCrud.loadError) || wizard.showWizard;

  // Import from route handler
  const importFromRoute = (route: RouteResponse): void => {
    const transports: TransportItem[] = [];

    for (const checkpoint of route.checkpoints) {
      if (checkpoint.checkpointType === 'subway' && checkpoint.linkedStationId) {
        transports.push({
          type: 'subway',
          id: checkpoint.linkedStationId,
          name: checkpoint.name,
          detail: checkpoint.lineInfo || '',
        });
      } else if (checkpoint.checkpointType === 'bus_stop' && checkpoint.linkedBusStopId) {
        transports.push({
          type: 'bus',
          id: checkpoint.linkedBusStopId,
          name: checkpoint.name,
          detail: '',
        });
      }
    }

    if (transports.length > 0) {
      transportSearch.setSelectedTransports(transports);
      setWantsTransport(true);
      setSelectedRouteId(route.id);
      const hasSubway = transports.some(t => t.type === 'subway');
      const hasBus = transports.some(t => t.type === 'bus');
      const types: ('subway' | 'bus')[] = [];
      if (hasSubway) types.push('subway');
      if (hasBus) types.push('bus');
      setTransportTypes(types);
      wizard.setStep('routine');
      setShowRouteImport(false);
    }
  };

  // Toggle transport type handler
  const toggleTransportType = (type: 'subway' | 'bus'): void => {
    setTransportTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Handle duplicate alert - edit existing
  const handleEditDuplicate = (): void => {
    if (alertCrud.duplicateAlert) {
      alertCrud.handleEditClick(alertCrud.duplicateAlert);
      alertCrud.setDuplicateAlert(null);
      alertCrud.setError('');
      wizard.setStep('type');
      setWantsWeather(false);
      setWantsTransport(false);
      setTransportTypes([]);
      transportSearch.setSelectedTransports([]);
      setSelectedRouteId(null);
      transportSearch.setSearchQuery('');
      transportSearch.setSelectedStation(null);
      setTimeout(() => {
        const alertsSection = document.querySelector('.existing-alerts');
        alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Handle duplicate alert - change time
  const handleChangeTime = (): void => {
    alertCrud.setDuplicateAlert(null);
    alertCrud.setError('');
    wizard.setStep('routine');
  };

  const progress = wizard.getProgress();

  // 비로그인 시 빈 상태 UI
  if (!userId) {
    return (
      <AuthRequired
        pageTitle="알림"
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
        description="알림을 설정하려면 먼저 로그인하세요"
      />
    );
  }

  return (
    <main className="page alert-page-v2">
      <PageHeader
        title="알림"
        action={
          <Link
            to="/notifications"
            className="notification-history-link"
            aria-label="알림 발송 기록 보기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>알림 기록</span>
          </Link>
        }
      />

      {/* 초기 로딩 상태 표시 */}
      {alertCrud.isLoadingAlerts && (
        <div className="loading-container" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>서버에 연결 중입니다...</p>
          <p className="muted">최대 30초가 소요될 수 있습니다</p>
        </div>
      )}

      {/* 초기 로드 에러 */}
      {!alertCrud.isLoadingAlerts && alertCrud.loadError && (
        <div className="notice error" role="alert">
          <p>{alertCrud.loadError}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={alertCrud.retryLoad}>
            다시 시도
          </button>
        </div>
      )}

      {/* 경로 조회만 실패한 경우 — 알림 기능은 막지 않고 사실만 알린다 */}
      {!alertCrud.isLoadingAlerts && !alertCrud.loadError && alertCrud.routesError && (
        <div className="notice warning" role="status">
          <p>{alertCrud.routesError}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={alertCrud.retryLoad}>
            다시 시도
          </button>
        </div>
      )}

      {/* Existing Alerts */}
      {!alertCrud.isLoadingAlerts && alertCrud.alerts.length > 0 && (
        <AlertList
          alerts={alertCrud.alerts}
          savedRoutes={alertCrud.savedRoutes}
          onToggle={alertCrud.handleToggleAlert}
          onEdit={alertCrud.handleEditClick}
          onDelete={alertCrud.handleDeleteClick}
        />
      )}

      {/* "Add new alert" toggle button — only when alerts exist and wizard is hidden */}
      {!alertCrud.isLoadingAlerts && alertCrud.alerts.length > 0 && !shouldShowWizard && (
        <button
          type="button"
          className="btn btn-primary add-alert-btn"
          onClick={() => wizard.setShowWizard(true)}
          disabled={alertCrud.isSubmitting}
        >
          + 새 알림 추가
        </button>
      )}

      {!alertCrud.isLoadingAlerts && shouldShowWizard && (
      <div id="wizard-content" className="wizard-container">
        <WizardStepIndicator
          progress={progress}
          wantsTransport={wantsTransport}
          isConfirmStep={wizard.step === 'confirm'}
        />

        {/* Step: Type Selection */}
        {wizard.step === 'type' && (
          <TypeSelectionStep
            wantsWeather={wantsWeather}
            wantsTransport={wantsTransport}
            isSubmitting={alertCrud.isSubmitting}
            userId={userId}
            error={alertCrud.error}
            success={alertCrud.success}
            onToggleWeather={() => setWantsWeather(!wantsWeather)}
            onToggleTransport={() => setWantsTransport(!wantsTransport)}
            onQuickWeather={alertCrud.handleQuickWeatherAlert}
            onClearError={() => alertCrud.setError('')}
          />
        )}

        {/* Step: Transport Type */}
        {wizard.step === 'transport' && (
          <TransportTypeStep
            transportTypes={transportTypes}
            savedRoutes={alertCrud.savedRoutes}
            showRouteImport={showRouteImport}
            onToggleTransportType={toggleTransportType}
            onShowRouteImport={() => setShowRouteImport(true)}
            onHideRouteImport={() => setShowRouteImport(false)}
            onImportFromRoute={importFromRoute}
          />
        )}

        {/* Step: Station Search */}
        {wizard.step === 'station' && (
          <StationSearchStep
            transportTypes={transportTypes}
            searchQuery={transportSearch.searchQuery}
            searchResults={transportSearch.searchResults}
            selectedTransports={transportSearch.selectedTransports}
            isSearching={transportSearch.isSearching}
            searchError={transportSearch.searchError}
            groupedStations={transportSearch.groupedStations}
            selectedStation={transportSearch.selectedStation}
            savedRoutes={alertCrud.savedRoutes}
            onSearchChange={transportSearch.setSearchQuery}
            onToggleTransport={transportSearch.toggleTransport}
            onSelectStation={transportSearch.setSelectedStation}
            onRetrySearch={transportSearch.retrySearch}
          />
        )}

        {/* Step: Routine */}
        {wizard.step === 'routine' && (
          <RoutineStep
            wantsWeather={wantsWeather}
            wantsTransport={wantsTransport}
            routine={routine}
            notificationTimes={notificationTimes}
            onRoutineChange={setRoutine}
          />
        )}

        {/* Step: Confirm */}
        {wizard.step === 'confirm' && (
          <ConfirmStep
            wantsWeather={wantsWeather}
            selectedTransports={effectiveTransports}
            notificationTimes={notificationTimes}
            error={alertCrud.error}
            success={alertCrud.success}
            duplicateAlert={alertCrud.duplicateAlert}
            onEditDuplicate={handleEditDuplicate}
            onChangeTime={handleChangeTime}
          />
        )}

        {/* Navigation Buttons */}
        <WizardNavButtons
          step={wizard.step}
          canProceed={wizard.canProceed()}
          isSubmitting={alertCrud.isSubmitting}
          success={alertCrud.success}
          onBack={wizard.goBack}
          onNext={wizard.goNext}
          onSubmit={handleSubmit}
        />
      </div>
      )}

      {/* 빠른 알림 프리셋 - 위저드가 활성화되지 않은 경우에만 표시.
          로드 실패 시에는 서버의 기존 알림을 알 수 없어 중복 생성 위험이 있으므로 숨긴다 */}
      {!shouldShowWizard && !alertCrud.loadError && (
        <QuickPresets
          hasWeatherAlert={alertCrud.hasQuickWeatherAlert}
          isSubmitting={alertCrud.isSubmitting}
          onQuickWeather={alertCrud.handleQuickWeatherAlert}
        />
      )}

      {/* Delete Confirmation Modal */}
      {alertCrud.deleteTarget && (
        <DeleteConfirmModal
          targetName={alertCrud.deleteTarget.name}
          isDeleting={alertCrud.isDeleting}
          deleteError={alertCrud.error}
          onConfirm={alertCrud.handleDeleteConfirm}
          onCancel={alertCrud.handleDeleteCancel}
        />
      )}

      {/* Edit Modal */}
      {alertCrud.editTarget && (
        <EditAlertModal
          editForm={alertCrud.editForm}
          originalSchedule={alertCrud.editTarget.schedule}
          isEditing={alertCrud.isEditing}
          error={alertCrud.error}
          onFormChange={alertCrud.setEditForm}
          onConfirm={alertCrud.handleEditConfirm}
          onCancel={alertCrud.handleEditCancel}
        />
      )}

      <footer className="footer">
        <p className="footer-text">
          <span>출퇴근 메이트</span>
          <span className="footer-divider">·</span>
          <span>출퇴근 알림 서비스</span>
        </p>
        <p className="footer-copyright">&copy; 2026 All rights reserved</p>
      </footer>
    </main>
  );
}
