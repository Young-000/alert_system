import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { subwayApiClient } from '@infrastructure/api';
import type { SubwayStation } from '@infrastructure/api';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type CheckpointType,
  type TransportMode,
} from '@infrastructure/api/commute-api.client';

interface CheckpointFormData {
  id?: string;
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
  transportMode?: TransportMode;
}

const CHECKPOINT_TYPE_LABELS: Record<CheckpointType, { label: string; icon: string }> = {
  home: { label: '집', icon: '🏠' },
  subway: { label: '지하철역', icon: '🚇' },
  bus_stop: { label: '버스정류장', icon: '🚌' },
  transfer_point: { label: '환승지점', icon: '🔄' },
  work: { label: '회사', icon: '🏢' },
  custom: { label: '기타', icon: '📍' },
};

const TRANSPORT_MODE_LABELS: Record<TransportMode, { label: string; icon: string }> = {
  walk: { label: '도보', icon: '🚶' },
  subway: { label: '지하철', icon: '🚇' },
  bus: { label: '버스', icon: '🚌' },
  transfer: { label: '환승대기', icon: '⏱️' },
  taxi: { label: '택시', icon: '🚕' },
  bike: { label: '자전거', icon: '🚴' },
};

const DEFAULT_CHECKPOINTS: CheckpointFormData[] = [
  { sequenceOrder: 1, name: '집', checkpointType: 'home', expectedWaitTime: 0, transportMode: 'walk' },
  { sequenceOrder: 2, name: '', checkpointType: 'subway', expectedWaitTime: 3, transportMode: 'subway' },
  { sequenceOrder: 3, name: '회사', checkpointType: 'work', expectedWaitTime: 0 },
];

export function RouteSetupPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  // Route state
  const [routeName, setRouteName] = useState('출근 경로');
  const [routeType, setRouteType] = useState<RouteType>('morning');
  const [isPreferred, setIsPreferred] = useState(true);
  const [checkpoints, setCheckpoints] = useState<CheckpointFormData[]>(DEFAULT_CHECKPOINTS);

  // UI state
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingRoutes, setExistingRoutes] = useState<RouteResponse[]>([]);

  // Station search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SubwayStation[]>([]);
  const [, setIsSearching] = useState(false);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState<number | null>(null);

  // Load existing routes
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    commuteApi
      .getUserRoutes(userId)
      .then(setExistingRoutes)
      .catch((err) => {
        console.error('Failed to load routes:', err);
      })
      .finally(() => setIsLoading(false));
  }, [userId, commuteApi]);

  // Station search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const results = await subwayApiClient.searchStations(searchQuery);
        if (!controller.signal.aborted) {
          setSearchResults(results.slice(0, 10));
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  // Checkpoint management
  const addCheckpoint = useCallback(() => {
    const newOrder = checkpoints.length + 1;
    setCheckpoints((prev) => [
      ...prev.slice(0, -1), // Remove last (destination)
      {
        sequenceOrder: newOrder - 1,
        name: '',
        checkpointType: 'subway' as CheckpointType,
        expectedWaitTime: 3,
        transportMode: 'subway' as TransportMode,
      },
      { ...prev[prev.length - 1], sequenceOrder: newOrder }, // Move destination to end
    ]);
  }, [checkpoints.length]);

  const removeCheckpoint = useCallback((index: number) => {
    if (checkpoints.length <= 2) return; // Keep at least start and end
    setCheckpoints((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((cp, i) => ({ ...cp, sequenceOrder: i + 1 }));
    });
  }, [checkpoints.length]);

  const updateCheckpoint = useCallback((index: number, updates: Partial<CheckpointFormData>) => {
    setCheckpoints((prev) =>
      prev.map((cp, i) => (i === index ? { ...cp, ...updates } : cp))
    );
  }, []);

  const selectStation = useCallback(
    (station: SubwayStation) => {
      if (activeCheckpointIndex === null) return;

      updateCheckpoint(activeCheckpointIndex, {
        name: station.name,
        linkedStationId: station.id,
        lineInfo: station.line,
      });
      setSearchQuery('');
      setSearchResults([]);
      setActiveCheckpointIndex(null);
    },
    [activeCheckpointIndex, updateCheckpoint]
  );

  // Calculate totals
  const totalDuration = checkpoints.reduce(
    (sum, cp) => sum + (cp.expectedDurationToNext || 0) + (cp.expectedWaitTime || 0),
    0
  );
  const totalWaitTime = checkpoints.reduce((sum, cp) => sum + (cp.expectedWaitTime || 0), 0);

  // Save route
  const handleSave = async () => {
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    // Validation
    if (!routeName.trim()) {
      setError('경로 이름을 입력해주세요.');
      return;
    }

    const emptyCheckpoints = checkpoints.filter(
      (cp) => !cp.name.trim() && cp.checkpointType !== 'custom'
    );
    if (emptyCheckpoints.length > 0) {
      setError('모든 체크포인트의 이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const dto: CreateRouteDto = {
        userId,
        name: routeName,
        routeType,
        isPreferred,
        checkpoints: checkpoints.map((cp) => ({
          sequenceOrder: cp.sequenceOrder,
          name: cp.name,
          checkpointType: cp.checkpointType,
          linkedStationId: cp.linkedStationId,
          linkedBusStopId: cp.linkedBusStopId,
          lineInfo: cp.lineInfo,
          expectedDurationToNext: cp.expectedDurationToNext,
          expectedWaitTime: cp.expectedWaitTime,
          transportMode: cp.transportMode,
        })),
      };

      await commuteApi.createRoute(dto);
      setSuccess('경로가 저장되었습니다!');

      setTimeout(() => {
        navigate('/commute');
      }, 1500);
    } catch (err) {
      console.error('Failed to save route:', err);
      setError('경로 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load existing route for editing
  const loadRoute = useCallback((route: RouteResponse) => {
    setRouteName(route.name);
    setRouteType(route.routeType);
    setIsPreferred(route.isPreferred);
    setCheckpoints(
      route.checkpoints.map((cp) => ({
        id: cp.id,
        sequenceOrder: cp.sequenceOrder,
        name: cp.name,
        checkpointType: cp.checkpointType,
        linkedStationId: cp.linkedStationId,
        linkedBusStopId: cp.linkedBusStopId,
        lineInfo: cp.lineInfo,
        expectedDurationToNext: cp.expectedDurationToNext,
        expectedWaitTime: cp.expectedWaitTime,
        transportMode: cp.transportMode,
      }))
    );
  }, []);

  if (!userId) {
    return (
      <main className="page">
        <nav className="nav">
          <Link to="/" className="brand">← 홈</Link>
        </nav>
        <div className="notice warning">먼저 로그인해주세요.</div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="nav-back">← </Link>
          <strong>경로 설정</strong>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/commute">
            트래킹
          </Link>
        </div>
      </nav>

      {/* Existing Routes */}
      {existingRoutes.length > 0 && (
        <section className="existing-routes">
          <h2>저장된 경로</h2>
          <div className="route-cards">
            {existingRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                className="route-card"
                onClick={() => loadRoute(route)}
              >
                <div className="route-card-header">
                  <span className="route-name">{route.name}</span>
                  {route.isPreferred && <span className="badge">기본</span>}
                </div>
                <div className="route-card-info">
                  <span>체크포인트 {route.checkpoints.length}개</span>
                  <span>·</span>
                  <span>예상 {route.totalExpectedDuration}분</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="route-setup-container">
        {/* Route Info */}
        <section className="setup-section">
          <h2>경로 정보</h2>
          <div className="form-group">
            <label htmlFor="routeName">경로 이름</label>
            <input
              id="routeName"
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="예: 출근 경로, 퇴근 경로"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="routeType">경로 유형</label>
              <select
                id="routeType"
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as RouteType)}
              >
                <option value="morning">출근</option>
                <option value="evening">퇴근</option>
                <option value="custom">기타</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                />
                <span>기본 경로로 설정</span>
              </label>
            </div>
          </div>
        </section>

        {/* Checkpoints */}
        <section className="setup-section">
          <div className="section-header">
            <h2>체크포인트</h2>
            <button type="button" className="btn btn-small btn-outline" onClick={addCheckpoint}>
              + 추가
            </button>
          </div>

          <div className="checkpoints-list">
            {checkpoints.map((checkpoint, index) => (
              <div key={index} className="checkpoint-item">
                <div className="checkpoint-order">
                  <span className="order-number">{index + 1}</span>
                  {index < checkpoints.length - 1 && (
                    <div className="connector">
                      <span className="connector-line" />
                      {checkpoint.transportMode && (
                        <span className="connector-mode">
                          {TRANSPORT_MODE_LABELS[checkpoint.transportMode].icon}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="checkpoint-content">
                  <div className="checkpoint-row">
                    <span className="checkpoint-icon">
                      {CHECKPOINT_TYPE_LABELS[checkpoint.checkpointType].icon}
                    </span>

                    {checkpoint.checkpointType === 'subway' ? (
                      <div className="station-search-wrapper">
                        <input
                          type="text"
                          value={
                            activeCheckpointIndex === index ? searchQuery : checkpoint.name
                          }
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setActiveCheckpointIndex(index);
                          }}
                          onFocus={() => setActiveCheckpointIndex(index)}
                          placeholder="역 이름 검색..."
                          className="checkpoint-name-input"
                        />
                        {checkpoint.lineInfo && (
                          <span className="line-badge">{checkpoint.lineInfo}</span>
                        )}
                        {activeCheckpointIndex === index && searchResults.length > 0 && (
                          <div className="station-dropdown">
                            {searchResults.map((station) => (
                              <button
                                key={station.id}
                                type="button"
                                className="station-option"
                                onClick={() => selectStation(station)}
                              >
                                <span className="station-name">{station.name}</span>
                                <span className="station-line">{station.line}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={checkpoint.name}
                        onChange={(e) => updateCheckpoint(index, { name: e.target.value })}
                        placeholder={CHECKPOINT_TYPE_LABELS[checkpoint.checkpointType].label}
                        className="checkpoint-name-input"
                      />
                    )}

                    <select
                      value={checkpoint.checkpointType}
                      onChange={(e) =>
                        updateCheckpoint(index, { checkpointType: e.target.value as CheckpointType })
                      }
                      className="checkpoint-type-select"
                    >
                      {Object.entries(CHECKPOINT_TYPE_LABELS).map(([type, { label }]) => (
                        <option key={type} value={type}>
                          {label}
                        </option>
                      ))}
                    </select>

                    {checkpoints.length > 2 && index !== 0 && index !== checkpoints.length - 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-remove"
                        onClick={() => removeCheckpoint(index)}
                        aria-label="체크포인트 삭제"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Duration & Wait Time (not for last checkpoint) */}
                  {index < checkpoints.length - 1 && (
                    <div className="checkpoint-timing">
                      <div className="timing-item">
                        <label>다음까지 이동</label>
                        <div className="timing-input">
                          <input
                            type="number"
                            min="0"
                            value={checkpoint.expectedDurationToNext || ''}
                            onChange={(e) =>
                              updateCheckpoint(index, {
                                expectedDurationToNext: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                          />
                          <span>분</span>
                        </div>
                      </div>

                      <div className="timing-item">
                        <label>대기/환승</label>
                        <div className="timing-input">
                          <input
                            type="number"
                            min="0"
                            value={checkpoint.expectedWaitTime || ''}
                            onChange={(e) =>
                              updateCheckpoint(index, {
                                expectedWaitTime: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                          />
                          <span>분</span>
                        </div>
                      </div>

                      <div className="timing-item">
                        <label>이동수단</label>
                        <select
                          value={checkpoint.transportMode || 'walk'}
                          onChange={(e) =>
                            updateCheckpoint(index, { transportMode: e.target.value as TransportMode })
                          }
                        >
                          {Object.entries(TRANSPORT_MODE_LABELS).map(([mode, { label, icon }]) => (
                            <option key={mode} value={mode}>
                              {icon} {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section className="setup-section summary-section">
          <h2>요약</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">총 예상 시간</span>
              <span className="summary-value">{totalDuration}분</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">대기/환승 시간</span>
              <span className="summary-value highlight">{totalWaitTime}분</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">순수 이동 시간</span>
              <span className="summary-value">{totalDuration - totalWaitTime}분</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">체크포인트</span>
              <span className="summary-value">{checkpoints.length}개</span>
            </div>
          </div>
        </section>

        {/* Error/Success */}
        <div aria-live="polite">
          {error && <div className="notice error">{error}</div>}
          {success && <div className="notice success">{success}</div>}
        </div>

        {/* Actions */}
        <div className="setup-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '경로 저장'}
          </button>
        </div>
      </div>

      <footer className="footer">
        <p className="footer-text">Alert System · 출퇴근 트래킹</p>
      </footer>
    </main>
  );
}
