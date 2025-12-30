import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertApiClient } from '@infrastructure/api/alert-api.client';
import { ApiClient } from '@infrastructure/api/api-client';
import { Alert, CreateAlertDto } from '@infrastructure/api/alert-api.client';
import { usePushNotification } from '../hooks/usePushNotification';
import { MobileCard } from '../components/MobileCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { SearchInput } from '../components/SearchInput';
import { BusApiClient } from '@infrastructure/api/bus-api.client';
import { SubwayApiClient } from '@infrastructure/api/subway-api.client';

const ALERT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  weather: { label: '날씨', icon: '🌤️' },
  airQuality: { label: '미세먼지', icon: '🟢' },
  bus: { label: '버스', icon: '🚌' },
  subway: { label: '지하철', icon: '🚇' },
};

export function AlertSettingsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [name, setName] = useState('');
  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('0');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const [busStopId, setBusStopId] = useState<string>('');
  const [subwayStationId, setSubwayStationId] = useState<string>('');
  const [busSearchResults, setBusSearchResults] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [subwaySearchResults, setSubwaySearchResults] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [busSearchLoading, setBusSearchLoading] = useState(false);
  const [subwaySearchLoading, setSubwaySearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(true);
  
  const apiClient = new ApiClient();
  const alertApiClient = new AlertApiClient(apiClient);
  const busApiClient = new BusApiClient(apiClient);
  const subwayApiClient = new SubwayApiClient(apiClient);
  const userId = localStorage.getItem('userId') || '';
  const { permission, subscribe, requestPermission } = usePushNotification();

  const daysOfWeek = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
  ];

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    loadAlerts();
    
    if (permission === 'granted') {
      subscribe().then((sub) => {
        if (sub && userId) {
          apiClient.post('/notifications/subscribe', {
            userId,
            ...sub,
          }).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [permission]);

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch (err) {
      setError('알림 목록을 불러오는데 실패했습니다.');
    } finally {
      setAlertsLoading(false);
    }
  };

  const convertToCron = (hour: string, minute: string, days: number[]): string => {
    if (days.length === 7) {
      return `${minute} ${hour} * * *`; // 매일
    }
    if (days.length === 0) {
      return `${minute} ${hour} * * *`; // 기본값: 매일
    }
    const dayPattern = days.sort().join(',');
    return `${minute} ${hour} * * ${dayPattern}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (alertTypes.length === 0) {
      setError('최소 하나의 알림 타입을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      const schedule = convertToCron(hour, minute, selectedDays);
      // 버스/지하철 선택 검증
      if (alertTypes.includes('bus') && !busStopId) {
        setError('버스 정류장을 선택해주세요.');
        return;
      }
      if (alertTypes.includes('subway') && !subwayStationId) {
        setError('지하철 역을 선택해주세요.');
        return;
      }

      const dto: CreateAlertDto = {
        userId,
        name: name || `알림 ${new Date().toLocaleTimeString()}`,
        schedule,
        alertTypes: alertTypes as any,
        busStopId: alertTypes.includes('bus') ? busStopId : undefined,
        subwayStationId: alertTypes.includes('subway') ? subwayStationId : undefined,
      };
      await alertApiClient.createAlert(dto);
      setName('');
      setHour('8');
      setMinute('0');
      setSelectedDays([]);
      setAlertTypes([]);
      setBusStopId('');
      setSubwayStationId('');
      setBusSearchResults([]);
      setSubwaySearchResults([]);
      loadAlerts();
    } catch (err: any) {
      setError(err.response?.data?.message || '알림 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await alertApiClient.deleteAlert(id);
      loadAlerts();
    } catch (err) {
      setError('알림 삭제에 실패했습니다.');
    }
  };

  const toggleAlertType = (type: string) => {
    if (alertTypes.includes(type)) {
      setAlertTypes(alertTypes.filter((t) => t !== type));
      if (type === 'bus') {
        setBusStopId('');
        setBusSearchResults([]);
      }
      if (type === 'subway') {
        setSubwayStationId('');
        setSubwaySearchResults([]);
      }
    } else {
      setAlertTypes([...alertTypes, type]);
    }
  };

  const handleBusSearch = async (keyword: string) => {
    if (keyword.length < 2) {
      setBusSearchResults([]);
      return;
    }
    try {
      setBusSearchLoading(true);
      const result = await busApiClient.searchStops(keyword);
      setBusSearchResults(
        result.stops.map((stop) => ({
          id: stop.stopId,
          name: stop.stopName,
          description: stop.direction,
        }))
      );
    } catch (err) {
      setBusSearchResults([]);
    } finally {
      setBusSearchLoading(false);
    }
  };

  const handleSubwaySearch = async (keyword: string) => {
    if (keyword.length < 2) {
      setSubwaySearchResults([]);
      return;
    }
    try {
      setSubwaySearchLoading(true);
      const result = await subwayApiClient.searchStations(keyword);
      setSubwaySearchResults(
        result.stations.map((station) => ({
          id: station.stationId,
          name: station.stationName,
          description: `${station.lineName}호선`,
        }))
      );
    } catch (err) {
      setSubwaySearchResults([]);
    } finally {
      setSubwaySearchLoading(false);
    }
  };

  const handleBusSelect = (item: { id: string; name: string }) => {
    setBusStopId(item.id);
  };

  const handleSubwaySelect = (item: { id: string; name: string }) => {
    setSubwayStationId(item.id);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const formatSchedule = (schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length >= 2) {
      const minute = parts[0];
      const hour = parts[1];
      return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    return schedule;
  };

  if (alertsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">알림 설정</h1>

        {permission !== 'granted' && (
          <MobileCard className="mb-4 bg-yellow-50 border-yellow-200">
            <div className="space-y-2">
              <p className="font-medium text-yellow-800 text-sm">푸시 알림을 활성화하세요</p>
              <p className="text-xs text-yellow-600">알림을 받으려면 브라우저 알림 권한이 필요합니다.</p>
              <Button variant="secondary" size="sm" onClick={requestPermission} className="mt-2">
                알림 활성화
              </Button>
            </div>
          </MobileCard>
        )}

        <MobileCard className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 알림 만들기</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="알림 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 출근 알림"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">알림 시간</label>
              <div className="flex items-center space-x-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}시</option>
                  ))}
                </select>
                <span className="text-gray-600 text-lg">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">요일 선택</label>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`py-2 rounded-xl transition-all text-sm font-medium ${
                      selectedDays.includes(day.value)
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">선택하지 않으면 매일 알림이 전송됩니다.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">알림 받을 정보</label>
              <div className="space-y-3">
                {/* 날씨/미세먼지 */}
                <div className="grid grid-cols-2 gap-2">
                  {['weather', 'airQuality'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleAlertType(type)}
                      className={`p-3 rounded-xl border-2 transition-all active:scale-98 ${
                        alertTypes.includes(type)
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 bg-white active:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{ALERT_TYPE_LABELS[type]?.icon}</div>
                      <div className="text-xs font-medium">{ALERT_TYPE_LABELS[type]?.label}</div>
                    </button>
                  ))}
                </div>

                {/* 버스 */}
                {alertTypes.includes('bus') && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">버스 정류장 검색</label>
                    <SearchInput
                      placeholder="정류장 이름 검색 (예: 강남역)"
                      onSearch={handleBusSearch}
                      onSelect={handleBusSelect}
                      results={busSearchResults}
                      isLoading={busSearchLoading}
                    />
                    {busStopId && (
                      <p className="text-xs text-green-600">✓ 정류장이 선택되었습니다</p>
                    )}
                  </div>
                )}

                {/* 지하철 */}
                {alertTypes.includes('subway') && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">지하철 역 검색</label>
                    <SearchInput
                      placeholder="역 이름 검색 (예: 강남역)"
                      onSearch={handleSubwaySearch}
                      onSelect={handleSubwaySelect}
                      results={subwaySearchResults}
                      isLoading={subwaySearchLoading}
                    />
                    {subwayStationId && (
                      <p className="text-xs text-green-600">✓ 역이 선택되었습니다</p>
                    )}
                  </div>
                )}

                {/* 버스/지하철 선택 버튼 */}
                <div className="grid grid-cols-2 gap-2">
                  {['bus', 'subway'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleAlertType(type)}
                      className={`p-3 rounded-xl border-2 transition-all active:scale-98 ${
                        alertTypes.includes(type)
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 bg-white active:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{ALERT_TYPE_LABELS[type]?.icon}</div>
                      <div className="text-xs font-medium">{ALERT_TYPE_LABELS[type]?.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="w-full"
            >
              알림 생성
            </Button>
          </form>
        </MobileCard>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            내 알림 ({alerts.length}개)
          </h2>

          {alerts.length === 0 ? (
            <MobileCard>
              <p className="text-gray-500 text-center py-8 text-sm">
                아직 생성된 알림이 없습니다.<br />위에서 새 알림을 만들어보세요.
              </p>
            </MobileCard>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <MobileCard key={alert.id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900">{alert.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            alert.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.enabled ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          ⏰ {formatSchedule(alert.schedule)}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {alert.alertTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg text-xs"
                            >
                              {ALERT_TYPE_LABELS[type]?.icon} {ALERT_TYPE_LABELS[type]?.label || type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(alert.id)}
                      className="w-full"
                    >
                      삭제
                    </Button>
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
