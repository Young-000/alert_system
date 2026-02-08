import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  alertApiClient,
  subwayApiClient,
  busApiClient,
} from '@infrastructure/api';
import type { Alert, AlertType, CreateAlertDto } from '@infrastructure/api';
import type { SubwayStation, BusStop } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';

type WizardStep = 'type' | 'transport' | 'station' | 'routine' | 'confirm';

interface TransportItem {
  type: 'subway' | 'bus';
  id: string;
  name: string;
  detail: string;
}

interface Routine {
  wakeUp: string;
  leaveHome: string;
  leaveWork: string;
}

export function AlertSettingsPage() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('type');
  const [wantsWeather, setWantsWeather] = useState(false);
  const [wantsTransport, setWantsTransport] = useState(false);
  const [transportTypes, setTransportTypes] = useState<('subway' | 'bus')[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TransportItem[]>([]);
  const [selectedTransports, setSelectedTransports] = useState<TransportItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 역→노선 2단계 선택용 state
  interface GroupedStation {
    name: string;
    lines: TransportItem[];
  }
  const [groupedStations, setGroupedStations] = useState<GroupedStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<GroupedStation | null>(null);

  // 중복 알림 에러용 state
  const [duplicateAlert, setDuplicateAlert] = useState<Alert | null>(null);

  // Routine state
  const [routine, setRoutine] = useState<Routine>({
    wakeUp: '07:00',
    leaveHome: '08:00',
    leaveWork: '18:00',
  });

  // Existing alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Alert | null>(null);
  const [editForm, setEditForm] = useState({ name: '', schedule: '' });
  const [isEditing, setIsEditing] = useState(false);

  // 경로 임포트용 state
  const [savedRoutes, setSavedRoutes] = useState<RouteResponse[]>([]);
  const [showRouteImport, setShowRouteImport] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null); // 연결된 경로 ID

  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  // Load existing alerts
  useEffect(() => {
    if (!userId) {
      setIsLoadingAlerts(false);
      return;
    }

    let isMounted = true;
    setIsLoadingAlerts(true);

    const fetchAlerts = async () => {
      try {
        const userAlerts = await alertApiClient.getAlertsByUser(userId);
        if (!isMounted) return;
        setAlerts(userAlerts);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load alerts:', err);
        setError('알림 목록을 불러오는데 실패했습니다.');
      } finally {
        if (isMounted) {
          setIsLoadingAlerts(false);
        }
      }
    };

    fetchAlerts();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load saved routes for import option
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    commuteApi.getUserRoutes(userId).then((routes) => {
      if (isMounted) setSavedRoutes(routes);
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  // Reload alerts helper function
  const reloadAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch (err) {
      console.error('Failed to reload alerts:', err);
    }
  }, [userId]);

  // Unified search for subway + bus (with grouping for 2-step selection)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setGroupedStations([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const searchTimeout = setTimeout(async () => {
      try {
        const results: TransportItem[] = [];

        // Search subway if selected
        if (transportTypes.includes('subway')) {
          const stations = await subwayApiClient.searchStations(searchQuery);
          stations.forEach((s: SubwayStation) => {
            results.push({
              type: 'subway',
              id: s.id,
              name: s.name,
              detail: s.line,
            });
          });
        }

        // Search bus if selected
        if (transportTypes.includes('bus')) {
          const stops = await busApiClient.searchStops(searchQuery);
          stops.forEach((s: BusStop) => {
            results.push({
              type: 'bus',
              id: s.nodeId,
              name: s.name,
              detail: `${s.stopNo} · ${s.stopType}`,
            });
          });
        }

        if (!controller.signal.aborted) {
          setSearchResults(results.slice(0, 15));

          // 지하철 역 그룹화 (같은 역 이름을 가진 노선들)
          if (transportTypes.includes('subway') && !transportTypes.includes('bus')) {
            const stationMap = new Map<string, TransportItem[]>();
            results.filter(r => r.type === 'subway').forEach(item => {
              const existing = stationMap.get(item.name) || [];
              stationMap.set(item.name, [...existing, item]);
            });
            const grouped: GroupedStation[] = Array.from(stationMap.entries()).map(([name, lines]) => ({
              name,
              lines,
            }));
            setGroupedStations(grouped);
          } else {
            setGroupedStations([]);
          }

          setIsSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setGroupedStations([]);
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(searchTimeout);
      controller.abort();
    };
  }, [searchQuery, transportTypes]);

  // Navigation
  const goNext = useCallback(() => {
    if (step === 'type') {
      if (wantsTransport) {
        setStep('transport');
      } else if (wantsWeather) {
        setStep('routine');
      }
    } else if (step === 'transport') {
      setStep('station');
    } else if (step === 'station') {
      setStep('routine');
    } else if (step === 'routine') {
      setStep('confirm');
    }
  }, [step, wantsTransport, wantsWeather]);

  const goBack = () => {
    if (step === 'transport') setStep('type');
    else if (step === 'station') setStep('transport');
    else if (step === 'routine') {
      if (wantsTransport) setStep('station');
      else setStep('type');
    }
    else if (step === 'confirm') setStep('routine');
  };

  const canProceed = () => {
    if (step === 'type') return wantsWeather || wantsTransport;
    if (step === 'transport') return transportTypes.length > 0;
    if (step === 'station') return selectedTransports.length > 0;
    if (step === 'routine') return true;
    return true;
  };

  // 경로에서 교통수단 임포트 + 경로 연결
  const importFromRoute = (route: RouteResponse) => {
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
      setSelectedTransports(transports);
      setWantsTransport(true);
      setSelectedRouteId(route.id); // 경로 ID 연결
      // 지하철/버스 종류 설정
      const hasSubway = transports.some(t => t.type === 'subway');
      const hasBus = transports.some(t => t.type === 'bus');
      const types: ('subway' | 'bus')[] = [];
      if (hasSubway) types.push('subway');
      if (hasBus) types.push('bus');
      setTransportTypes(types);
      // 루틴 단계로 이동
      setStep('routine');
      setShowRouteImport(false);
    }
  };

  // Toggle transport selection
  const toggleTransport = (item: TransportItem) => {
    setSelectedTransports((prev) => {
      const exists = prev.find((t) => t.id === item.id && t.type === item.type);
      if (exists) {
        return prev.filter((t) => !(t.id === item.id && t.type === item.type));
      }
      return [...prev, item];
    });
  };

  // Generate cron schedule from routine
  const generateSchedule = useCallback((): string => {
    const times: number[] = [];

    if (wantsWeather) {
      const [h] = routine.wakeUp.split(':');
      times.push(parseInt(h, 10)); // 정수로 변환하여 leading zero 제거
    }

    if (wantsTransport) {
      // 15 minutes before leaving
      const [leaveH, leaveM] = routine.leaveHome.split(':').map(Number);
      let notifyH = leaveH;
      let notifyM = leaveM - 15;
      if (notifyM < 0) {
        notifyM += 60;
        notifyH -= 1;
      }
      // Clamp to 0:00 instead of wrapping to previous day
      if (notifyH < 0) {
        notifyH = 0;
        notifyM = 0;
      }
      times.push(notifyH);

      const [workH, workM] = routine.leaveWork.split(':').map(Number);
      let workNotifyH = workH;
      let workNotifyM = workM - 15;
      if (workNotifyM < 0) {
        workNotifyM += 60;
        workNotifyH -= 1;
      }
      // Clamp to 0:00 instead of wrapping to previous day
      if (workNotifyH < 0) {
        workNotifyH = 0;
        workNotifyM = 0;
      }
      times.push(workNotifyH);
    }

    const uniqueHours = [...new Set(times)].sort((a, b) => a - b);
    return `0 ${uniqueHours.join(',')} * * *`;
  }, [wantsWeather, wantsTransport, routine]);

  // Generate alert name
  const generateAlertName = useCallback(() => {
    const parts: string[] = [];
    if (wantsWeather) parts.push('날씨');
    if (selectedTransports.length > 0) {
      parts.push(selectedTransports.map((t) => t.name).join(', '));
    }
    return `${parts.join(' + ')} 알림`;
  }, [wantsWeather, selectedTransports]);

  // Quick weather alert (one-click)
  const handleQuickWeatherAlert = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 중복 체크: 이미 "아침 날씨 알림"이 있는지 확인
    const existingAlert = alerts.find(a => a.name === '아침 날씨 알림');
    if (existingAlert) {
      setError('이미 아침 날씨 알림이 설정되어 있습니다.');
      // 기존 알림으로 스크롤
      setTimeout(() => {
        const alertsSection = document.querySelector('.existing-alerts');
        alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateAlertDto = {
        userId,
        name: '아침 날씨 알림',
        schedule: '0 8 * * *', // 매일 오전 8시
        alertTypes: ['weather', 'airQuality'],
      };

      await alertApiClient.createAlert(dto);
      setSuccess('✓ 날씨 알림이 설정되었습니다!');
      await reloadAlerts();

      // 설정된 알림 목록으로 스크롤
      setTimeout(() => {
        const alertsSection = document.querySelector('.existing-alerts');
        alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err: unknown) {
      console.error('Quick weather alert creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('권한이 없습니다. 다시 로그인해주세요.');
      } else {
        setError(`알림 생성에 실패했습니다: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, alerts, reloadAlerts]);

  // cron 스케줄 정규화 (비교용)
  const normalizeSchedule = useCallback((schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length < 5) return schedule;
    // Normalize: sort hours, keep minute as-is
    const minute = parts[0];
    const hours = parts[1].split(',').map(h => parseInt(h, 10)).filter(h => !isNaN(h)).sort((a, b) => a - b);
    return `${minute} ${hours.join(',')} ${parts.slice(2).join(' ')}`;
  }, []);

  // 중복 알림 체크 함수
  const checkDuplicateAlert = useCallback((schedule: string, alertTypes: AlertType[]): Alert | null => {
    const normalizedNew = normalizeSchedule(schedule);
    const newTypes = [...alertTypes].sort();

    return alerts.find(existing => {
      // 같은 스케줄 체크 (정규화된 전체 스케줄 비교)
      const normalizedExisting = normalizeSchedule(existing.schedule);
      if (normalizedNew !== normalizedExisting) return false;

      // 같은 알림 타입 조합 체크
      const existingTypes = [...existing.alertTypes].sort();
      const sameTypes = existingTypes.length === newTypes.length &&
        existingTypes.every((t, i) => t === newTypes[i]);

      return sameTypes;
    }) || null;
  }, [alerts, normalizeSchedule]);

  // Submit alert
  const handleSubmit = useCallback(async () => {
    setError('');
    setDuplicateAlert(null);

    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 알림 타입 생성
    const alertTypes: AlertType[] = [];
    if (wantsWeather) {
      alertTypes.push('weather', 'airQuality');
    }

    const subwayStation = selectedTransports.find((t) => t.type === 'subway');
    const busStop = selectedTransports.find((t) => t.type === 'bus');

    if (subwayStation) alertTypes.push('subway');
    if (busStop) alertTypes.push('bus');

    const schedule = generateSchedule();

    // 중복 체크
    const duplicate = checkDuplicateAlert(schedule, alertTypes);
    if (duplicate) {
      setDuplicateAlert(duplicate);
      // 스케줄에서 시간 추출
      const parts = duplicate.schedule.split(' ');
      const hours = parts[1]?.split(',').map(h => `${h.padStart(2, '0')}:00`).join(', ') || '';
      setError(`이미 같은 시간(${hours})에 동일한 알림이 있습니다.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateAlertDto = {
        userId,
        name: generateAlertName(),
        schedule,
        alertTypes,
        subwayStationId: subwayStation?.id,
        busStopId: busStop?.id,
        routeId: selectedRouteId || undefined, // 경로 연결
      };

      await alertApiClient.createAlert(dto);
      setSuccess('알림이 설정되었습니다! 알림톡으로 받아요.');
      reloadAlerts();

      // Reset wizard
      setTimeout(() => {
        setStep('type');
        setWantsWeather(false);
        setWantsTransport(false);
        setTransportTypes([]);
        setSelectedTransports([]);
        setSearchQuery('');
        setSelectedRouteId(null); // 경로 연결 초기화
        setSuccess('');
      }, 2000);
    } catch (err: unknown) {
      console.error('Alert creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('권한이 없습니다. 다시 로그인해주세요.');
      } else {
        setError(`알림 생성에 실패했습니다: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, wantsWeather, selectedTransports, generateAlertName, generateSchedule, reloadAlerts, checkDuplicateAlert, selectedRouteId]);

  const handleDeleteClick = (alert: Alert) => {
    setDeleteTarget({ id: alert.id, name: alert.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await alertApiClient.deleteAlert(deleteTarget.id);
      reloadAlerts();
      setDeleteTarget(null);
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleEditClick = (alert: Alert) => {
    setEditTarget(alert);
    // Parse schedule to extract time (e.g., "0 7 * * *" -> "07:00")
    const parts = alert.schedule.split(' ');
    let time = '07:00';
    if (parts.length >= 2) {
      const minute = parts[0].padStart(2, '0');
      const hour = parts[1].split(',')[0].padStart(2, '0');
      time = `${hour}:${minute}`;
    }
    setEditForm({ name: alert.name, schedule: time });
  };

  const handleEditConfirm = async () => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      // Convert time to cron format
      const [hour, minute] = editForm.schedule.split(':');
      const cronSchedule = `${parseInt(minute)} ${parseInt(hour)} * * *`;

      await alertApiClient.updateAlert(editTarget.id, {
        name: editForm.name,
        schedule: cronSchedule,
      });
      reloadAlerts();
      setEditTarget(null);
      setSuccess('알림이 수정되었습니다.');
      setTimeout(() => setSuccess(''), 2000);
    } catch {
      setError('수정에 실패했습니다.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditCancel = useCallback(() => {
    setEditTarget(null);
  }, []);

  // ESC key to close modal
  useEffect(() => {
    if (!deleteTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDeleteCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget, handleDeleteCancel]);

  // Enter key to proceed to next step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if modal is open or in input/textarea
      if (deleteTarget) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Inline canProceed check
      const canProceedNow = (() => {
        if (step === 'type') return wantsWeather || wantsTransport;
        if (step === 'transport') return transportTypes.length > 0;
        if (step === 'station') return selectedTransports.length > 0;
        return true;
      })();

      if (e.key === 'Enter' && canProceedNow) {
        e.preventDefault();
        if (step === 'confirm' && !isSubmitting && !success) {
          handleSubmit();
        } else if (step !== 'confirm') {
          goNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [step, deleteTarget, isSubmitting, success, wantsWeather, wantsTransport, transportTypes.length, selectedTransports.length, goNext, handleSubmit]);

  // Calculate notification times for display
  const getNotificationTimes = () => {
    const times: { time: string; content: string }[] = [];

    if (wantsWeather) {
      times.push({
        time: routine.wakeUp,
        content: '오늘 날씨 + 미세먼지',
      });
    }

    if (wantsTransport && selectedTransports.length > 0) {
      const [h, m] = routine.leaveHome.split(':').map(Number);
      let notifyM = m - 15;
      let notifyH = h;
      if (notifyM < 0) { notifyM += 60; notifyH -= 1; }
      if (notifyH < 0) { notifyH = 0; notifyM = 0; }
      times.push({
        time: `${String(notifyH).padStart(2, '0')}:${String(notifyM).padStart(2, '0')}`,
        content: `출근길 교통 (${selectedTransports.map((t) => t.name).join(', ')})`,
      });

      const [wh, wm] = routine.leaveWork.split(':').map(Number);
      let workNotifyM = wm - 15;
      let workNotifyH = wh;
      if (workNotifyM < 0) { workNotifyM += 60; workNotifyH -= 1; }
      if (workNotifyH < 0) { workNotifyH = 0; workNotifyM = 0; }
      times.push({
        time: `${String(workNotifyH).padStart(2, '0')}:${String(workNotifyM).padStart(2, '0')}`,
        content: '퇴근길 교통',
      });
    }

    return times.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Progress indicator
  const getProgress = () => {
    const steps: WizardStep[] = ['type'];
    if (wantsTransport) {
      steps.push('transport', 'station');
    }
    steps.push('routine', 'confirm');

    const current = steps.indexOf(step) + 1;
    return { current, total: steps.length };
  };

  const progress = getProgress();

  return (
    <main className="page">
      <a href="#wizard-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <nav className="nav">
        <div className="brand">
          <strong>출퇴근 메이트</strong>
          <span>출퇴근 알림</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/">홈</Link>
          {userId ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                localStorage.removeItem('userId');
                localStorage.removeItem('accessToken');
                window.location.href = '/';
              }}
            >
              로그아웃
            </button>
          ) : (
            <Link className="btn btn-outline" to="/login">로그인</Link>
          )}
        </div>
      </nav>

      {!userId && (
        <div className="notice warning">
          먼저 계정을 만들어주세요.
        </div>
      )}

      {/* 초기 로딩 상태 표시 */}
      {isLoadingAlerts && userId && (
        <div className="loading-container" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>서버에 연결 중입니다...</p>
          <p className="muted">최대 30초가 소요될 수 있습니다</p>
        </div>
      )}

      {/* 상단 알림 미리보기 - 설정된 알림이 있을 때만 표시 */}
      {!isLoadingAlerts && alerts.length > 0 && (
        <section className="alerts-preview-top">
          <div className="preview-header-row">
            <h2>내 알림</h2>
            <span className="preview-count">{alerts.filter(a => a.enabled).length}개 활성</span>
          </div>
          <div className="preview-alerts-list">
            {alerts.slice(0, 3).map((alert) => {
              const parts = alert.schedule.split(' ');
              const hours = parts.length >= 2
                ? parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`)
                : ['--:--'];
              return (
                <div
                  key={alert.id}
                  className={`preview-alert-chip ${alert.enabled ? 'active' : 'inactive'}`}
                >
                  <span className="chip-icon">
                    {alert.alertTypes.includes('weather') ? '🌤️' : '🚇'}
                  </span>
                  <span className="chip-name">{alert.name}</span>
                  <span className="chip-time">{hours[0]}</span>
                  <label className="toggle-mini">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={async () => {
                        try {
                          await alertApiClient.toggleAlert(alert.id);
                          reloadAlerts();
                        } catch {
                          setError('알림 상태 변경에 실패했습니다.');
                        }
                      }}
                      aria-label={`${alert.name} ${alert.enabled ? '끄기' : '켜기'}`}
                    />
                    <span className="toggle-slider-mini" />
                  </label>
                </div>
              );
            })}
            {alerts.length > 3 && (
              <a href="#existing-alerts-section" className="preview-more-link">
                +{alerts.length - 3}개 더보기
              </a>
            )}
          </div>
        </section>
      )}

      <div id="wizard-content" className="wizard-container" style={{ display: isLoadingAlerts && userId ? 'none' : undefined }}>
        {/* 개선된 스텝 인디케이터 */}
        <div className="step-indicator" role="navigation" aria-label="설정 단계">
          <div className={`step-item ${progress.current >= 1 ? 'active' : ''} ${progress.current > 1 ? 'completed' : ''}`}>
            <div className="step-number">{progress.current > 1 ? '✓' : '1'}</div>
            <div className="step-label">유형</div>
          </div>
          <div className="step-connector" />
          {wantsTransport && (
            <>
              <div className={`step-item ${progress.current >= 2 ? 'active' : ''} ${progress.current > 2 ? 'completed' : ''}`}>
                <div className="step-number">{progress.current > 2 ? '✓' : '2'}</div>
                <div className="step-label">교통</div>
              </div>
              <div className="step-connector" />
              <div className={`step-item ${progress.current >= 3 ? 'active' : ''} ${progress.current > 3 ? 'completed' : ''}`}>
                <div className="step-number">{progress.current > 3 ? '✓' : '3'}</div>
                <div className="step-label">역</div>
              </div>
              <div className="step-connector" />
            </>
          )}
          <div className={`step-item ${step === 'routine' || step === 'confirm' ? 'active' : ''} ${step === 'confirm' ? 'completed' : ''}`}>
            <div className="step-number">{step === 'confirm' ? '✓' : (wantsTransport ? '4' : '2')}</div>
            <div className="step-label">시간</div>
          </div>
          <div className="step-connector" />
          <div className={`step-item ${step === 'confirm' ? 'active' : ''}`}>
            <div className="step-number">{wantsTransport ? '5' : '3'}</div>
            <div className="step-label">확인</div>
          </div>
        </div>
        <p className="progress-text">{progress.current} / {progress.total} 단계</p>

        {/* Step: Type Selection */}
        {step === 'type' && (
          <section className="wizard-step">
            {/* 알림톡 안내 배너 */}
            <div className="alimtalk-banner">
              <span className="alimtalk-icon" aria-hidden="true">📱</span>
              <div className="alimtalk-text">
                <strong>카카오 알림톡으로 알림을 받아요</strong>
                <span className="muted">회원가입 시 등록한 전화번호로 발송됩니다</span>
              </div>
            </div>

            {/* Quick Action: One-click Weather Alert */}
            <div className="quick-action-card">
              <div className="quick-action-content">
                <span className="quick-action-icon" aria-hidden="true">🌤️</span>
                <div className="quick-action-text">
                  <strong>날씨 알림 바로 시작</strong>
                  <span className="muted">매일 오전 8시 날씨 + 미세먼지 알림톡</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={handleQuickWeatherAlert}
                disabled={isSubmitting || !userId}
              >
                {isSubmitting ? '설정 중...' : '원클릭 설정'}
              </button>
            </div>

            {/* Quick action feedback messages - 토스트 스타일 */}
            <div aria-live="polite" aria-atomic="true" className="toast-container">
              {error && (
                <div className="toast toast-error" role="alert">
                  <span className="toast-icon" aria-hidden="true">⚠️</span>
                  <span className="toast-message">{error}</span>
                  <button
                    type="button"
                    className="toast-close"
                    onClick={() => setError('')}
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>
              )}
              {success && (
                <div className="toast toast-success" role="status">
                  <span className="toast-icon" aria-hidden="true">✅</span>
                  <span className="toast-message">{success}</span>
                </div>
              )}
            </div>

            <div className="divider-text">
              <span>또는 직접 설정</span>
            </div>

            <h1>어떤 정보를 받고 싶으세요?</h1>
            <p className="muted">복수 선택 가능해요</p>

            <div className="choice-grid" role="group" aria-label="알림 유형 선택">
              <button
                type="button"
                className={`choice-card ${wantsWeather ? 'active' : ''}`}
                onClick={() => setWantsWeather(!wantsWeather)}
                aria-pressed={wantsWeather}
                aria-label="날씨 알림 선택"
              >
                <span className="choice-icon" aria-hidden="true">🌤️</span>
                <span className="choice-title">날씨</span>
                <span className="choice-desc">오늘 뭐 입지? 우산 필요해?</span>
              </button>

              <button
                type="button"
                className={`choice-card ${wantsTransport ? 'active' : ''}`}
                onClick={() => setWantsTransport(!wantsTransport)}
                aria-pressed={wantsTransport}
                aria-label="교통 알림 선택"
              >
                <span className="choice-icon" aria-hidden="true">🚇</span>
                <span className="choice-title">교통</span>
                <span className="choice-desc">지하철/버스 실시간 도착</span>
              </button>
            </div>
          </section>
        )}

        {/* Step: Transport Type */}
        {step === 'transport' && (
          <section className="wizard-step">
            <h1>어떤 교통수단을 이용하세요?</h1>
            <p className="muted">복수 선택 가능해요</p>

            {/* 경로에서 가져오기 옵션 */}
            {savedRoutes.length > 0 && !showRouteImport && (
              <div className="route-import-banner">
                <span className="import-icon">📍</span>
                <div className="import-text">
                  <strong>저장된 경로에서 가져오기</strong>
                  <span className="muted">기존 출퇴근 경로의 역/정류장을 사용해요</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowRouteImport(true)}
                >
                  선택
                </button>
              </div>
            )}

            {/* 경로 선택 목록 */}
            {showRouteImport && (
              <div className="route-import-list">
                <div className="import-list-header">
                  <h3>경로 선택</h3>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowRouteImport(false)}
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>
                {savedRoutes.map(route => {
                  const subwayStops = route.checkpoints.filter(c => c.checkpointType === 'subway');
                  const busStops = route.checkpoints.filter(c => c.checkpointType === 'bus_stop');
                  if (subwayStops.length === 0 && busStops.length === 0) return null;

                  return (
                    <button
                      key={route.id}
                      type="button"
                      className="route-import-item"
                      onClick={() => importFromRoute(route)}
                    >
                      <span className="route-icon">
                        {route.routeType === 'morning' ? '🌅' : '🌆'}
                      </span>
                      <div className="route-import-info">
                        <span className="route-name">{route.name}</span>
                        <span className="route-stops">
                          {subwayStops.map(s => `🚇${s.name}`).join(' ')}
                          {busStops.map(s => `🚌${s.name}`).join(' ')}
                        </span>
                      </div>
                      <span className="route-action">사용 →</span>
                    </button>
                  );
                })}
              </div>
            )}

            {!showRouteImport && (
              <div className="divider-text">
                <span>또는 직접 선택</span>
              </div>
            )}

            <div className="choice-grid" role="group" aria-label="교통수단 선택">
              <button
                type="button"
                className={`choice-card ${transportTypes.includes('subway') ? 'active' : ''}`}
                onClick={() => {
                  setTransportTypes((prev) =>
                    prev.includes('subway')
                      ? prev.filter((t) => t !== 'subway')
                      : [...prev, 'subway']
                  );
                }}
                aria-pressed={transportTypes.includes('subway')}
                aria-label="지하철 선택"
              >
                <span className="choice-icon" aria-hidden="true">🚇</span>
                <span className="choice-title">지하철</span>
              </button>

              <button
                type="button"
                className={`choice-card ${transportTypes.includes('bus') ? 'active' : ''}`}
                onClick={() => {
                  setTransportTypes((prev) =>
                    prev.includes('bus')
                      ? prev.filter((t) => t !== 'bus')
                      : [...prev, 'bus']
                  );
                }}
                aria-pressed={transportTypes.includes('bus')}
                aria-label="버스 선택"
              >
                <span className="choice-icon" aria-hidden="true">🚌</span>
                <span className="choice-title">버스</span>
              </button>
            </div>
          </section>
        )}

        {/* Step: Station Search */}
        {step === 'station' && (
          <section className="wizard-step">
            <h1>자주 이용하는 역/정류장을 검색하세요</h1>
            <p className="muted">출근길에 이용하는 곳을 선택해주세요</p>

            {/* 경로에서 빠른 선택 - 첫 번째 역/정류장 */}
            {savedRoutes.length > 0 && selectedTransports.length === 0 && !selectedStation && (() => {
              const routeStops: { route: RouteResponse; stop: TransportItem }[] = [];
              savedRoutes.forEach(route => {
                const firstSubway = route.checkpoints.find(c => c.checkpointType === 'subway' && c.linkedStationId);
                const firstBus = route.checkpoints.find(c => c.checkpointType === 'bus_stop' && c.linkedBusStopId);

                if (transportTypes.includes('subway') && firstSubway && firstSubway.linkedStationId) {
                  routeStops.push({
                    route,
                    stop: {
                      type: 'subway',
                      id: firstSubway.linkedStationId,
                      name: firstSubway.name,
                      detail: firstSubway.lineInfo || '',
                    },
                  });
                }
                if (transportTypes.includes('bus') && firstBus && firstBus.linkedBusStopId) {
                  routeStops.push({
                    route,
                    stop: {
                      type: 'bus',
                      id: firstBus.linkedBusStopId,
                      name: firstBus.name,
                      detail: '',
                    },
                  });
                }
              });

              if (routeStops.length === 0) return null;

              return (
                <div className="quick-select-section">
                  <p className="quick-select-label">내 경로에서 빠른 선택</p>
                  <div className="quick-select-list">
                    {routeStops.slice(0, 3).map(({ route, stop }) => (
                      <button
                        key={`${route.id}-${stop.id}`}
                        type="button"
                        className="quick-select-btn"
                        onClick={() => {
                          toggleTransport(stop);
                        }}
                      >
                        <span className="qs-icon">{stop.type === 'subway' ? '🚇' : '🚌'}</span>
                        <span className="qs-name">{stop.name}</span>
                        <span className="qs-route">{route.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 역 선택 후 노선 선택 UI (2단계) */}
            {selectedStation ? (
              <div className="line-selection-step">
                <button
                  type="button"
                  className="back-to-search"
                  onClick={() => setSelectedStation(null)}
                  aria-label="역 선택으로 돌아가기"
                >
                  ← {selectedStation.name}역
                </button>
                <h3 className="line-selection-title">노선을 선택하세요</h3>
                <div className="line-grid" role="radiogroup" aria-label="노선 선택">
                  {selectedStation.lines.map((line) => {
                    const isSelected = selectedTransports.some(
                      (t) => t.id === line.id && t.type === line.type
                    );
                    return (
                      <button
                        key={`${line.type}-${line.id}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`line-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          toggleTransport(line);
                          setSelectedStation(null);
                          setSearchQuery('');
                        }}
                      >
                        {line.detail}
                        {isSelected && <span className="check-sm">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="search-box">
                  <span className="search-icon" aria-hidden="true">🔍</span>
                  <input
                    type="search"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="예: 강남역, 홍대입구"
                    autoFocus
                    aria-label="역 또는 정류장 검색"
                    autoComplete="off"
                  />
                </div>

                <div aria-live="polite" aria-busy={isSearching}>
                  {isSearching && <p className="muted">검색 중...</p>}
                </div>

                {/* 지하철만 선택 시: 역 그룹 먼저 표시 */}
                {groupedStations.length > 0 && transportTypes.length === 1 && transportTypes[0] === 'subway' ? (
                  <div className="search-results station-groups" role="listbox" aria-label="역 검색 결과">
                    {groupedStations.map((station) => (
                      <button
                        key={station.name}
                        type="button"
                        role="option"
                        className="search-result-item station-group-item"
                        onClick={() => {
                          if (station.lines.length === 1) {
                            // 노선이 1개면 바로 선택
                            toggleTransport(station.lines[0]);
                            setSearchQuery('');
                          } else {
                            // 노선이 여러 개면 2단계로
                            setSelectedStation(station);
                          }
                        }}
                      >
                        <span className="result-icon" aria-hidden="true">🚇</span>
                        <div className="result-info">
                          <strong>{station.name}역</strong>
                          <span className="muted line-count">{station.lines.length}개 노선</span>
                        </div>
                        <span className="arrow-icon" aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  // 버스 포함 또는 일반 검색 결과
                  <div className="search-results" role="listbox" aria-label="검색 결과">
                    {searchResults.map((item) => {
                      const isSelected = selectedTransports.some(
                        (t) => t.id === item.id && t.type === item.type
                      );
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`search-result-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleTransport(item)}
                        >
                          <span className="result-icon" aria-hidden="true">
                            {item.type === 'subway' ? '🚇' : '🚌'}
                          </span>
                          <div className="result-info">
                            <strong>{item.name}</strong>
                            <span className="muted">{item.detail}</span>
                          </div>
                          {isSelected && <span className="check-icon" aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.length >= 2 && !isSearching ? (
                  <div className="empty-state" role="status">
                    <span className="empty-icon" aria-hidden="true">🔍</span>
                    <p className="empty-title">검색 결과가 없습니다</p>
                    <p className="empty-desc">
                      &quot;{searchQuery}&quot;에 해당하는 {transportTypes.includes('subway') && transportTypes.includes('bus') ? '역/정류장' : transportTypes.includes('subway') ? '역' : '정류장'}을 찾을 수 없어요.
                      <br />
                      다른 이름으로 검색해보세요.
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {selectedTransports.length > 0 && (
              <div className="selected-items">
                <p className="muted">선택됨:</p>
                <div className="selected-tags">
                  {selectedTransports.map((item) => (
                    <span key={`${item.type}-${item.id}`} className="tag">
                      {item.type === 'subway' ? '🚇' : '🚌'} {item.name}
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => toggleTransport(item)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step: Routine */}
        {step === 'routine' && (
          <section className="wizard-step">
            <h1>하루 루틴을 알려주세요</h1>
            <p className="muted">알림 시간을 자동으로 설정해드려요</p>

            <div className="routine-form">
              {wantsWeather && (
                <div className="routine-item">
                  <div className="routine-header">
                    <span className="routine-icon" aria-hidden="true">⏰</span>
                    <label htmlFor="wake-up-time">기상 시간</label>
                  </div>
                  <div className="time-picker">
                    <input
                      id="wake-up-time"
                      type="time"
                      value={routine.wakeUp}
                      onChange={(e) => setRoutine({ ...routine, wakeUp: e.target.value })}
                      className="time-input"
                    />
                    <div className="time-display">
                      <span className="time-value">{routine.wakeUp}</span>
                      <span className="time-period">{parseInt(routine.wakeUp.split(':')[0]) < 12 ? '오전' : '오후'}</span>
                    </div>
                  </div>
                </div>
              )}

              {wantsTransport && (
                <>
                  <div className="routine-item">
                    <div className="routine-header">
                      <span className="routine-icon" aria-hidden="true">🚪</span>
                      <label htmlFor="leave-home-time">출근 출발</label>
                    </div>
                    <div className="time-picker">
                      <input
                        id="leave-home-time"
                        type="time"
                        value={routine.leaveHome}
                        onChange={(e) => setRoutine({ ...routine, leaveHome: e.target.value })}
                        className="time-input"
                      />
                      <div className="time-display">
                        <span className="time-value">{routine.leaveHome}</span>
                        <span className="time-period">{parseInt(routine.leaveHome.split(':')[0]) < 12 ? '오전' : '오후'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="routine-item">
                    <div className="routine-header">
                      <span className="routine-icon" aria-hidden="true">🏠</span>
                      <label htmlFor="leave-work-time">퇴근 출발</label>
                    </div>
                    <div className="time-picker">
                      <input
                        id="leave-work-time"
                        type="time"
                        value={routine.leaveWork}
                        onChange={(e) => setRoutine({ ...routine, leaveWork: e.target.value })}
                        className="time-input"
                      />
                      <div className="time-display">
                        <span className="time-value">{routine.leaveWork}</span>
                        <span className="time-period">{parseInt(routine.leaveWork.split(':')[0]) < 12 ? '오전' : '오후'}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 알림 미리보기 */}
            <div className="alert-preview-card">
              <div className="preview-header">
                <span className="preview-icon" aria-hidden="true">📬</span>
                <h3>알림 미리보기</h3>
              </div>
              <div className="preview-list">
                {getNotificationTimes().map((item, i) => (
                  <div key={i} className="preview-item">
                    <span className="preview-time">{item.time}</span>
                    <span className="preview-content">{item.content}</span>
                  </div>
                ))}
              </div>
              <p className="preview-note">
                <span aria-hidden="true">💡</span> 교통 알림은 출발 15분 전에 발송됩니다
              </p>
            </div>
          </section>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <section className="wizard-step">
            <h1>설정을 확인해주세요</h1>

            <div className="confirm-card">
              <div className="confirm-section">
                <h3>📋 알림 내용</h3>
                <div className="confirm-items">
                  {wantsWeather && <span className="confirm-tag">🌤️ 날씨</span>}
                  {wantsWeather && <span className="confirm-tag">💨 미세먼지</span>}
                  {selectedTransports.map((t) => (
                    <span key={`${t.type}-${t.id}`} className="confirm-tag">
                      {t.type === 'subway' ? '🚇' : '🚌'} {t.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="confirm-section">
                <h3>⏰ 알림 시간</h3>
                {getNotificationTimes().map((item, i) => (
                  <div key={i} className="confirm-time">
                    <strong>{item.time}</strong>
                    <span>{item.content}</span>
                  </div>
                ))}
              </div>

              <div className="confirm-section">
                <h3>📱 알림 방법</h3>
                <div className="delivery-methods">
                  <div className="delivery-method">
                    <span className="delivery-icon">💬</span>
                    <span>카카오 알림톡</span>
                    <span className="badge badge-primary">기본</span>
                  </div>
                </div>
                <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  회원가입 시 등록한 전화번호로 알림톡이 발송됩니다
                </p>
              </div>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {error && duplicateAlert ? (
                <div className="duplicate-alert-warning" role="alert">
                  <p className="warning-message">{error}</p>
                  <p className="warning-suggestion">시간을 변경하거나 기존 알림을 수정해주세요.</p>
                  <div className="duplicate-alert-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        // 기존 알림 수정 모드로 전환
                        handleEditClick(duplicateAlert);
                        setDuplicateAlert(null);
                        setError('');
                        // wizard 초기화하고 기존 알림 목록으로 스크롤
                        setStep('type');
                        setWantsWeather(false);
                        setWantsTransport(false);
                        setTransportTypes([]);
                        setSelectedTransports([]);
                        setTimeout(() => {
                          const alertsSection = document.querySelector('.existing-alerts');
                          alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                    >
                      기존 알림 수정하기
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setDuplicateAlert(null);
                        setError('');
                        setStep('routine'); // 시간 설정 단계로 돌아가기
                      }}
                    >
                      시간 변경하기
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="notice error" role="alert">{error}</div>
              ) : null}
              {success && <div className="notice success" role="status">{success}</div>}
            </div>
          </section>
        )}

        {/* Navigation Buttons */}
        <div className="wizard-nav">
          {step !== 'type' && (
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              ← 이전
            </button>
          )}

          {step !== 'confirm' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={goNext}
              disabled={!canProceed()}
            >
              다음 →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !!success}
            >
              {success ? (
                '✓ 완료!'
              ) : isSubmitting ? (
                <>
                  <span className="spinner spinner-sm" aria-hidden="true" />
                  저장 중...
                </>
              ) : (
                '알림 시작하기'
              )}
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        {canProceed() && !success && (
          <p className="keyboard-hint" aria-hidden="true">
            <kbd>Enter</kbd> 키로 다음 단계로 이동
          </p>
        )}
      </div>

      {/* Existing Alerts - 개선된 UI */}
      {alerts.length > 0 && (
        <section id="existing-alerts-section" className="existing-alerts">
          <div className="section-header-row">
            <h2>설정된 알림</h2>
            <span className="section-count">{alerts.filter(a => a.enabled).length}/{alerts.length} 활성</span>
          </div>
          <div className="alert-list-improved">
            {alerts.map((alert) => {
              // 시간 파싱
              const parts = alert.schedule.split(' ');
              const hours = parts.length >= 2
                ? parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`)
                : ['--:--'];

              return (
                <article
                  key={alert.id}
                  className={`alert-item-card ${alert.enabled ? 'enabled' : 'disabled'}`}
                >
                  <div className="alert-item-header">
                    <div className="alert-time-badges">
                      {hours.map((time, i) => (
                        <span key={i} className="alert-time-badge">{time}</span>
                      ))}
                    </div>
                    <label className="toggle-compact">
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={async () => {
                          try {
                            await alertApiClient.toggleAlert(alert.id);
                            reloadAlerts();
                          } catch {
                            setError('알림 상태 변경에 실패했습니다.');
                          }
                        }}
                        aria-label={`${alert.name} ${alert.enabled ? '끄기' : '켜기'}`}
                      />
                      <span className="toggle-slider-compact" />
                    </label>
                  </div>
                  <div className="alert-item-body">
                    <span className="alert-name">{alert.name}</span>
                    <div className="alert-meta">
                      <span className="alert-types">
                        {alert.alertTypes.map((type) => {
                          if (type === 'weather') return '🌤️';
                          if (type === 'airQuality') return '💨';
                          if (type === 'subway') return '🚇';
                          if (type === 'bus') return '🚌';
                          return '';
                        }).join(' ')}
                      </span>
                      {alert.routeId && (() => {
                        const linkedRoute = savedRoutes.find(r => r.id === alert.routeId);
                        if (linkedRoute) {
                          return (
                            <span className="alert-route-link">
                              📍 {linkedRoute.name}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="alert-item-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleEditClick(alert)}
                      aria-label="수정"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => handleDeleteClick(alert)}
                      aria-label="삭제"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={handleDeleteCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon danger" aria-hidden="true">⚠️</div>
              <h2 id="delete-modal-title" className="modal-title">알림 삭제</h2>
            </div>
            <p className="modal-body">
              &quot;{deleteTarget.name}&quot; 알림을 삭제하시겠습니까?
              <br />
              삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="modal-overlay"
          onClick={handleEditCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon" aria-hidden="true">✏️</div>
              <h2 id="edit-modal-title" className="modal-title">알림 수정</h2>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-name">알림 이름</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="form-input"
                  placeholder="알림 이름"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-schedule">알림 시간</label>
                <input
                  id="edit-schedule"
                  type="time"
                  value={editForm.schedule}
                  onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                  className="form-input"
                />
              </div>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                알림 유형 변경은 새로운 알림을 생성해주세요.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleEditCancel}
                disabled={isEditing}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditConfirm}
                disabled={isEditing || !editForm.name.trim()}
              >
                {isEditing ? (
                  <>
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p className="footer-text">
          <span>출퇴근 메이트</span>
          <span className="footer-divider">·</span>
          <span>출퇴근 알림 서비스</span>
        </p>
        <p className="footer-copyright">© 2025 All rights reserved</p>
      </footer>
    </main>
  );
}
