import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type TransportMode,
} from '@infrastructure/api/commute-api.client';
import { subwayApiClient, type SubwayStation } from '@infrastructure/api';

interface SimpleCheckpoint {
  name: string;
  icon: string;
}

interface CustomCheckpoint {
  id: string;
  name: string;
  icon: string;
  transportMode: TransportMode;
  expectedDuration: number;
  waitTime: number;
  // 역/정류장 정보
  stationId?: string;
  stationName?: string;
}

const TRANSPORT_OPTIONS: { value: TransportMode; label: string; icon: string }[] = [
  { value: 'walk', label: '도보', icon: '🚶' },
  { value: 'subway', label: '지하철', icon: '🚇' },
  { value: 'bus', label: '버스', icon: '🚌' },
  { value: 'taxi', label: '택시/자차', icon: '🚗' },
  { value: 'bike', label: '자전거', icon: '🚴' },
];

const CHECKPOINT_ICONS = ['🏠', '🚇', '🚌', '🏢', '☕', '🏪', '🚗', '🚶'];

interface RouteTemplate {
  id: string;
  name: string;
  type: RouteType;
  icon: string;
  color: string;
  gradient: string;
  checkpoints: SimpleCheckpoint[];
}

const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: 'morning',
    name: '출근',
    type: 'morning',
    icon: '🌅',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    checkpoints: [
      { name: '집', icon: '🏠' },
      { name: '지하철', icon: '🚇' },
      { name: '회사', icon: '🏢' },
    ],
  },
  {
    id: 'evening',
    name: '퇴근',
    type: 'evening',
    icon: '🌆',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    checkpoints: [
      { name: '회사', icon: '🏢' },
      { name: '지하철', icon: '🚇' },
      { name: '집', icon: '🏠' },
    ],
  },
  {
    id: 'transfer',
    name: '환승 경로',
    type: 'morning',
    icon: '🔄',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    checkpoints: [
      { name: '집', icon: '🏠' },
      { name: '버스', icon: '🚌' },
      { name: '환승역', icon: '🚇' },
      { name: '지하철', icon: '🚇' },
      { name: '회사', icon: '🏢' },
    ],
  },
];

export function RouteSetupPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  const [existingRoutes, setExistingRoutes] = useState<RouteResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customRouteName, setCustomRouteName] = useState('');
  const [customRouteType, setCustomRouteType] = useState<RouteType>('morning');
  const [customCheckpoints, setCustomCheckpoints] = useState<CustomCheckpoint[]>([
    { id: '1', name: '집', icon: '🏠', transportMode: 'walk', expectedDuration: 10, waitTime: 0 },
    { id: '2', name: '지하철역', icon: '🚇', transportMode: 'subway', expectedDuration: 20, waitTime: 5 },
    { id: '3', name: '회사', icon: '🏢', transportMode: 'walk', expectedDuration: 0, waitTime: 0 },
  ]);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteResponse | null>(null);

  // 템플릿 선택 후 미리보기 모드
  const [previewTemplate, setPreviewTemplate] = useState<RouteTemplate | null>(null);

  // 역 검색 관련 상태
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [stationSearchResults, setStationSearchResults] = useState<SubwayStation[]>([]);
  const [isSearchingStation, setIsSearchingStation] = useState(false);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);

  // 역 검색 함수
  const searchStations = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setStationSearchResults([]);
      return;
    }

    setIsSearchingStation(true);
    try {
      const results = await subwayApiClient.searchStations(query);
      setStationSearchResults(results.slice(0, 5)); // 최대 5개
    } catch (err) {
      console.error('Station search failed:', err);
      setStationSearchResults([]);
    } finally {
      setIsSearchingStation(false);
    }
  }, []);

  // 역 선택 시 체크포인트 업데이트
  const handleSelectStation = (checkpointId: string, station: SubwayStation) => {
    setCustomCheckpoints(prev =>
      prev.map(cp =>
        cp.id === checkpointId
          ? {
              ...cp,
              name: station.name,
              stationId: station.id,
              stationName: `${station.name} (${station.line})`,
            }
          : cp
      )
    );
    setStationSearchQuery('');
    setStationSearchResults([]);
    setActiveCheckpointId(null);
  };

  // Load existing routes
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    commuteApi
      .getUserRoutes(userId)
      .then((routes) => {
        if (isMounted) {
          setExistingRoutes(routes);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load routes:', err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, commuteApi]);

  const handleStartWithoutRoute = () => {
    navigate('/commute?mode=stopwatch');
  };

  // 템플릿 선택 시 미리보기 화면으로 전환
  const handleSelectTemplate = (template: RouteTemplate) => {
    setPreviewTemplate(template);
    // 템플릿 기반으로 커스텀 폼 초기화
    setCustomRouteName(`${template.name} 경로`);
    setCustomRouteType(template.type);
    setCustomCheckpoints(
      template.checkpoints.map((cp, index) => ({
        id: String(index + 1),
        name: cp.name,
        icon: cp.icon,
        transportMode: cp.icon === '🚇' ? 'subway' : cp.icon === '🚌' ? 'bus' : 'walk',
        expectedDuration: index < template.checkpoints.length - 1 ? 10 : 0,
        waitTime: ['🚇', '🚌'].includes(cp.icon) ? 3 : 0,
      }))
    );
  };

  // 미리보기에서 저장
  const handleSaveFromPreview = async () => {
    if (!userId || !previewTemplate) return;

    setIsSaving(true);
    setError('');

    try {
      const getTransportMode = (icon: string): TransportMode => {
        switch (icon) {
          case '🚇': return 'subway';
          case '🚌': return 'bus';
          case '🚗': return 'taxi';
          case '🚴': return 'bike';
          default: return 'walk';
        }
      };

      type CheckpointTypeValue = 'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom';
      const getCheckpointType = (icon: string, index: number, total: number): CheckpointTypeValue => {
        if (index === 0) return 'home';
        if (index === total - 1) return 'work';
        if (icon === '🚇') return 'subway';
        if (icon === '🚌') return 'bus_stop';
        return 'transfer_point';
      };

      const dto: CreateRouteDto = {
        userId,
        name: customRouteName,
        routeType: customRouteType,
        isPreferred: existingRoutes.length === 0,
        checkpoints: customCheckpoints.map((cp, index) => ({
          sequenceOrder: index + 1,
          name: cp.name,
          checkpointType: getCheckpointType(cp.icon, index, customCheckpoints.length),
          expectedDurationToNext: index < customCheckpoints.length - 1 ? cp.expectedDuration : undefined,
          expectedWaitTime: cp.waitTime,
          transportMode: index < customCheckpoints.length - 1 ? getTransportMode(cp.icon) : undefined,
        })),
      };

      await commuteApi.createRoute(dto);
      setSuccess('경로가 저장되었습니다! 🎉');

      // Reload routes
      const routes = await commuteApi.getUserRoutes(userId);
      setExistingRoutes(routes);
      setPreviewTemplate(null);

      setTimeout(() => {
        setSuccess('');
        navigate('/commute');
      }, 1000);
    } catch (err) {
      console.error('Failed to save route:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 미리보기 취소
  const handleCancelPreview = () => {
    setPreviewTemplate(null);
    setCustomRouteName('');
    setError('');
  };

  const addCustomCheckpoint = () => {
    const newId = String(Date.now());
    setCustomCheckpoints([
      ...customCheckpoints,
      { id: newId, name: '', icon: '📍', transportMode: 'walk', expectedDuration: 10, waitTime: 0 },
    ]);
  };

  const removeCustomCheckpoint = (id: string) => {
    if (customCheckpoints.length <= 2) return; // Minimum 2 checkpoints
    setCustomCheckpoints(customCheckpoints.filter((cp) => cp.id !== id));
  };

  const updateCustomCheckpoint = (id: string, field: keyof CustomCheckpoint, value: string | number) => {
    setCustomCheckpoints(
      customCheckpoints.map((cp) =>
        cp.id === id ? { ...cp, [field]: value } : cp
      )
    );
  };

  const handleSaveCustomRoute = async () => {
    if (!userId) return;
    if (!customRouteName.trim()) {
      setError('경로 이름을 입력해주세요.');
      return;
    }
    if (customCheckpoints.some((cp) => !cp.name.trim())) {
      setError('모든 체크포인트의 이름을 입력해주세요.');
      return;
    }

    setIsSavingCustom(true);
    setError('');

    try {
      const dto: CreateRouteDto = {
        userId,
        name: customRouteName,
        routeType: customRouteType,
        isPreferred: true,
        checkpoints: customCheckpoints.map((cp, index) => ({
          sequenceOrder: index + 1,
          name: cp.name,
          checkpointType: index === 0 ? 'home' : index === customCheckpoints.length - 1 ? 'work' : 'custom',
          expectedDurationToNext: index < customCheckpoints.length - 1 ? cp.expectedDuration : undefined,
          expectedWaitTime: cp.waitTime,
          transportMode: cp.transportMode,
        })),
      };

      await commuteApi.createRoute(dto);
      setSuccess('경로가 저장되었습니다!');
      setShowCustomForm(false);
      setCustomRouteName('');

      // Reload routes
      const routes = await commuteApi.getUserRoutes(userId);
      setExistingRoutes(routes);

      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to save custom route:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleEditRoute = (route: RouteResponse) => {
    setEditingRoute(route);
    setCustomRouteName(route.name);
    setCustomRouteType(route.routeType);
    setCustomCheckpoints(
      route.checkpoints.map((cp) => ({
        id: cp.id,
        name: cp.name,
        icon: cp.checkpointType === 'home' ? '🏠' : cp.checkpointType === 'work' ? '🏢' : cp.checkpointType === 'subway' ? '🚇' : '📍',
        transportMode: cp.transportMode || 'walk',
        expectedDuration: cp.expectedDurationToNext || 0,
        waitTime: cp.expectedWaitTime || 0,
      }))
    );
    setShowCustomForm(true);
    setPreviewTemplate(null);
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;
    if (!customRouteName.trim()) {
      setError('경로 이름을 입력해주세요.');
      return;
    }
    if (customCheckpoints.some((cp) => !cp.name.trim())) {
      setError('모든 체크포인트의 이름을 입력해주세요.');
      return;
    }

    setIsSavingCustom(true);
    setError('');

    try {
      await commuteApi.updateRoute(editingRoute.id, {
        name: customRouteName,
        routeType: customRouteType,
        checkpoints: customCheckpoints.map((cp, index) => ({
          sequenceOrder: index + 1,
          name: cp.name,
          checkpointType: index === 0 ? 'home' : index === customCheckpoints.length - 1 ? 'work' : 'custom',
          expectedDurationToNext: index < customCheckpoints.length - 1 ? cp.expectedDuration : undefined,
          expectedWaitTime: cp.waitTime,
          transportMode: cp.transportMode,
        })),
      });

      setSuccess('경로가 수정되었습니다!');
      setShowCustomForm(false);
      setEditingRoute(null);
      setCustomRouteName('');

      // Reload routes
      const routes = await commuteApi.getUserRoutes(userId);
      setExistingRoutes(routes);

      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to update route:', err);
      setError('수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleCancelEdit = () => {
    setShowCustomForm(false);
    setEditingRoute(null);
    setCustomRouteName('');
    setCustomCheckpoints([
      { id: '1', name: '집', icon: '🏠', transportMode: 'walk', expectedDuration: 10, waitTime: 0 },
      { id: '2', name: '지하철역', icon: '🚇', transportMode: 'subway', expectedDuration: 20, waitTime: 5 },
      { id: '3', name: '회사', icon: '🏢', transportMode: 'walk', expectedDuration: 0, waitTime: 0 },
    ]);
  };

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    if (!confirm(`"${routeName}" 경로를 삭제하시겠습니까?`)) return;

    setIsDeleting(routeId);
    setError('');

    try {
      await commuteApi.deleteRoute(routeId);
      setExistingRoutes((prev) => prev.filter((r) => r.id !== routeId));
      setSuccess('경로가 삭제되었습니다.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to delete route:', err);
      setError('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (!userId) {
    return (
      <main className="page route-setup-page">
        <nav className="nav">
          <Link to="/" className="brand">
            <span className="nav-back">←</span>
            <strong>경로 설정</strong>
          </Link>
        </nav>
        <div className="route-login-prompt">
          <div className="prompt-icon">🔐</div>
          <h2>로그인이 필요해요</h2>
          <p>출퇴근 기록을 저장하려면 로그인해주세요.</p>
          <Link to="/login" className="btn btn-primary btn-lg">
            로그인하기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page route-setup-page">
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="nav-back">←</Link>
          <strong>경로 설정</strong>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/commute">
            트래킹
          </Link>
        </div>
      </nav>

      {/* Hero Section - 미리보기/커스텀 폼 표시 중에는 숨김 */}
      {!showCustomForm && !previewTemplate && (
        <section className="route-hero">
          <div className="route-hero-content">
            <h1>나만의 출퇴근 경로</h1>
            <p>템플릿을 선택하거나 스톱워치처럼 바로 기록하세요</p>
          </div>
        </section>
      )}

      {/* Quick Start - 미리보기/커스텀 폼 표시 중에는 숨김 */}
      {!showCustomForm && !previewTemplate && (
        <section className="route-quick-start">
          <button
            type="button"
            className="quick-start-btn"
            onClick={handleStartWithoutRoute}
          >
            <div className="quick-start-icon">⏱️</div>
            <div className="quick-start-text">
              <strong>바로 시작하기</strong>
              <span>스톱워치처럼 시간만 기록</span>
            </div>
            <span className="quick-start-arrow">→</span>
          </button>
        </section>
      )}

      {/* 저장된 경로 (먼저 표시) - 미리보기/커스텀 폼 표시 중에는 숨김 */}
      {existingRoutes.length > 0 && !showCustomForm && !previewTemplate && (
        <section className="route-saved">
          <h2>저장된 경로</h2>
          <div className="saved-routes-list">
            {existingRoutes.map((route) => (
              <div key={route.id} className="saved-route-item">
                <Link to={`/commute?routeId=${route.id}`} className="saved-route-link">
                  <span className="saved-route-icon">
                    {route.routeType === 'morning' ? '🌅' : '🌆'}
                  </span>
                  <div className="saved-route-info">
                    <strong>{route.name}</strong>
                    <span>{route.checkpoints.length}개 체크포인트 · {route.totalExpectedDuration}분</span>
                  </div>
                  {route.isPreferred && <span className="badge-primary">기본</span>}
                  <span className="saved-route-arrow">▶</span>
                </Link>
                <div className="saved-route-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleEditRoute(route)}
                    aria-label="수정"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDeleteRoute(route.id, route.name)}
                    disabled={isDeleting === route.id}
                    aria-label="삭제"
                  >
                    {isDeleting === route.id ? '...' : '×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 템플릿 미리보기 화면 */}
      {previewTemplate && !showCustomForm && (
        <section className="route-preview-section">
          <div className="preview-card">
            <div className="preview-header" style={{ background: previewTemplate.gradient }}>
              <span className="preview-icon">{previewTemplate.icon}</span>
              <h2>{previewTemplate.name} 경로</h2>
            </div>

            <div className="preview-body">
              <p className="preview-description">
                이 경로로 출퇴근을 기록할 수 있어요.
                <br />
                필요하면 아래에서 수정하세요.
              </p>

              {/* 경로 이름 편집 */}
              <div className="preview-form-group">
                <label htmlFor="previewRouteName">경로 이름</label>
                <input
                  id="previewRouteName"
                  type="text"
                  value={customRouteName}
                  onChange={(e) => setCustomRouteName(e.target.value)}
                  className="preview-input"
                />
              </div>

              {/* 체크포인트 설정 - 역/정류장 중심 */}
              <div className="preview-checkpoints">
                <label className="preview-checkpoints-label">경로 체크포인트</label>
                <p className="preview-checkpoints-hint">
                  지하철역을 선택하면 도착 정보를 알림에서 받을 수 있어요
                </p>

                <div className="checkpoint-cards">
                  {customCheckpoints.map((cp, index) => (
                    <div key={cp.id} className="checkpoint-card">
                      <div className="checkpoint-card-header">
                        <span className="checkpoint-number">{index + 1}</span>
                        <span className="checkpoint-icon">{cp.icon}</span>
                        {index === 0 && <span className="checkpoint-label">출발</span>}
                        {index === customCheckpoints.length - 1 && <span className="checkpoint-label">도착</span>}
                      </div>

                      {/* 지하철/버스 체크포인트: 역 검색 */}
                      {(cp.icon === '🚇' || cp.icon === '🚌') ? (
                        <div className="checkpoint-station-search">
                          {cp.stationName ? (
                            <div className="selected-station">
                              <span className="station-name">{cp.stationName}</span>
                              <button
                                type="button"
                                className="btn-change-station"
                                onClick={() => {
                                  setActiveCheckpointId(cp.id);
                                  setStationSearchQuery('');
                                }}
                              >
                                변경
                              </button>
                            </div>
                          ) : activeCheckpointId === cp.id ? (
                            <div className="station-search-input">
                              <input
                                type="text"
                                placeholder={cp.icon === '🚇' ? '역 이름 검색...' : '정류장 검색...'}
                                value={stationSearchQuery}
                                onChange={(e) => {
                                  setStationSearchQuery(e.target.value);
                                  searchStations(e.target.value);
                                }}
                                autoFocus
                                className="station-input"
                              />
                              {isSearchingStation && <span className="searching">검색 중...</span>}
                              {stationSearchResults.length > 0 && (
                                <ul className="station-results">
                                  {stationSearchResults.map((station) => (
                                    <li key={station.id}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectStation(cp.id, station)}
                                        className="station-result-btn"
                                      >
                                        <strong>{station.name}</strong>
                                        <span className="station-line">{station.line}</span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <button
                                type="button"
                                className="btn-cancel-search"
                                onClick={() => setActiveCheckpointId(null)}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-select-station"
                              onClick={() => setActiveCheckpointId(cp.id)}
                            >
                              {cp.icon === '🚇' ? '🔍 지하철역 선택' : '🔍 버스 정류장 선택'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="checkpoint-name-display">
                          <input
                            type="text"
                            value={cp.name}
                            onChange={(e) => {
                              setCustomCheckpoints(prev =>
                                prev.map(c =>
                                  c.id === cp.id ? { ...c, name: e.target.value } : c
                                )
                              );
                            }}
                            className="checkpoint-name-input"
                            placeholder="장소 이름"
                          />
                        </div>
                      )}

                      {/* 이동 수단 표시 (마지막 제외) */}
                      {index < customCheckpoints.length - 1 && (
                        <div className="checkpoint-transport-indicator">
                          <span className="transport-icon">
                            {cp.transportMode === 'subway' ? '🚇' :
                             cp.transportMode === 'bus' ? '🚌' : '🚶'}
                          </span>
                          <span className="transport-text">
                            {cp.transportMode === 'subway' ? '지하철' :
                             cp.transportMode === 'bus' ? '버스' : '도보'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="preview-info-box">
                <span className="info-icon">💡</span>
                <p>소요시간은 실제 트래킹을 통해 자동으로 측정됩니다</p>
              </div>

              {/* 에러/성공 메시지 */}
              {error && <div className="notice error">{error}</div>}
              {success && <div className="notice success">{success}</div>}

              {/* 액션 버튼 */}
              <div className="preview-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-lg"
                  onClick={handleCancelPreview}
                  disabled={isSaving}
                >
                  ← 다른 템플릿
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleSaveFromPreview}
                  disabled={isSaving}
                >
                  {isSaving ? '저장 중...' : '이 경로로 시작하기 →'}
                </button>
              </div>

              {/* 상세 수정 링크 */}
              <button
                type="button"
                className="btn btn-link preview-edit-link"
                onClick={() => {
                  setShowCustomForm(true);
                  setPreviewTemplate(null);
                }}
              >
                체크포인트 상세 수정하기
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 새 경로 만들기 - 템플릿 선택 */}
      {!showCustomForm && !previewTemplate && (
        <section className="route-templates">
          <h2>{existingRoutes.length > 0 ? '새 경로 추가' : '어떤 경로를 만들까요?'}</h2>
          <p className="section-desc">템플릿을 선택하면 미리보기가 표시됩니다</p>

          <div className="template-grid-v2">
            {ROUTE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="template-card-v2"
                onClick={() => handleSelectTemplate(template)}
                disabled={isSaving}
                style={{ '--template-gradient': template.gradient } as React.CSSProperties}
              >
                <span className="template-icon-v2">{template.icon}</span>
                <span className="template-name-v2">{template.name}</span>
                <div className="template-preview">
                  {template.checkpoints.map((cp, i) => (
                    <span key={i}>{cp.icon}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* 메시지 표시 */}
          {(error || success) && (
            <div className={`notice ${error ? 'error' : 'success'}`} style={{ marginTop: '1rem' }}>
              {error || success}
            </div>
          )}

          {/* 상세 설정 버튼 */}
          <div className="route-advanced-toggle">
            <button
              type="button"
              className="advanced-toggle"
              onClick={() => setShowCustomForm(true)}
            >
              <span>처음부터 직접 만들기</span>
              <span className="toggle-icon">+</span>
            </button>
          </div>
        </section>
      )}

      {/* Custom Route Builder - 별도 섹션으로 분리 */}
      {showCustomForm && (
        <section className="route-custom-builder">
          <div className="custom-route-form">
            <div className="custom-form-header">
              <h3>{editingRoute ? '경로 수정' : '나만의 경로 만들기'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={handleCancelEdit}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <p className="muted">
              {editingRoute ? '체크포인트와 설정을 수정하세요' : '집 → 지하철 → 버스 → 회사 등 나만의 경로를 설정하세요'}
            </p>

            {/* Route Name & Type */}
            <div className="custom-form-row">
              <div className="form-group">
                <label htmlFor="customRouteName">경로 이름</label>
                <input
                  id="customRouteName"
                  type="text"
                  value={customRouteName}
                  onChange={(e) => setCustomRouteName(e.target.value)}
                  placeholder="예: 출근 경로"
                  className="route-name-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="customRouteType">경로 유형</label>
                <select
                  id="customRouteType"
                  value={customRouteType}
                  onChange={(e) => setCustomRouteType(e.target.value as RouteType)}
                  className="route-type-select"
                >
                  <option value="morning">🌅 출근</option>
                  <option value="evening">🌆 퇴근</option>
                  <option value="custom">📍 기타</option>
                </select>
              </div>
            </div>

            {/* Checkpoints List */}
            <div className="checkpoint-list">
              <div className="checkpoint-list-header">
                <span>체크포인트</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={addCustomCheckpoint}
                >
                  + 추가
                </button>
              </div>

              {customCheckpoints.map((cp, index) => (
                <div key={cp.id} className="checkpoint-item">
                  <div className="checkpoint-number">{index + 1}</div>
                  <div className="checkpoint-fields">
                    <div className="checkpoint-row">
                      <select
                        value={cp.icon}
                        onChange={(e) => updateCustomCheckpoint(cp.id, 'icon', e.target.value)}
                        className="icon-select"
                        aria-label="아이콘 선택"
                      >
                        {CHECKPOINT_ICONS.map((icon) => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={cp.name}
                        onChange={(e) => updateCustomCheckpoint(cp.id, 'name', e.target.value)}
                        placeholder="체크포인트 이름"
                        className="checkpoint-name-input"
                      />
                      {customCheckpoints.length > 2 && (
                        <button
                          type="button"
                          className="btn-remove-checkpoint"
                          onClick={() => removeCustomCheckpoint(cp.id)}
                          aria-label="체크포인트 삭제"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {index < customCheckpoints.length - 1 && (
                      <div className="checkpoint-row checkpoint-transport">
                        <select
                          value={cp.transportMode}
                          onChange={(e) => updateCustomCheckpoint(cp.id, 'transportMode', e.target.value)}
                          className="transport-select"
                          aria-label="이동 수단"
                        >
                          {TRANSPORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className="time-input-group">
                          <label>이동</label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={cp.expectedDuration}
                            onChange={(e) => updateCustomCheckpoint(cp.id, 'expectedDuration', parseInt(e.target.value) || 0)}
                            className="time-input"
                          />
                          <span>분</span>
                        </div>
                        {(cp.transportMode === 'subway' || cp.transportMode === 'bus') && (
                          <div className="time-input-group">
                            <label>대기</label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={cp.waitTime}
                              onChange={(e) => updateCustomCheckpoint(cp.id, 'waitTime', parseInt(e.target.value) || 0)}
                              className="time-input"
                            />
                            <span>분</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Time Preview */}
            <div className="custom-route-preview">
              <span>예상 총 소요시간:</span>
              <strong>
                {customCheckpoints.reduce((sum, cp) => sum + cp.expectedDuration + cp.waitTime, 0)}분
              </strong>
            </div>

            {/* Error/Success */}
            {error && <div className="notice error">{error}</div>}
            {success && <div className="notice success">{success}</div>}

            {/* Actions */}
            <div className="custom-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancelEdit}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={editingRoute ? handleUpdateRoute : handleSaveCustomRoute}
                disabled={isSavingCustom}
              >
                {isSavingCustom ? '저장 중...' : editingRoute ? '수정 완료' : '경로 저장'}
              </button>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 나의 출퇴근 동반자</p>
      </footer>
    </main>
  );
}
