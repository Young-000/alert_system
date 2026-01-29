import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  alertApiClient,
  subwayApiClient,
  busApiClient,
} from '@infrastructure/api';
import type { Alert, AlertType, CreateAlertDto } from '@infrastructure/api';
import type { SubwayStation, BusStop } from '@infrastructure/api';

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

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  weather: '날씨',
  airQuality: '미세먼지',
  subway: '지하철',
  bus: '버스',
};

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

  const userId = localStorage.getItem('userId') || '';

  // Load existing alerts
  const loadAlerts = useCallback(async () => {
    if (!userId) {
      setIsLoadingAlerts(false);
      return;
    }
    setIsLoadingAlerts(true);
    try {
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('알림 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Unified search for subway + bus
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
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
          setIsSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
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
    const times: string[] = [];

    if (wantsWeather) {
      const [h] = routine.wakeUp.split(':');
      times.push(h);
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
      times.push(String(notifyH));

      const [workH, workM] = routine.leaveWork.split(':').map(Number);
      let workNotifyH = workH;
      let workNotifyM = workM - 15;
      if (workNotifyM < 0) {
        workNotifyM += 60;
        workNotifyH -= 1;
      }
      times.push(String(workNotifyH));
    }

    const uniqueHours = [...new Set(times)].sort((a, b) => Number(a) - Number(b));
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

    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateAlertDto = {
        userId,
        name: '아침 날씨 알림',
        schedule: '0 7 * * *', // 매일 오전 7시
        alertTypes: ['weather', 'airQuality'],
      };

      await alertApiClient.createAlert(dto);
      setSuccess('날씨 알림이 설정되었습니다! 매일 오전 7시에 알림톡을 받습니다.');
      loadAlerts();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch {
      setError('알림 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, loadAlerts]);

  // Submit alert
  const handleSubmit = useCallback(async () => {
    setError('');

    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const alertTypes: AlertType[] = [];
      if (wantsWeather) {
        alertTypes.push('weather', 'airQuality');
      }

      const subwayStation = selectedTransports.find((t) => t.type === 'subway');
      const busStop = selectedTransports.find((t) => t.type === 'bus');

      if (subwayStation) alertTypes.push('subway');
      if (busStop) alertTypes.push('bus');

      const dto: CreateAlertDto = {
        userId,
        name: generateAlertName(),
        schedule: generateSchedule(),
        alertTypes,
        subwayStationId: subwayStation?.id,
        busStopId: busStop?.id,
      };

      await alertApiClient.createAlert(dto);
      setSuccess('알림이 설정되었습니다! 알림톡으로 받아요.');
      loadAlerts();

      // Reset wizard
      setTimeout(() => {
        setStep('type');
        setWantsWeather(false);
        setWantsTransport(false);
        setTransportTypes([]);
        setSelectedTransports([]);
        setSearchQuery('');
        setSuccess('');
      }, 2000);
    } catch {
      setError('알림 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, wantsWeather, selectedTransports, generateAlertName, generateSchedule, loadAlerts]);

  const handleDeleteClick = (alert: Alert) => {
    setDeleteTarget({ id: alert.id, name: alert.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await alertApiClient.deleteAlert(deleteTarget.id);
      loadAlerts();
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
      loadAlerts();
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
      times.push({
        time: `${String(notifyH).padStart(2, '0')}:${String(notifyM).padStart(2, '0')}`,
        content: `출근길 교통 (${selectedTransports.map((t) => t.name).join(', ')})`,
      });

      const [wh, wm] = routine.leaveWork.split(':').map(Number);
      let workNotifyM = wm - 15;
      let workNotifyH = wh;
      if (workNotifyM < 0) { workNotifyM += 60; workNotifyH -= 1; }
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
          <strong>Alert System</strong>
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

      <div id="wizard-content" className="wizard-container" style={{ display: isLoadingAlerts && userId ? 'none' : undefined }}>
        {/* Progress Bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
        <p className="progress-text">{progress.current} / {progress.total}</p>

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
                  <span className="muted">매일 오전 7시 날씨 + 미세먼지 알림톡</span>
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

            {searchResults.length > 0 ? (
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
                  <span className="routine-icon">⏰</span>
                  <label>기상 시간</label>
                  <input
                    type="time"
                    value={routine.wakeUp}
                    onChange={(e) => setRoutine({ ...routine, wakeUp: e.target.value })}
                  />
                </div>
              )}

              {wantsTransport && (
                <>
                  <div className="routine-item">
                    <span className="routine-icon">🚪</span>
                    <label>출근 출발</label>
                    <input
                      type="time"
                      value={routine.leaveHome}
                      onChange={(e) => setRoutine({ ...routine, leaveHome: e.target.value })}
                    />
                  </div>

                  <div className="routine-item">
                    <span className="routine-icon">🏠</span>
                    <label>퇴근 출발</label>
                    <input
                      type="time"
                      value={routine.leaveWork}
                      onChange={(e) => setRoutine({ ...routine, leaveWork: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="schedule-preview">
              <h3>📬 알림 스케줄</h3>
              {getNotificationTimes().map((item, i) => (
                <div key={i} className="schedule-item">
                  <span className="schedule-time">{item.time}</span>
                  <span className="schedule-content">{item.content}</span>
                </div>
              ))}
              <p className="muted schedule-note">* 교통 알림은 출발 15분 전에 발송됩니다</p>
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
              {error && <div className="notice error" role="alert">{error}</div>}
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

      {/* Existing Alerts */}
      {alerts.length > 0 && (
        <section className="existing-alerts">
          <h2>설정된 알림</h2>
          <div className="alert-list">
            {alerts.map((alert) => (
              <article key={alert.id} className={`alert-card ${!alert.enabled ? 'disabled' : ''}`}>
                <div className="alert-info">
                  <strong>{alert.name}</strong>
                  {!alert.enabled && <span className="status-badge disabled">비활성</span>}
                  <div className="alert-tags">
                    {alert.alertTypes.map((type) => (
                      <span key={type} className="tag-small">
                        {ALERT_TYPE_LABELS[type]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => handleEditClick(alert)}
                    aria-label={`${alert.name} 수정`}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className={`btn btn-small ${alert.enabled ? 'btn-outline' : 'btn-primary'}`}
                    onClick={async () => {
                      try {
                        await alertApiClient.toggleAlert(alert.id);
                        loadAlerts();
                      } catch {
                        setError('알림 상태 변경에 실패했습니다.');
                      }
                    }}
                    aria-label={`${alert.name} ${alert.enabled ? '비활성화' : '활성화'}`}
                  >
                    {alert.enabled ? '끄기' : '켜기'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-small"
                    onClick={() => handleDeleteClick(alert)}
                    aria-label={`${alert.name} 삭제`}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
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
          <span>Alert System</span>
          <span className="footer-divider">·</span>
          <span>출퇴근 알림 서비스</span>
        </p>
        <p className="footer-copyright">© 2025 All rights reserved</p>
      </footer>
    </main>
  );
}
