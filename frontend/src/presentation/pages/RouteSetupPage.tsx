import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type TransportMode,
} from '@infrastructure/api/commute-api.client';

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
];

export function RouteSetupPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
  const [routeName, setRouteName] = useState('');
  const [isPreferred, setIsPreferred] = useState(true);
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

  // Load existing routes
  useEffect(() => {
    if (!userId) return;
    commuteApi
      .getUserRoutes(userId)
      .then(setExistingRoutes)
      .catch(console.error);
  }, [userId, commuteApi]);

  const handleTemplateSelect = useCallback((template: RouteTemplate) => {
    setSelectedTemplate(template);
    setRouteName(`${template.name} 경로`);
  }, []);

  const handleQuickSave = async () => {
    if (!userId || !selectedTemplate) return;

    setIsSaving(true);
    setError('');

    try {
      const dto: CreateRouteDto = {
        userId,
        name: routeName || `${selectedTemplate.name} 경로`,
        routeType: selectedTemplate.type,
        isPreferred,
        checkpoints: selectedTemplate.checkpoints.map((cp, index) => ({
          sequenceOrder: index + 1,
          name: cp.name,
          checkpointType: index === 0 ? 'home' : index === selectedTemplate.checkpoints.length - 1 ? 'work' : 'subway',
          expectedDurationToNext: index < selectedTemplate.checkpoints.length - 1 ? 15 : undefined,
          expectedWaitTime: index === 1 ? 3 : 0,
          transportMode: index === 0 ? 'walk' : index === 1 ? 'subway' : undefined,
        })),
      };

      await commuteApi.createRoute(dto);
      setSuccess('경로가 저장되었습니다!');

      setTimeout(() => navigate('/commute'), 1000);
    } catch (err) {
      console.error('Failed to save route:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartWithoutRoute = () => {
    navigate('/commute?mode=stopwatch');
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
    setSelectedTemplate(null);
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

      {/* Hero Section */}
      <section className="route-hero">
        <div className="route-hero-content">
          <h1>나만의 출퇴근 경로</h1>
          <p>템플릿을 선택하거나 스톱워치처럼 바로 기록하세요</p>
        </div>
      </section>

      {/* Quick Start */}
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

      {/* Template Selection */}
      <section className="route-templates">
        <h2>경로 템플릿</h2>
        <p className="section-desc">자주 가는 경로를 빠르게 설정하세요</p>

        <div className="template-grid">
          {ROUTE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(template)}
              style={{ '--template-color': template.color, '--template-gradient': template.gradient } as React.CSSProperties}
            >
              <div className="template-header">
                <span className="template-icon">{template.icon}</span>
                <span className="template-name">{template.name}</span>
                {selectedTemplate?.id === template.id && (
                  <span className="template-check">✓</span>
                )}
              </div>

              <div className="template-timeline">
                {template.checkpoints.map((cp, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-dot">
                      <span>{cp.icon}</span>
                    </div>
                    <span className="timeline-label">{cp.name}</span>
                    {index < template.checkpoints.length - 1 && (
                      <div className="timeline-connector" />
                    )}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Selected Template Config */}
      {selectedTemplate && (
        <section className="route-config">
          <div className="config-card">
            <div className="config-header">
              <span className="config-icon" style={{ background: selectedTemplate.gradient }}>
                {selectedTemplate.icon}
              </span>
              <div className="config-title">
                <h3>{selectedTemplate.name} 경로 설정</h3>
                <p>간단히 이름만 지정하세요</p>
              </div>
            </div>

            <div className="config-form">
              <div className="form-group">
                <label htmlFor="routeName">경로 이름</label>
                <input
                  id="routeName"
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder={`예: ${selectedTemplate.name} 경로`}
                  className="route-name-input"
                />
              </div>

              <label className="checkbox-fancy">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                />
                <span className="checkbox-box">
                  <svg viewBox="0 0 12 10">
                    <polyline points="1.5 6 4.5 9 10.5 1" />
                  </svg>
                </span>
                <span className="checkbox-text">기본 경로로 설정</span>
              </label>
            </div>

            {/* Visual Timeline Preview */}
            <div className="config-preview">
              <div className="preview-title">경로 미리보기</div>
              <div className="preview-timeline">
                {selectedTemplate.checkpoints.map((cp, index) => (
                  <div key={index} className="preview-step">
                    <div
                      className="preview-node"
                      style={{ background: selectedTemplate.gradient }}
                    >
                      {cp.icon}
                    </div>
                    <span className="preview-label">{cp.name}</span>
                    {index < selectedTemplate.checkpoints.length - 1 && (
                      <div className="preview-line" style={{ background: selectedTemplate.color }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && <div className="notice error">{error}</div>}
            {success && <div className="notice success">{success}</div>}

            {/* Actions */}
            <div className="config-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedTemplate(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleQuickSave}
                disabled={isSaving}
                style={{ background: selectedTemplate.gradient }}
              >
                {isSaving ? (
                  <span className="btn-loading">저장 중...</span>
                ) : (
                  <>
                    <span>시작하기</span>
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Existing Routes */}
      {existingRoutes.length > 0 && !selectedTemplate && (
        <section className="route-existing">
          <h2>저장된 경로</h2>
          {(error || success) && !selectedTemplate && (
            <div className={`notice ${error ? 'error' : 'success'}`}>
              {error || success}
            </div>
          )}
          <div className="existing-grid">
            {existingRoutes.map((route) => (
              <div key={route.id} className="existing-card-wrapper">
                <Link
                  to={`/commute?routeId=${route.id}`}
                  className="existing-card"
                >
                  <div className="existing-header">
                    <span className="existing-icon">
                      {route.routeType === 'morning' ? '🌅' : '🌆'}
                    </span>
                    <div className="existing-info">
                      <strong>{route.name}</strong>
                      <span>{route.checkpoints.length}개 체크포인트</span>
                    </div>
                    {route.isPreferred && <span className="badge">기본</span>}
                  </div>
                  <div className="existing-meta">
                    <span>예상 {route.totalExpectedDuration}분</span>
                    <span className="existing-arrow">→</span>
                  </div>
                </Link>
                <div className="existing-actions">
                  <button
                    type="button"
                    className="btn-edit-route"
                    onClick={() => handleEditRoute(route)}
                    aria-label={`${route.name} 수정`}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="btn-delete-route"
                    onClick={() => handleDeleteRoute(route.id, route.name)}
                    disabled={isDeleting === route.id}
                    aria-label={`${route.name} 삭제`}
                  >
                    {isDeleting === route.id ? '...' : '×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Advanced Option - Custom Route Builder */}
      {!selectedTemplate && (
        <section className="route-advanced">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            <span>상세 설정</span>
            <span className="toggle-icon">{showCustomForm ? '−' : '+'}</span>
          </button>

          {showCustomForm && (
            <div className="custom-route-form">
              <h3>{editingRoute ? '경로 수정' : '나만의 경로 만들기'}</h3>
              <p className="muted">{editingRoute ? '체크포인트와 설정을 수정하세요' : '체크포인트를 직접 설정해보세요'}</p>

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
          )}
        </section>
      )}

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 나의 출퇴근 동반자</p>
      </footer>
    </main>
  );
}
