import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
} from '@infrastructure/api/commute-api.client';

interface SimpleCheckpoint {
  name: string;
  icon: string;
}

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

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
                    <span>저장하고 시작</span>
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
          <div className="existing-grid">
            {existingRoutes.map((route) => (
              <Link
                key={route.id}
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
            ))}
          </div>
        </section>
      )}

      {/* Advanced Option */}
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
            <div className="advanced-hint">
              <p>상세 설정은 준비 중입니다.</p>
              <p className="muted">템플릿을 선택하거나 스톱워치 모드를 사용해주세요.</p>
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
