import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/use-auth';
import { AuthRequired } from '../components/AuthRequired';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type CreateCheckpointDto,
  type CheckpointType,
} from '@infrastructure/api/commute-api.client';
import { alertApiClient, type Alert, type CreateAlertDto, type AlertType } from '@infrastructure/api';
import { useToast, ToastContainer } from '../components/Toast';

import type { SetupStep, LocalTransportMode, SelectedStop, SharedRouteData } from './route-setup';
import { useRouteValidation } from './route-setup/use-route-validation';
import { useStationSearch } from './route-setup/use-station-search';
import { LineSelectionModal } from './route-setup/LineSelectionModal';
import { RouteTypeStep } from './route-setup/RouteTypeStep';
import { TransportStep } from './route-setup/TransportStep';
import { StationSearchStep } from './route-setup/StationSearchStep';
import { AskMoreStep } from './route-setup/AskMoreStep';
import { ConfirmStep } from './route-setup/ConfirmStep';
import { RouteListView } from './route-setup/RouteListView';

export function RouteSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId } = useAuth();
  const commuteApi = useMemo(() => getCommuteApiClient(), []);
  const toast = useToast();

  // Shared route banner
  const [sharedRoute, setSharedRoute] = useState<SharedRouteData | null>(null);

  // 기존 경로
  const [existingRoutes, setExistingRoutes] = useState<RouteResponse[]>([]);
  const [userAlerts, setUserAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 정렬 및 편집
  const [routeTab, setRouteTab] = useState<'all' | 'morning' | 'evening'>('all');
  const [editingRoute, setEditingRoute] = useState<RouteResponse | null>(null);

  // 새 경로 생성 플로우
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<SetupStep>('select-type');
  const [routeType, setRouteType] = useState<RouteType>('morning');

  // 교통수단 & 정류장
  const [currentTransport, setCurrentTransport] = useState<LocalTransportMode>('subway');
  const [selectedStops, setSelectedStops] = useState<SelectedStop[]>([]);

  // 저장
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // 퇴근 경로 자동 생성 옵션
  const [createReverse, setCreateReverse] = useState(true);

  // 경로 이름
  const [routeName, setRouteName] = useState('');

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 저장 후 네비게이션 타이머 ref (토스트 dismiss 시 즉시 이동용)
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup navigate timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
      }
    };
  }, []);

  // 경로 검증 훅
  const { validation, validateRoute } = useRouteValidation(selectedStops);

  // 정류장 선택 콜백 (검색 훅에 전달)
  const handleSelectStopDirect = useCallback((name: string, line: string, id: string) => {
    const newStop: SelectedStop = {
      id,
      uniqueKey: `${id}-${Date.now()}`,
      name,
      line,
      transportMode: currentTransport,
    };

    const testStops = [...selectedStops, newStop];
    const testValidation = validateRoute(testStops);

    if (!testValidation.isValid) {
      setError(testValidation.errors[0]);
      return;
    }

    if (testValidation.warnings.length > 0) {
      setWarning(testValidation.warnings[0]);
    } else {
      setWarning('');
    }

    setSelectedStops(testStops);
    setError('');
    setStep('ask-more');
  }, [currentTransport, selectedStops, validateRoute]);

  // 검색 훅 (clearSearch는 onStopSelected 콜백 후 훅 내부에서 자동 호출)
  const search = useStationSearch(currentTransport, selectedStops, handleSelectStopDirect);

  // 기존 경로 로드
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    Promise.all([
      commuteApi.getUserRoutes(userId),
      alertApiClient.getAlertsByUser(userId).catch(() => {
        console.warn('Failed to load alerts for route setup');
        return [] as Alert[];
      }),
    ]).then(([routes, alerts]) => {
      if (isMounted) {
        setExistingRoutes(routes);
        setUserAlerts(alerts);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setError('경로 목록을 불러올 수 없습니다');
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  // Parse shared route from URL
  useEffect(() => {
    const shared = searchParams.get('shared');
    if (!shared) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(shared)));
      if (decoded.name && decoded.checkpoints) {
        setSharedRoute(decoded);
      }
    } catch {
      // Invalid shared data - ignore
    }
    searchParams.delete('shared');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Import shared route
  const handleImportSharedRoute = async (): Promise<void> => {
    if (!sharedRoute || !userId) return;
    setIsSaving(true);
    setError('');
    try {
      const dto: CreateRouteDto = {
        userId,
        name: sharedRoute.name,
        routeType: sharedRoute.routeType as RouteType,
        checkpoints: sharedRoute.checkpoints.map((c, i) => ({
          sequenceOrder: i,
          name: c.name,
          checkpointType: c.checkpointType as CheckpointType,
          linkedStationId: c.linkedStationId,
          linkedBusStopId: c.linkedBusStopId,
          lineInfo: c.lineInfo,
          transportMode: c.transportMode as LocalTransportMode | undefined,
        })),
      };
      const saved = await commuteApi.createRoute(dto);
      setExistingRoutes(prev => [...prev, saved]);
      setSharedRoute(null);
    } catch {
      setError('경로 가져오기에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 정렬된 경로 목록
  const sortedRoutes = useMemo(() => {
    return [...existingRoutes].sort((a, b) => {
      if (a.routeType === 'morning' && b.routeType !== 'morning') return -1;
      if (a.routeType !== 'morning' && b.routeType === 'morning') return 1;
      return 0;
    });
  }, [existingRoutes]);

  const filteredRoutes = useMemo(() => {
    if (routeTab === 'all') return sortedRoutes;
    return sortedRoutes.filter(r => r.routeType === routeTab);
  }, [sortedRoutes, routeTab]);

  // 환승 정보 계산
  const getTransferInfo = useCallback((from: SelectedStop, to: SelectedStop): string | null => {
    if (from.transportMode !== to.transportMode) {
      const fromLabel = from.transportMode === 'subway' ? '지하철' : '버스';
      const toLabel = to.transportMode === 'subway' ? '지하철' : '버스';
      return `${fromLabel}→${toLabel}`;
    }

    if (from.transportMode === 'subway' && from.line !== to.line && from.line && to.line) {
      return `${from.line}→${to.line}`;
    }

    return null;
  }, []);

  // 정류장 삭제
  const removeStop = useCallback((index: number) => {
    setSelectedStops(prev => {
      if (prev.length <= 1) {
        setError('경유지는 최소 1개 필요합니다.');
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
    setWarning('');
  }, []);

  // 드래그 앤 드롭 완료
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedStops((items) => {
        const oldIndex = items.findIndex((i) => i.uniqueKey === active.id);
        const newIndex = items.findIndex((i) => i.uniqueKey === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // 체크포인트 생성 헬퍼
  const createCheckpoints = (stops: SelectedStop[], type: RouteType): CreateCheckpointDto[] => {
    const checkpoints: CreateCheckpointDto[] = [];
    let seq = 1;
    const isToWork = type === 'morning';

    checkpoints.push({
      sequenceOrder: seq++,
      name: isToWork ? '집' : '회사',
      checkpointType: isToWork ? 'home' : 'work',
      transportMode: 'walk',
    });

    for (const stop of stops) {
      checkpoints.push({
        sequenceOrder: seq++,
        name: stop.name,
        checkpointType: stop.transportMode === 'subway' ? 'subway' : 'bus_stop',
        linkedStationId: stop.transportMode === 'subway' ? stop.id : undefined,
        linkedBusStopId: stop.transportMode === 'bus' ? stop.id : undefined,
        lineInfo: stop.line,
        transportMode: stop.transportMode,
      });
    }

    checkpoints.push({
      sequenceOrder: seq,
      name: isToWork ? '회사' : '집',
      checkpointType: isToWork ? 'work' : 'home',
    });

    return checkpoints;
  };

  // 경로 생성 후 기본 알림 자동 생성
  const autoCreateAlerts = async (route: RouteResponse): Promise<void> => {
    try {
      const types: AlertType[] = [];
      let subwayStationId: string | undefined;
      let busStopId: string | undefined;

      if (route.routeType === 'morning') {
        types.push('weather', 'airQuality');
      }

      for (const cp of route.checkpoints) {
        if (cp.checkpointType === 'subway' && cp.linkedStationId && !subwayStationId) {
          subwayStationId = cp.linkedStationId;
          types.push('subway');
        }
        if (cp.checkpointType === 'bus_stop' && cp.linkedBusStopId && !busStopId) {
          busStopId = cp.linkedBusStopId;
          types.push('bus');
        }
      }

      if (types.length === 0) return;

      const schedule = route.routeType === 'morning' ? '0 7 * * *' : '30 17 * * *';

      const alertDto: CreateAlertDto = {
        userId: route.userId,
        name: `${route.name} 알림`,
        schedule,
        alertTypes: types,
        subwayStationId,
        busStopId,
        routeId: route.id,
      };

      await alertApiClient.createAlert(alertDto);
    } catch {
      // 알림 생성 실패해도 경로 저장은 성공으로 처리
      setWarning('경로는 저장되었지만 알림 생성에 실패했습니다');
    }
  };

  // 경로 저장
  const handleSave = async (): Promise<void> => {
    if (!userId || selectedStops.length === 0 || isSaving) return;

    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const defaultName = generateRouteName(routeType, selectedStops);
      const finalName = routeName.trim() || defaultName;

      const dto: CreateRouteDto = {
        userId,
        name: finalName,
        routeType,
        isPreferred: existingRoutes.length === 0,
        checkpoints: createCheckpoints(selectedStops, routeType),
      };

      if (editingRoute) {
        await commuteApi.updateRoute(editingRoute.id, dto);
        const updatedRoutes = await commuteApi.getUserRoutes(userId);
        setExistingRoutes(updatedRoutes);
        toast.success('경로가 수정되었습니다');
      } else {
        const saved = await commuteApi.createRoute(dto);
        await autoCreateAlerts(saved);

        if (routeType === 'morning' && createReverse) {
          const reversedStops = [...selectedStops].reverse().map((stop, i) => ({
            ...stop,
            uniqueKey: `reverse-${stop.id}-${i}`,
          }));

          const reverseDto: CreateRouteDto = {
            userId,
            name: '퇴근 경로',
            routeType: 'evening',
            isPreferred: false,
            checkpoints: createCheckpoints(reversedStops, 'evening'),
          };

          const savedReverse = await commuteApi.createRoute(reverseDto);
          await autoCreateAlerts(savedReverse);
          toast.success('출근/퇴근 경로가 저장되었습니다');
        } else {
          toast.success('경로가 저장되었습니다');
        }
      }

      navigateTimerRef.current = setTimeout(() => navigate('/'), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('401') || message.includes('Unauthorized')) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (message.includes('network') || message.includes('fetch')) {
        setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
      } else {
        setError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Toast dismiss 시 즉시 네비게이션
  const handleToastDismiss = useCallback((id: string) => {
    toast.dismissToast(id);
    if (navigateTimerRef.current) {
      clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
      navigate('/');
    }
  }, [toast, navigate]);

  // 경로 이름 자동 생성
  const generateRouteName = useCallback((type: RouteType, stops: SelectedStop[]): string => {
    const existingCount = existingRoutes.filter(r => r.routeType === type).length;
    const label = type === 'morning' ? '출근' : '퇴근';

    if (stops.length >= 2) {
      return `${stops[0].name} → ${stops[stops.length - 1].name}`;
    }
    if (stops.length === 1) {
      return `${label} (${stops[0].name})`;
    }
    return `${label} ${existingCount + 1}`;
  }, [existingRoutes]);

  const defaultRouteName = useMemo(
    () => generateRouteName(routeType, selectedStops),
    [generateRouteName, routeType, selectedStops],
  );

  // 새 경로 시작
  const startCreating = (): void => {
    setIsCreating(true);
    setStep('select-type');
    setSelectedStops([]);
    search.clearSearch();
    setError('');
    setWarning('');
    setCreateReverse(true);
    setRouteName('');
    setEditingRoute(null);
  };

  // 기존 경로 수정 모드 진입
  const handleEditRoute = useCallback((route: RouteResponse) => {
    setEditingRoute(route);
    setRouteType(route.routeType);
    setRouteName(route.name || '');

    const stops: SelectedStop[] = route.checkpoints
      .filter(cp => cp.checkpointType === 'subway' || cp.checkpointType === 'bus_stop')
      .map((cp, index) => ({
        id: cp.linkedStationId || cp.linkedBusStopId || `cp-${index}`,
        uniqueKey: `edit-${cp.linkedStationId || cp.linkedBusStopId || index}-${Date.now()}-${index}`,
        name: cp.name,
        line: cp.lineInfo || '',
        transportMode: cp.checkpointType === 'subway' ? 'subway' as LocalTransportMode : 'bus' as LocalTransportMode,
      }));

    setSelectedStops(stops);
    search.clearSearch();
    setIsCreating(true);
    setStep('ask-more');
    setCreateReverse(false);
    setError('');
    setWarning('');
  }, [search]);

  // 취소
  const cancelCreating = (): void => {
    setIsCreating(false);
    setStep('select-type');
    setSelectedStops([]);
    search.clearSearch();
    search.setLineSelectionModal(null);
    setRouteName('');
    setError('');
    setWarning('');
    setEditingRoute(null);
    setCreateReverse(true);
  };

  // 삭제
  const handleDeleteClick = (route: RouteResponse): void => {
    setDeleteTarget({ id: route.id, name: route.name });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await commuteApi.deleteRoute(deleteTarget.id);
      setExistingRoutes(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 로그인 필요
  if (!userId) {
    return (
      <AuthRequired
        pageTitle="경로"
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>}
        description="출퇴근 경로를 저장하려면 먼저 로그인하세요"
      />
    );
  }

  // 로딩
  if (isLoading) {
    return (
      <main className="page apple-route-page">
        <nav className="apple-nav">
          <button type="button" className="apple-back" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <span className="apple-title">경로</span>
          <span />
        </nav>
        <div className="apple-loading" role="status" aria-live="polite">불러오는 중...</div>
      </main>
    );
  }

  // 새 경로 생성 플로우 (또는 수정 모드)
  if (isCreating) {
    return (
      <main className="page apple-route-page">
        <nav className="apple-nav">
          <button type="button" className="apple-back" onClick={cancelCreating} aria-label="뒤로 가기">←</button>
          <span className="apple-title">{editingRoute ? '경로 수정' : '새 경로'}</span>
          <span />
        </nav>

        {/* 호선 선택 모달 */}
        {search.lineSelectionModal && (
          <LineSelectionModal
            station={search.lineSelectionModal}
            onSelect={search.handleLineSelect}
            onClose={() => search.setLineSelectionModal(null)}
          />
        )}

        {step === 'select-type' && (
          <RouteTypeStep
            routeType={routeType}
            onRouteTypeChange={setRouteType}
            onNext={setStep}
          />
        )}

        {step === 'select-transport' && (
          <TransportStep
            currentTransport={currentTransport}
            onTransportChange={setCurrentTransport}
            selectedStops={selectedStops}
            routeType={routeType}
            onStepChange={setStep}
          />
        )}

        {step === 'select-station' && (
          <StationSearchStep
            currentTransport={currentTransport}
            selectedStops={selectedStops}
            routeType={routeType}
            searchQuery={search.searchQuery}
            isSearching={search.isSearching}
            error={search.searchError || error}
            groupedSubwayResults={search.groupedSubwayResults}
            busResults={search.busResults}
            onSearchChange={search.handleSearchChange}
            onClearSearch={search.clearSearch}
            onStationClick={search.handleStationClick}
            onBusStopSelect={search.handleSelectBusStop}
            onStepChange={setStep}
          />
        )}

        {step === 'ask-more' && (
          <AskMoreStep
            routeType={routeType}
            selectedStops={selectedStops}
            warning={warning}
            onRemoveStop={removeStop}
            onDragEnd={handleDragEnd}
            onStepChange={setStep}
            getTransferInfo={getTransferInfo}
          />
        )}

        {step === 'confirm' && selectedStops.length > 0 && (
          <ConfirmStep
            routeType={routeType}
            selectedStops={selectedStops}
            editingRoute={editingRoute}
            routeName={routeName}
            defaultRouteName={defaultRouteName}
            createReverse={createReverse}
            isSaving={isSaving}
            error={error}
            validation={validation}
            onRouteNameChange={setRouteName}
            onCreateReverseChange={setCreateReverse}
            onSave={handleSave}
            onStepChange={setStep}
            getTransferInfo={getTransferInfo}
          />
        )}

        <ToastContainer toasts={toast.toasts} onDismiss={handleToastDismiss} />
      </main>
    );
  }

  // 메인 화면: 경로 목록
  return (
    <RouteListView
      sortedRoutes={sortedRoutes}
      filteredRoutes={filteredRoutes}
      userAlerts={userAlerts}
      routeTab={routeTab}
      sharedRoute={sharedRoute}
      userId={userId}
      isSaving={isSaving}
      deleteTarget={deleteTarget}
      isDeleting={isDeleting}
      onTabChange={setRouteTab}
      onStartCreating={startCreating}
      onEditRoute={handleEditRoute}
      onDeleteClick={handleDeleteClick}
      onDeleteConfirm={handleDeleteConfirm}
      onDeleteCancel={() => setDeleteTarget(null)}
      onImportSharedRoute={handleImportSharedRoute}
      onDismissSharedRoute={() => setSharedRoute(null)}
    />
  );
}
