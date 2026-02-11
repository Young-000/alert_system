import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type CreateCheckpointDto,
  type CheckpointType,
} from '@infrastructure/api/commute-api.client';
import { subwayApiClient, busApiClient, alertApiClient, type SubwayStation, type BusStop, type CreateAlertDto, type AlertType, type Alert } from '@infrastructure/api';
import { ConfirmModal } from '../components/ConfirmModal';

type SetupStep =
  | 'select-type'      // 출근/퇴근 선택
  | 'select-transport' // 교통수단 선택
  | 'select-station'   // 역/정류장 검색
  | 'ask-more'         // 더 거쳐가나요?
  | 'confirm';         // 최종 확인

type TransportMode = 'subway' | 'bus';

interface SelectedStop {
  id: string;
  uniqueKey: string; // for drag-and-drop
  name: string;
  line: string;
  transportMode: TransportMode;
}

// Grouped station for line selection
interface GroupedStation {
  name: string;
  lines: Array<{ line: string; id: string }>;
}

// Route validation result
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Sortable stop component for drag-and-drop
// Memoized to avoid re-renders of all items during drag-and-drop
const SortableStopItem = memo(function SortableStopItem({
  stop,
  index,
  onRemove,
  transferInfo,
}: {
  stop: SelectedStop;
  index: number;
  onRemove: (index: number) => void;
  transferInfo: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.uniqueKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-stop-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* 드래그 핸들 - 터치 영역 44px 이상 확보 */}
      <button
        type="button"
        className="drag-handle-btn"
        aria-label="순서 변경"
        {...attributes}
        {...listeners}
      >
        <span className="drag-handle-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></span>
      </button>
      <div className="sortable-stop-content">
        <span className="stop-icon" aria-hidden="true">
          {stop.transportMode === 'subway' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg>
          )}
        </span>
        <div className="stop-info">
          <span className="stop-name">{stop.name}</span>
          {stop.line && <span className="stop-line">{stop.line}</span>}
          {transferInfo && (
            <span className="transfer-badge">{transferInfo}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="sortable-stop-remove"
        onClick={() => onRemove(index)}
        aria-label={`${stop.name} 삭제`}
      >
        ×
      </button>
    </div>
  );
});

export function RouteSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = localStorage.getItem('userId') || '';
  // Stable singleton reference prevents unnecessary useEffect re-runs
  const commuteApi = useMemo(() => getCommuteApiClient(), []);

  // Shared route banner
  const [sharedRoute, setSharedRoute] = useState<{
    name: string;
    routeType: RouteType;
    checkpoints: Array<{ name: string; checkpointType: string; linkedStationId?: string; linkedBusStopId?: string; lineInfo?: string; transportMode?: string }>;
  } | null>(null);

  // 기존 경로
  const [existingRoutes, setExistingRoutes] = useState<RouteResponse[]>([]);
  const [userAlerts, setUserAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 정렬 및 편집
  const [sortBy] = useState<'recent' | 'name' | 'created'>('recent');
  const [routeTab, setRouteTab] = useState<'all' | 'morning' | 'evening'>('all');
  const [editingRoute, setEditingRoute] = useState<RouteResponse | null>(null);

  // 새 경로 생성 플로우
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<SetupStep>('select-type');
  const [routeType, setRouteType] = useState<RouteType>('morning');

  // 교통수단 & 정류장
  const [currentTransport, setCurrentTransport] = useState<TransportMode>('subway');
  const [selectedStops, setSelectedStops] = useState<SelectedStop[]>([]);

  // 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [subwayResults, setSubwayResults] = useState<SubwayStation[]>([]);
  const [busResults, setBusResults] = useState<BusStop[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 호선 선택 모달
  const [lineSelectionModal, setLineSelectionModal] = useState<GroupedStation | null>(null);

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

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 기존 경로 로드
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    Promise.all([
      commuteApi.getUserRoutes(userId),
      alertApiClient.getAlertsByUser(userId).catch(() => [] as Alert[]),
    ]).then(([routes, alerts]) => {
      if (isMounted) {
        setExistingRoutes(routes);
        setUserAlerts(alerts);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
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
    // Clear shared param from URL
    searchParams.delete('shared');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Import shared route
  const handleImportSharedRoute = async () => {
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
          transportMode: c.transportMode as TransportMode | undefined,
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

  // 경로 검증 함수 (버스/지하철 혼합 지원)
  const validateRoute = useCallback((stops: SelectedStop[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (stops.length === 0) {
      errors.push('최소 하나의 정류장을 선택해주세요');
      return { isValid: false, errors, warnings };
    }

    // 1. 중복 역 검사 (같은 이름 + 같은 호선)
    const seen = new Set<string>();
    for (const stop of stops) {
      const key = `${stop.name}-${stop.line}-${stop.transportMode}`;
      if (seen.has(key)) {
        errors.push(`"${stop.name} ${stop.line || ''}" ${stop.transportMode === 'subway' ? '역' : '정류장'}이 중복되었습니다`);
      }
      seen.add(key);
    }

    // 2. 연속 구간 검증
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const curr = stops[i];

      // 2a. 지하철 → 지하철: 같은 호선이면서 다른 역인 경우 (정상적인 이동)
      //     다른 호선이면서 같은 역이면 환승 (정상)
      //     다른 호선이면서 다른 역이면 환승 누락 가능성 (에러)
      if (prev.transportMode === 'subway' && curr.transportMode === 'subway') {
        // 같은 호선 + 같은 역 = 의미없음
        if (prev.line === curr.line && prev.name === curr.name) {
          errors.push(`${prev.name}역 ${prev.line}이 연속으로 중복되었습니다.`);
        }
        // 같은 호선 + 다른 역 = 정상 (하지만 경고)
        else if (prev.line === curr.line && prev.line !== '') {
          warnings.push(
            `${prev.name}과 ${curr.name}은 같은 ${curr.line}입니다. 중간역이라면 생략해도 됩니다.`
          );
        }
        // 다른 호선 + 다른 역 = 환승역 누락 가능성
        else if (prev.line !== curr.line && prev.name !== curr.name) {
          errors.push(
            `${prev.name}역(${prev.line})에서 ${curr.name}역(${curr.line})으로 직접 이동할 수 없습니다. 환승역을 추가해주세요.`
          );
        }
        // 다른 호선 + 같은 역 = 환승 (정상)
      }

      // 2b. 버스 → 버스: 실제 환승 가능 여부 판단 어려움 - 경고만
      if (prev.transportMode === 'bus' && curr.transportMode === 'bus') {
        if (prev.name !== curr.name) {
          warnings.push(
            `${prev.name} → ${curr.name} 버스 환승이 가능한지 확인해주세요.`
          );
        }
      }

      // 2c. 버스 ↔ 지하철: 혼합 환승 - 정보 제공
      if (prev.transportMode !== curr.transportMode) {
        // 교통수단 변경 시 알림
        const fromType = prev.transportMode === 'subway' ? '지하철' : '버스';
        const toType = curr.transportMode === 'subway' ? '지하철' : '버스';
        warnings.push(
          `${prev.name}에서 ${fromType}→${toType} 환승이 있습니다. 환승 시간을 고려해주세요.`
        );
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }, []);

  // 실시간 검증
  const validation = useMemo(() => validateRoute(selectedStops), [selectedStops, validateRoute]);

  // 정렬된 경로 목록
  const sortedRoutes = useMemo(() => {
    const routes = [...existingRoutes];
    switch (sortBy) {
      case 'name':
        return routes.sort((a, b) => a.name.localeCompare(b.name));
      case 'created':
        return routes.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case 'recent':
      default:
        // 기본: 출근 먼저, 그 다음 퇴근
        return routes.sort((a, b) => {
          if (a.routeType === 'morning' && b.routeType !== 'morning') return -1;
          if (a.routeType !== 'morning' && b.routeType === 'morning') return 1;
          return 0;
        });
    }
  }, [existingRoutes, sortBy]);

  const filteredRoutes = useMemo(() => {
    if (routeTab === 'all') return sortedRoutes;
    return sortedRoutes.filter(r => r.routeType === routeTab);
  }, [sortedRoutes, routeTab]);

  // 환승 정보 계산
  const getTransferInfo = useCallback((from: SelectedStop, to: SelectedStop): string | null => {
    // 교통수단이 다르면
    if (from.transportMode !== to.transportMode) {
      const fromLabel = from.transportMode === 'subway' ? '지하철' : '버스';
      const toLabel = to.transportMode === 'subway' ? '지하철' : '버스';
      return `${fromLabel}→${toLabel}`;
    }

    // 같은 교통수단이지만 호선이 다르면 (지하철 환승)
    if (from.transportMode === 'subway' && from.line !== to.line && from.line && to.line) {
      return `${from.line}→${to.line}`;
    }

    return null;
  }, []);

  // 역/정류장 검색 - 지하철은 역 이름으로 그룹화
  const searchStops = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSubwayResults([]);
      setBusResults([]);
      return;
    }

    setIsSearching(true);
    try {
      if (currentTransport === 'subway') {
        const results = await subwayApiClient.searchStations(query);
        setSubwayResults(results.slice(0, 10)); // 더 많이 가져와서 그룹화
        setBusResults([]);
      } else {
        const results = await busApiClient.searchStops(query);
        setBusResults(results.slice(0, 6));
        setSubwayResults([]);
      }
    } catch {
      setSubwayResults([]);
      setBusResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentTransport]);

  // 지하철 검색 결과를 역 이름으로 그룹화
  const groupedSubwayResults = useMemo((): GroupedStation[] => {
    const groups: Map<string, GroupedStation> = new Map();

    for (const station of subwayResults) {
      const existing = groups.get(station.name);
      if (existing) {
        // 중복 호선 방지
        if (!existing.lines.some(l => l.line === station.line)) {
          existing.lines.push({ line: station.line, id: station.id });
        }
      } else {
        groups.set(station.name, {
          name: station.name,
          lines: [{ line: station.line, id: station.id }],
        });
      }
    }

    return Array.from(groups.values());
  }, [subwayResults]);

  // 역 선택 - 교집합 알고리즘으로 호선 자동 인식 (Phase 3)
  const handleStationClick = (grouped: GroupedStation) => {
    // 단일 호선이면 바로 선택
    if (grouped.lines.length === 1) {
      handleSelectStopDirect(grouped.name, grouped.lines[0].line, grouped.lines[0].id);
      return;
    }

    // 이미 선택된 지하철 역들의 호선 목록으로 교집합 계산
    const subwayStops = selectedStops.filter(s => s.transportMode === 'subway');
    if (subwayStops.length > 0) {
      const existingLines = new Set(subwayStops.map(s => s.line).filter(Boolean));
      const commonLines = grouped.lines.filter(l => existingLines.has(l.line));

      if (commonLines.length === 1) {
        // 교집합 1개: 같은 호선 → 자동 선택 (모달 스킵)
        handleSelectStopDirect(grouped.name, commonLines[0].line, commonLines[0].id);
        return;
      }
      if (commonLines.length > 1) {
        // 교집합 여러 개: 교집합만 보여주는 간소화 모달
        setLineSelectionModal({ ...grouped, lines: commonLines });
        return;
      }
      // 교집합 0개: 환승으로 판단 → 전체 호선 모달 표시
    }

    // 기본: 전체 호선 모달 표시
    setLineSelectionModal(grouped);
  };

  // 호선 선택 후 정류장 추가
  const handleLineSelect = (stationName: string, line: string, stationId: string) => {
    handleSelectStopDirect(stationName, line, stationId);
    setLineSelectionModal(null);
  };

  // 정류장 직접 추가 (검증 포함)
  const handleSelectStopDirect = (name: string, line: string, id: string) => {
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
    setSearchQuery('');
    setSubwayResults([]);
    setBusResults([]);
    setError('');
    setStep('ask-more');
  };

  // 버스 정류장 선택
  const handleSelectBusStop = (stop: BusStop) => {
    handleSelectStopDirect(stop.name, '', stop.nodeId);
  };

  // 정류장 삭제 (최소 1개 유지)
  const removeStop = (index: number) => {
    setSelectedStops(prev => {
      if (prev.length <= 1) {
        setError('최소 하나의 정류장은 필요합니다.');
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
    setWarning('');
  };

  // 드래그 앤 드롭 완료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedStops((items) => {
        const oldIndex = items.findIndex((i) => i.uniqueKey === active.id);
        const newIndex = items.findIndex((i) => i.uniqueKey === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 체크포인트 생성 헬퍼
  const createCheckpoints = (stops: SelectedStop[], type: RouteType): CreateCheckpointDto[] => {
    const checkpoints: CreateCheckpointDto[] = [];
    let seq = 1;
    const isToWork = type === 'morning';

    // 시작점
    checkpoints.push({
      sequenceOrder: seq++,
      name: isToWork ? '집' : '회사',
      checkpointType: isToWork ? 'home' : 'work',
      transportMode: 'walk',
    });

    // 중간 정류장들
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

    // 도착점
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

      // 출근 경로면 날씨 + 미세먼지 추가
      if (route.routeType === 'morning') {
        types.push('weather', 'airQuality');
      }

      // 체크포인트에서 대중교통 정보 추출
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

      // 기본 스케줄: 출근 07:00, 퇴근 17:30
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
    }
  };

  // 경로 저장 (신규 생성 또는 수정)
  const handleSave = async () => {
    if (!userId || selectedStops.length === 0) return;

    // 최종 검증
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
        // 수정 모드: PUT API 호출
        await commuteApi.updateRoute(editingRoute.id, dto);
        // 경로 목록 새로고침 (타입 안전성을 위해 전체 리로드)
        const updatedRoutes = await commuteApi.getUserRoutes(userId);
        setExistingRoutes(updatedRoutes);
      } else {
        // 신규 생성: POST API 호출
        const saved = await commuteApi.createRoute(dto);

        // 기본 알림 자동 생성 (경로 연결)
        await autoCreateAlerts(saved);

        // 출근 경로이고 퇴근 경로 자동 생성이 체크되어 있으면
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
        }
      }

      navigate('/');
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

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

  // 새 경로 시작
  const startCreating = () => {
    setIsCreating(true);
    setStep('select-type');
    setSelectedStops([]);
    setSearchQuery('');
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

    // 체크포인트에서 교통수단 정류장만 추출
    const stops: SelectedStop[] = route.checkpoints
      .filter(cp => cp.checkpointType === 'subway' || cp.checkpointType === 'bus_stop')
      .map((cp, index) => ({
        id: cp.linkedStationId || cp.linkedBusStopId || `cp-${index}`,
        uniqueKey: `edit-${cp.linkedStationId || cp.linkedBusStopId || index}-${Date.now()}-${index}`,
        name: cp.name,
        line: cp.lineInfo || '',
        transportMode: cp.checkpointType === 'subway' ? 'subway' as TransportMode : 'bus' as TransportMode,
      }));

    setSelectedStops(stops);
    setIsCreating(true);
    setStep('ask-more'); // 경로 확인 단계로 바로 이동
    setCreateReverse(false); // 수정 시에는 역방향 자동 생성 비활성화
    setError('');
    setWarning('');
  }, []);

  // 취소
  const cancelCreating = () => {
    setIsCreating(false);
    setStep('select-type');
    setSelectedStops([]);
    setSearchQuery('');
    setLineSelectionModal(null);
  };

  // 삭제 확인 요청
  const handleDeleteClick = (route: RouteResponse) => {
    setDeleteTarget({ id: route.id, name: route.name });
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
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

  // 승하차 구분 라벨 결정
  const getStopLabel = (index: number, totalStops: number): string => {
    if (totalStops === 1) return '승차';
    if (index === 0) return '승차';
    if (index === totalStops - 1) return '하차';
    return '환승';
  };

  // 현재까지 경로 미리보기 렌더링
  const renderRouteSoFar = () => {
    const isToWork = routeType === 'morning';
    const start = isToWork ? '집' : '회사';

    return (
      <div className="route-so-far">
        <span className="route-point-mini">{start}</span>
        {selectedStops.map((stop, index) => {
          const label = getStopLabel(index, selectedStops.length);
          return (
            <span key={stop.uniqueKey} className="route-segment">
              <span className="route-arrow-mini">→</span>
              <span className={`route-point-mini stop ${label === '환승' ? 'transfer' : ''}`}>
                <span className="stop-label-mini">{label}</span>
                {stop.name}
                {stop.line && <span className="line-info-mini">{stop.line}</span>}
              </span>
            </span>
          );
        })}
        <span className="route-arrow-mini">→</span>
        <span className="route-point-mini">?</span>
      </div>
    );
  };

  // 로그인 필요
  if (!userId) {
    return (
      <main className="page apple-route-page">
        <nav className="apple-nav">
          <button type="button" className="apple-back" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <span className="apple-title">경로</span>
          <span />
        </nav>
        <div className="apple-empty">
          <div className="apple-empty-icon" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg></div>
          <h2>로그인이 필요해요</h2>
          <p>출퇴근 경로를 저장하려면<br />먼저 로그인해주세요</p>
          <Link to="/login" className="apple-btn-primary">로그인</Link>
        </div>
      </main>
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
        {lineSelectionModal && (
          <div className="line-selection-modal" role="dialog" aria-modal="true" aria-label="호선 선택" onClick={() => setLineSelectionModal(null)} onKeyDown={(e) => { if (e.key === 'Escape') setLineSelectionModal(null); }}>
            <div className="line-selection-content" onClick={(e) => e.stopPropagation()}>
              <h3>{lineSelectionModal.name}역</h3>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                어떤 호선을 이용하세요?
              </p>
              <div className="line-selection-list">
                {lineSelectionModal.lines.map(({ line, id }) => (
                  <button
                    key={id}
                    type="button"
                    className="line-selection-btn"
                    onClick={() => handleLineSelect(lineSelectionModal.name, line, id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>
                    <span>{line}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="line-selection-cancel"
                onClick={() => setLineSelectionModal(null)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 출근/퇴근 선택 */}
        {step === 'select-type' && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">어떤 경로를<br />만들까요?</h1>

              <div className="apple-type-cards">
                <button
                  type="button"
                  className={`apple-type-card ${routeType === 'morning' ? 'selected' : ''}`}
                  onClick={() => setRouteType('morning')}
                >
                  <span className="type-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg></span>
                  <span className="type-label">출근</span>
                  <span className="type-desc">집 → 회사</span>
                </button>

                <button
                  type="button"
                  className={`apple-type-card ${routeType === 'evening' ? 'selected' : ''}`}
                  onClick={() => setRouteType('evening')}
                >
                  <span className="type-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                  <span className="type-label">퇴근</span>
                  <span className="type-desc">회사 → 집</span>
                </button>
              </div>
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-primary apple-btn-full"
                onClick={() => setStep('select-transport')}
              >
                다음
              </button>
            </div>
          </section>
        )}

        {/* Step 2: 교통수단 선택 */}
        {step === 'select-transport' && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">
                {selectedStops.length === 0
                  ? '어떤 교통수단을\n타세요?'
                  : '다음은 어떤\n교통수단이에요?'}
              </h1>

              {selectedStops.length > 0 && renderRouteSoFar()}

              {/* 개선된 교통수단 선택기 - 아이콘 + 라벨 + 설명 */}
              <div className="transport-selector" role="radiogroup" aria-label="교통수단 선택">
                <button
                  type="button"
                  role="radio"
                  aria-checked={currentTransport === 'subway'}
                  className={`transport-option ${currentTransport === 'subway' ? 'selected' : ''}`}
                  onClick={() => setCurrentTransport('subway')}
                >
                  <span className="transport-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg></span>
                  <div className="transport-text">
                    <span className="transport-label">지하철</span>
                    <span className="transport-desc">역 이름으로 검색</span>
                  </div>
                  {currentTransport === 'subway' && (
                    <span className="transport-check" aria-hidden="true">✓</span>
                  )}
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={currentTransport === 'bus'}
                  className={`transport-option ${currentTransport === 'bus' ? 'selected' : ''}`}
                  onClick={() => setCurrentTransport('bus')}
                >
                  <span className="transport-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg></span>
                  <div className="transport-text">
                    <span className="transport-label">버스</span>
                    <span className="transport-desc">정류장으로 검색</span>
                  </div>
                  {currentTransport === 'bus' && (
                    <span className="transport-check" aria-hidden="true">✓</span>
                  )}
                </button>
              </div>
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-secondary"
                onClick={() => setStep(selectedStops.length === 0 ? 'select-type' : 'ask-more')}
              >
                이전
              </button>
              <button
                type="button"
                className="apple-btn-primary"
                onClick={() => setStep('select-station')}
              >
                다음
              </button>
            </div>
          </section>
        )}

        {/* Step 3: 역/정류장 검색 */}
        {step === 'select-station' && (
          <section className="apple-step">
            <div className="apple-step-content">
              {/* 승하차 흐름 안내 */}
              <div className="boarding-flow-indicator">
                {selectedStops.length === 0 ? (
                  <span className="boarding-label boarding">
                    {currentTransport === 'subway' ? '승차역' : '승차 정류장'} 선택
                  </span>
                ) : (
                  <span className="boarding-label alighting">
                    {currentTransport === 'subway' ? '하차역 또는 환승역' : '하차 정류장'} 선택
                  </span>
                )}
              </div>

              <h1 className="apple-question">
                {selectedStops.length === 0
                  ? currentTransport === 'subway'
                    ? '어디서\n타시나요?'
                    : '어디서\n타시나요?'
                  : currentTransport === 'subway'
                    ? '어디서\n내리시나요?'
                    : '어디서\n내리시나요?'}
              </h1>

              {selectedStops.length > 0 && renderRouteSoFar()}

              <div className="apple-search-box">
                <span className="search-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                <input
                  id="stop-search"
                  type="text"
                  placeholder={currentTransport === 'subway' ? '역 이름으로 검색 (예: 강남)' : '정류장 이름으로 검색'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchStops(e.target.value);
                  }}
                  className="apple-search-input"
                  autoFocus
                  aria-label={currentTransport === 'subway' ? '지하철역 검색' : '버스 정류장 검색'}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setSearchQuery('');
                      setSubwayResults([]);
                      setBusResults([]);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {error && <div className="route-validation-error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {error}</div>}

              {isSearching && (
                <div className="apple-searching">검색 중...</div>
              )}

              {/* 지하철 검색 결과 - 그룹화된 역 표시 */}
              {currentTransport === 'subway' && groupedSubwayResults.length > 0 && (
                <ul className="search-results-list" role="listbox" aria-label="지하철역 검색 결과">
                  {groupedSubwayResults.map((grouped) => (
                    <li key={grouped.name} role="option" tabIndex={0}>
                      <button
                        type="button"
                        className="search-result-item"
                        onClick={() => handleStationClick(grouped)}
                        aria-label={`${grouped.name}역 ${grouped.lines.length > 1 ? `(${grouped.lines.length}개 호선)` : grouped.lines[0].line}`}
                      >
                        <span className="result-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg></span>
                        <span className="result-info">
                          <strong>{grouped.name}</strong>
                          <span className="result-detail">
                            {grouped.lines.length === 1
                              ? grouped.lines[0].line
                              : `${grouped.lines.map(l => l.line).join(', ')}`}
                          </span>
                        </span>
                        <span className="result-action" aria-hidden="true">
                          {grouped.lines.length > 1 ? '호선 선택 ▼' : '선택 →'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 버스 검색 결과 */}
              {busResults.length > 0 && (
                <ul className="search-results-list" role="listbox" aria-label="버스 정류장 검색 결과">
                  {busResults.map((stop) => (
                    <li key={stop.nodeId} role="option" tabIndex={0}>
                      <button
                        type="button"
                        className="search-result-item"
                        onClick={() => handleSelectBusStop(stop)}
                        aria-label={`${stop.name} 정류장 ${stop.stopNo ? `(${stop.stopNo})` : ''}`}
                      >
                        <span className="result-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg></span>
                        <span className="result-info">
                          <strong>{stop.name}</strong>
                          <span className="result-detail">{stop.stopNo || '정류장'}</span>
                        </span>
                        <span className="result-action" aria-hidden="true">선택 →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchQuery && !isSearching && groupedSubwayResults.length === 0 && busResults.length === 0 && (
                <div className="apple-no-results">
                  검색 결과가 없습니다
                </div>
              )}

              {!searchQuery && (
                <div className="apple-search-hint">
                  <p>{currentTransport === 'subway' ? '지하철역' : '버스 정류장'} 이름을 검색하세요</p>
                  <p className="hint-example">
                    {currentTransport === 'subway'
                      ? '예: 강남, 홍대입구, 여의도'
                      : '예: 강남역, 시청앞, 명동'}
                  </p>
                  {currentTransport === 'subway' && (
                    <p className="hint-note" style={{ marginTop: '0.5rem', color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                      역 이름 검색 후 원하는 호선을 선택할 수 있어요
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-secondary"
                onClick={() => setStep('select-transport')}
              >
                이전
              </button>
            </div>
          </section>
        )}

        {/* Step 4: 더 거쳐가나요? - 드래그앤드롭 가능 */}
        {step === 'ask-more' && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">다른 곳도<br />거쳐가시나요?</h1>

              {/* 현재까지 경로 표시 - 드래그앤드롭 */}
              <div className="apple-route-progress">
                <div className="progress-title">
                  지금까지 경로
                  {selectedStops.length > 1 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginLeft: '0.5rem' }}>
                      (드래그로 순서 변경)
                    </span>
                  )}
                </div>
                <div className="progress-route">
                  <span className="progress-point start">
                    {routeType === 'morning' ? '집' : '회사'}
                  </span>

                  {/* Sortable stops */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedStops.map(s => s.uniqueKey)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectedStops.map((stop, i) => (
                        <SortableStopItem
                          key={stop.uniqueKey}
                          stop={stop}
                          index={i}
                          onRemove={removeStop}
                          transferInfo={i > 0 ? getTransferInfo(selectedStops[i - 1], stop) : null}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  <div className="progress-segment">
                    <div className="progress-line dashed" />
                    <span className="progress-point end">
                      {routeType === 'morning' ? '회사' : '집'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 검증 경고 */}
              {warning && (
                <div className="route-validation-warning">
                  {warning}
                </div>
              )}

              <div className="apple-choice-cards">
                <button
                  type="button"
                  className="apple-choice-card"
                  onClick={() => setStep('select-transport')}
                >
                  <span className="choice-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
                  <span className="choice-text">
                    <strong>네, 더 있어요</strong>
                    <span>환승하거나 다른 곳을 거쳐요</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="apple-choice-card primary"
                  onClick={() => setStep('confirm')}
                >
                  <span className="choice-icon">✓</span>
                  <span className="choice-text">
                    <strong>아니요, 이게 끝이에요</strong>
                    <span>바로 목적지로 가요</span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Step 5: 최종 확인 */}
        {step === 'confirm' && selectedStops.length > 0 && (
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
                    const nextTransport = i < selectedStops.length - 1
                      ? selectedStops[i].transportMode
                      : selectedStops[i].transportMode;

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
                            {nextTransport === 'subway' ? '지하철' : '버스'}로 이동
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
                  onClick={() => setStep('ask-more')}
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
                  placeholder={generateRouteName(routeType, selectedStops)}
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
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
                    onChange={(e) => setCreateReverse(e.target.checked)}
                  />
                  <span>퇴근 경로도 자동으로 만들기 (역순)</span>
                </label>
              )}

              <div className="apple-info-card">
                <span className="info-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
                <p>소요시간은 실제 출퇴근을 기록하면서 자동으로 측정됩니다</p>
              </div>

              {error && <div className="apple-error">{error}</div>}
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-primary apple-btn-full"
                onClick={handleSave}
                disabled={isSaving || !validation.isValid}
              >
                {isSaving ? '저장 중...' : editingRoute ? '수정 완료' : (routeType === 'morning' && createReverse ? '경로 2개 저장' : '경로 저장')}
              </button>
            </div>
          </section>
        )}
      </main>
    );
  }

  // Helper: 경로에 연결된 알림 수
  const getRouteAlertCount = (routeId: string): number =>
    userAlerts.filter(a => a.routeId === routeId && a.enabled).length;

  // 경로 카드 렌더링 (중복 제거)
  const renderRouteCard = (route: RouteResponse): JSX.Element => {
    const alertCount = getRouteAlertCount(route.id);
    const isMorning = route.routeType === 'morning';
    return (
      <div key={route.id} className="route-card-v2" data-route-type={route.routeType}>
        <button
          type="button"
          className="route-card-v2-body"
          onClick={() => handleEditRoute(route)}
          aria-label={`${route.name} 수정하기`}
        >
          <div className="route-card-v2-top">
            <span className={`route-type-badge ${isMorning ? 'morning' : 'evening'}`}>
              {isMorning ? '출근' : '퇴근'}
            </span>
            {route.isPreferred && (
              <span className="route-preferred-badge">기본</span>
            )}
            {alertCount > 0 && (
              <span className="route-alert-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                </svg>
                {alertCount}
              </span>
            )}
          </div>
          <strong className="route-card-v2-name">{route.name}</strong>
          <span className="route-card-v2-path">{route.checkpoints.map(c => c.name).join(' → ')}</span>
          <span className="route-card-v2-meta">
            {(route.totalExpectedDuration ?? 0) > 0 ? `예상 ${route.totalExpectedDuration}분` : ''}
          </span>
        </button>
        <div className="route-card-v2-actions">
          <button
            type="button"
            className="route-card-v2-action"
            onClick={() => navigate('/commute', { state: { routeId: route.id } })}
            aria-label="출발하기"
            title="출발하기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
          <button type="button" className="route-card-v2-action" onClick={() => handleEditRoute(route)} aria-label="수정" title="수정">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button type="button" className="route-card-v2-action danger" onClick={() => handleDeleteClick(route)} aria-label="삭제" title="삭제">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // 메인 화면: 경로 목록
  return (
    <main className="page route-page-v2">
      <header className="route-page-v2-header">
        <h1>경로</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreating}>
          + 새 경로
        </button>
      </header>

      {/* Shared route banner */}
      {sharedRoute && userId && (
        <div className="shared-route-banner">
          <div className="shared-route-info">
            <strong>공유 경로</strong>
            <span>{sharedRoute.name}</span>
            <span className="muted">{sharedRoute.checkpoints.map(c => c.name).join(' → ')}</span>
          </div>
          <div className="shared-route-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleImportSharedRoute}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '내 경로에 추가'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSharedRoute(null)}
            >
              무시
            </button>
          </div>
        </div>
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
          <button type="button" className="btn btn-primary" onClick={startCreating}>
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
              aria-selected={routeTab === 'all'}
              className={`route-filter-tab ${routeTab === 'all' ? 'active' : ''}`}
              onClick={() => setRouteTab('all')}
            >
              전체 ({sortedRoutes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={routeTab === 'morning'}
              className={`route-filter-tab ${routeTab === 'morning' ? 'active' : ''}`}
              onClick={() => setRouteTab('morning')}
            >
              출근 ({sortedRoutes.filter(r => r.routeType === 'morning').length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={routeTab === 'evening'}
              className={`route-filter-tab ${routeTab === 'evening' ? 'active' : ''}`}
              onClick={() => setRouteTab('evening')}
            >
              퇴근 ({sortedRoutes.filter(r => r.routeType === 'evening').length})
            </button>
          </div>

          {filteredRoutes.length === 0 ? (
            <div className="route-filter-empty">
              <p>{routeTab === 'morning' ? '출근' : '퇴근'} 경로가 없어요</p>
            </div>
          ) : (
            filteredRoutes.map(renderRouteCard)
          )}
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
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        >
          <p>&ldquo;{deleteTarget.name}&rdquo; 경로를 삭제할까요?</p>
          <p className="muted">삭제 후에는 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}
    </main>
  );
}
