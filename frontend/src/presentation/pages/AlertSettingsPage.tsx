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
import {
  useAlertCrud,
  useTransportSearch,
  useWizardNavigation,
  generateSchedule,
  generateAlertName,
  getNotificationTimes,
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
    selectedTransports,
    setSelectedTransports,
    setSearchQuery: setTransportSearchQuery,
  } = transportSearch;

  // Derived values via utility functions (no circular dependency)
  const schedule = useMemo(
    () => generateSchedule(wantsWeather, wantsTransport, routine),
    [wantsWeather, wantsTransport, routine],
  );

  const alertName = useMemo(
    () => generateAlertName(wantsWeather, transportSearch.selectedTransports),
    [wantsWeather, transportSearch.selectedTransports],
  );

  const notificationTimes = useMemo(
    () => getNotificationTimes(wantsWeather, wantsTransport, routine, transportSearch.selectedTransports),
    [wantsWeather, wantsTransport, routine, transportSearch.selectedTransports],
  );

  // Submit handler
  const handleSubmit = useCallback(async (): Promise<void> => {
    setCrudError('');
    setDuplicateAlert(null);

    if (!userId) {
      setCrudError('로그인이 필요합니다.');
      return;
    }

    const alertTypes: AlertType[] = [];
    if (wantsWeather) {
      alertTypes.push('weather', 'airQuality');
    }

    const subwayStation = selectedTransports.find((t) => t.type === 'subway');
    const busStop = selectedTransports.find((t) => t.type === 'bus');

    if (subwayStation) alertTypes.push('subway');
    if (busStop) alertTypes.push('bus');

    const duplicate = checkDuplicateAlert(schedule, alertTypes);
    if (duplicate) {
      setDuplicateAlert(duplicate);
      const parts = duplicate.schedule.split(' ');
      const hours = parts[1]?.split(',').map(h => `${h.padStart(2, '0')}:00`).join(', ') || '';
      setCrudError(`이미 같은 시간(${hours})에 동일한 알림이 있습니다.`);
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
        routeId: selectedRouteId || undefined,
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
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setCrudError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setCrudError('권한이 없습니다. 다시 로그인해주세요.');
      } else {
        setCrudError(`알림 생성에 실패했습니다: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    userId,
    wantsWeather,
    selectedTransports,
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
    onSubmit: handleSubmit,
  });

  // Keep ref in sync so handleSubmit can call wizard.setStep without circular deps
  wizardSetStepRef.current = wizard.setStep;

  // Wizard visibility: show when no alerts (automatic) or user clicked "+" (explicit)
  const shouldShowWizard = alertCrud.alerts.length === 0 || wizard.showWizard;

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
            groupedStations={transportSearch.groupedStations}
            selectedStation={transportSearch.selectedStation}
            savedRoutes={alertCrud.savedRoutes}
            onSearchChange={transportSearch.setSearchQuery}
            onToggleTransport={transportSearch.toggleTransport}
            onSelectStation={transportSearch.setSelectedStation}
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
            selectedTransports={transportSearch.selectedTransports}
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

      {/* 빠른 알림 프리셋 - 위저드가 활성화되지 않은 경우에만 표시 */}
      {!shouldShowWizard && (
        <QuickPresets
          alerts={alertCrud.alerts}
          isSubmitting={alertCrud.isSubmitting}
          onQuickWeather={alertCrud.handleQuickWeatherAlert}
        />
      )}

      {/* Delete Confirmation Modal */}
      {alertCrud.deleteTarget && (
        <DeleteConfirmModal
          targetName={alertCrud.deleteTarget.name}
          isDeleting={alertCrud.isDeleting}
          onConfirm={alertCrud.handleDeleteConfirm}
          onCancel={alertCrud.handleDeleteCancel}
        />
      )}

      {/* Edit Modal */}
      {alertCrud.editTarget && (
        <EditAlertModal
          editForm={alertCrud.editForm}
          isEditing={alertCrud.isEditing}
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
