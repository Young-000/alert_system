import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  alertApiClient,
  userApiClient,
  subwayApiClient,
  apiClient,
} from '@infrastructure/api';
import type { Alert, AlertType, CreateAlertDto } from '@infrastructure/api';
import type { User } from '@infrastructure/api';
import type { SubwayStation } from '@infrastructure/api';
import { usePushNotification } from '../hooks/usePushNotification';

const SCHEDULE_DEFAULT = '0 8,18 * * *';

const ALERT_TYPE_OPTIONS: Array<{
  type: AlertType;
  label: string;
  description: string;
}> = [
  { type: 'weather', label: 'Weather', description: '강수 예보' },
  { type: 'airQuality', label: 'Air Quality', description: '미세먼지' },
  { type: 'subway', label: 'Subway', description: '지하철 역 기반' },
];

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  weather: '날씨/비',
  airQuality: '공기질',
  subway: '지하철',
  bus: '버스',
};

export function AlertSettingsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState(SCHEDULE_DEFAULT);
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([]);
  const [stationQuery, setStationQuery] = useState('');
  const [stationResults, setStationResults] = useState<SubwayStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<SubwayStation | null>(
    null,
  );
  const [location, setLocation] = useState<User['location'] | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const userId = localStorage.getItem('userId') || '';
  const { permission, subscribe, requestPermission, subscription, swError } =
    usePushNotification();

  const loadAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch {
      setError('알림 목록을 불러오는데 실패했습니다.');
    }
  }, [userId]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      const user = await userApiClient.getUser(userId);
      setLocation(user.location ?? null);
    } catch {
      setError('사용자 정보를 불러오는데 실패했습니다.');
    }
  }, [userId]);

  // 초기 데이터 로드
  useEffect(() => {
    loadAlerts();
    loadUser();
  }, [loadAlerts, loadUser]);

  // 푸시 알림 구독
  useEffect(() => {
    if (permission !== 'granted' || !userId || subscription) return;

    subscribe()
      .then((sub) => {
        if (sub && userId) {
          return apiClient.post('/notifications/subscribe', {
            userId,
            ...sub,
          });
        }
      })
      .catch((err) => {
        console.error('푸시 알림 구독 실패:', err);
      });
  }, [permission, userId, subscription, subscribe]);

  // 지하철 역 검색
  useEffect(() => {
    if (!stationQuery.trim()) {
      setStationResults([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const results = await subwayApiClient.searchStations(stationQuery);
        if (!controller.signal.aborted) {
          setStationResults(results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setStationResults([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [stationQuery]);

  // 지하철 타입 해제 시 역 선택 초기화
  useEffect(() => {
    if (!alertTypes.includes('subway')) {
      setSelectedStation(null);
      setStationQuery('');
      setStationResults([]);
    }
  }, [alertTypes]);

  const detectLocation = useCallback(async () => {
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 기능을 지원하지 않습니다.');
      return;
    }

    setInfo('위치를 감지하는 중...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const updated = await userApiClient.updateLocation(userId, {
            address: manualAddress || '현재 위치',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocation(updated.location ?? null);
          setInfo('위치가 업데이트되었습니다.');
        } catch {
          setError('위치 업데이트에 실패했습니다.');
        }
      },
      () => {
        setError('위치를 가져오는데 실패했습니다.');
      },
    );
  }, [userId, manualAddress]);

  const saveManualLocation = useCallback(async () => {
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }
    setError('');
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('유효한 좌표를 입력해주세요.');
      return;
    }
    try {
      const updated = await userApiClient.updateLocation(userId, {
        address: manualAddress || '수동 입력 위치',
        lat,
        lng,
      });
      setLocation(updated.location ?? null);
      setInfo('위치가 업데이트되었습니다.');
    } catch {
      setError('위치 업데이트에 실패했습니다.');
    }
  }, [userId, manualAddress, manualLat, manualLng]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!userId) {
        setError('로그인이 필요합니다.');
        return;
      }
      if (alertTypes.length === 0) {
        setError('최소 하나의 알림 타입을 선택해주세요.');
        return;
      }
      if (alertTypes.includes('subway') && !selectedStation) {
        setError('지하철 역을 선택해주세요.');
        return;
      }

      try {
        const dto: CreateAlertDto = {
          userId,
          name,
          schedule,
          alertTypes,
          subwayStationId: selectedStation?.id,
        };
        await alertApiClient.createAlert(dto);
        setName('');
        setSchedule(SCHEDULE_DEFAULT);
        setAlertTypes([]);
        setSelectedStation(null);
        setStationQuery('');
        loadAlerts();
      } catch {
        setError('알림 생성에 실패했습니다.');
      }
    },
    [userId, name, schedule, alertTypes, selectedStation, loadAlerts],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await alertApiClient.deleteAlert(id);
        loadAlerts();
      } catch {
        setError('알림 삭제에 실패했습니다.');
      }
    },
    [loadAlerts],
  );

  const toggleAlertType = useCallback((type: AlertType) => {
    setAlertTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const selectStation = useCallback((station: SubwayStation) => {
    setSelectedStation(station);
    setStationQuery(`${station.name} ${station.line}`);
    setStationResults([]);
  }, []);

  const scheduleLabel =
    schedule.trim() === SCHEDULE_DEFAULT ? '08:00 / 18:00' : schedule;
  const typeSummary = alertTypes.length
    ? alertTypes.map((type) => ALERT_TYPE_LABELS[type]).join(', ')
    : '선택 필요';
  const locationSummary = location
    ? `${location.address} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
    : '미설정';
  const stationSummary = selectedStation
    ? `${selectedStation.name} ${selectedStation.line}`
    : '미선택';

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <strong>Alert System</strong>
          <span>Commute dashboard</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/">
            홈
          </Link>
          <Link className="btn btn-outline" to="/login">
            로그인
          </Link>
        </div>
      </nav>

      <header className="stack">
        <p className="eyebrow">MVP 설정</p>
        <h1>내 하루 리듬 맞춤 알림</h1>
        <p className="lead">
          위치와 지하철 역을 설정하면 08:00 / 18:00에 필요한 정보를 자동으로
          받아요.
        </p>
      </header>

      {!userId && (
        <div className="notice warning">
          로그인 후 알림을 저장할 수 있어요. 먼저 계정을 만들어주세요.
        </div>
      )}

      {swError && <div className="notice warning">{swError}</div>}

      <div className="grid-2">
        <form onSubmit={handleSubmit} className="stack">
          <section className="card">
            <div className="section-head">
              <div className="step-badge">1</div>
              <div>
                <h2>위치 설정</h2>
                <p className="muted">브라우저 위치 또는 수동 입력</p>
              </div>
            </div>
            <div className="stack">
              <div className="summary-item">
                <span>현재 위치</span>
                <strong>{locationSummary}</strong>
              </div>
              <div className="nav-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={detectLocation}
                >
                  현재 위치 사용
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={saveManualLocation}
                >
                  수동 위치 저장
                </button>
              </div>
              <div className="field">
                <label htmlFor="address">Address (optional)</label>
                <input
                  id="address"
                  className="input"
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="예: 성수동"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="lat">Latitude</label>
                  <input
                    id="lat"
                    className="input"
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="37.5665"
                  />
                </div>
                <div className="field">
                  <label htmlFor="lng">Longitude</label>
                  <input
                    id="lng"
                    className="input"
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="126.9780"
                  />
                </div>
              </div>
              {info && <div className="notice info">{info}</div>}
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <div className="step-badge">2</div>
              <div>
                <h2>지하철 역 선택</h2>
                <p className="muted">검색 후 원하는 역을 선택하세요.</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="station">Subway Station</label>
              <input
                id="station"
                className="input"
                type="text"
                value={stationQuery}
                onChange={(e) => {
                  setStationQuery(e.target.value);
                  setSelectedStation(null);
                }}
                placeholder="예: 강남, 홍대입구"
              />
            </div>
            {stationResults.length > 0 && (
              <div className="result-list" role="listbox" aria-label="검색 결과">
                {stationResults.map((station) => (
                  <button
                    type="button"
                    role="option"
                    className="result-item"
                    key={station.id}
                    onClick={() => selectStation(station)}
                    aria-selected={selectedStation?.id === station.id}
                  >
                    {station.name} {station.line}
                  </button>
                ))}
              </div>
            )}
            {selectedStation && (
              <div className="notice info">
                선택됨: {selectedStation.name} {selectedStation.line}
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-head">
              <div className="step-badge">3</div>
              <div>
                <h2>알림 구성</h2>
                <p className="muted">
                  알림 이름과 시간, 알림 타입을 설정하세요.
                </p>
              </div>
            </div>
            <div className="stack">
              <div className="field">
                <label htmlFor="name">Alert Name</label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 출근 알림"
                  required
                  aria-required="true"
                />
              </div>
              <div className="field">
                <label htmlFor="schedule">Schedule (Cron)</label>
                <input
                  id="schedule"
                  className="input"
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="nav-actions">
                <button
                  type="button"
                  className={`chip ${schedule.trim() === SCHEDULE_DEFAULT ? 'active' : ''}`}
                  onClick={() => setSchedule(SCHEDULE_DEFAULT)}
                >
                  08:00 / 18:00 기본값
                </button>
                <span className="muted">현재 설정: {scheduleLabel}</span>
              </div>
              <div className="field">
                <label>Alert Types</label>
                <div className="type-grid" role="group" aria-label="알림 타입">
                  {ALERT_TYPE_OPTIONS.map((option) => {
                    const active = alertTypes.includes(option.type);
                    return (
                      <label
                        key={option.type}
                        className={`type-option ${active ? 'active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleAlertType(option.type)}
                        />
                        <span className="type-title">{option.label}</span>
                        <span className="muted">{option.description}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <div className="step-badge">4</div>
              <div>
                <h2>푸시 알림</h2>
                <p className="muted">브라우저 알림 권한을 활성화하세요.</p>
              </div>
            </div>
            <div className="stack">
              <div className="summary-item">
                <span>권한 상태</span>
                <strong className={`status-pill ${permission}`}>
                  {permission}
                </strong>
              </div>
              {permission !== 'granted' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={requestPermission}
                >
                  알림 받기
                </button>
              ) : (
                <div className="notice info">푸시 알림이 활성화되었습니다.</div>
              )}
              {permission === 'denied' && (
                <div className="notice warning">
                  브라우저 설정에서 알림 권한을 허용해야 합니다.
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <div className="step-badge">5</div>
              <div>
                <h2>요약</h2>
                <p className="muted">설정 내용을 확인하고 저장하세요.</p>
              </div>
            </div>
            <div className="summary-list">
              <div className="summary-item">
                <span>위치</span>
                <strong>{locationSummary}</strong>
              </div>
              <div className="summary-item">
                <span>지하철 역</span>
                <strong>{stationSummary}</strong>
              </div>
              <div className="summary-item">
                <span>알림 시간</span>
                <strong>{scheduleLabel}</strong>
              </div>
              <div className="summary-item">
                <span>알림 타입</span>
                <strong>{typeSummary}</strong>
              </div>
            </div>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary">
              알림 시작하기
            </button>
          </section>
        </form>

        <aside className="stack">
          <section className="card">
            <div className="section-head">
              <div className="step-badge">Live</div>
              <div>
                <h2>기존 알림</h2>
                <p className="muted">저장된 알림을 확인하고 관리하세요.</p>
              </div>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <article
                  key={alert.id}
                  className="alert-item"
                  aria-labelledby={`alert-name-${alert.id}`}
                >
                  <strong id={`alert-name-${alert.id}`}>{alert.name}</strong>
                  <span className="muted">Schedule: {alert.schedule}</span>
                  <div
                    className="alert-tags"
                    role="list"
                    aria-label="알림 타입"
                  >
                    {alert.alertTypes.map((type) => (
                      <span key={type} className="chip" role="listitem">
                        {ALERT_TYPE_LABELS[type]}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleDelete(alert.id)}
                    aria-label={`${alert.name} 알림 삭제`}
                  >
                    삭제
                  </button>
                </article>
              ))}
              {alerts.length === 0 && (
                <div className="notice info">아직 저장된 알림이 없어요.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
