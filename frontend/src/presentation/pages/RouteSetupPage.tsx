import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
} from '@infrastructure/api/commute-api.client';
import { subwayApiClient, type SubwayStation } from '@infrastructure/api';

type SetupStep = 'select-type' | 'select-station' | 'confirm';

export function RouteSetupPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = getCommuteApiClient();

  // 기존 경로
  const [existingRoutes, setExistingRoutes] = useState<RouteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 새 경로 생성 플로우
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<SetupStep>('select-type');
  const [routeType, setRouteType] = useState<RouteType>('morning');

  // 역 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SubwayStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStation, setSelectedStation] = useState<SubwayStation | null>(null);

  // 저장
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // 기존 경로 로드
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    commuteApi
      .getUserRoutes(userId)
      .then((routes) => {
        if (isMounted) {
          setExistingRoutes(routes);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  // 역 검색
  const searchStations = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await subwayApiClient.searchStations(query);
      setSearchResults(results.slice(0, 6));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 역 선택
  const handleSelectStation = (station: SubwayStation) => {
    setSelectedStation(station);
    setSearchQuery('');
    setSearchResults([]);
    setStep('confirm');
  };

  // 경로 저장
  const handleSave = async () => {
    if (!userId || !selectedStation) return;

    setIsSaving(true);
    setError('');

    try {
      const routeName = routeType === 'morning' ? '출근 경로' : '퇴근 경로';
      const isToWork = routeType === 'morning';

      const dto: CreateRouteDto = {
        userId,
        name: routeName,
        routeType,
        isPreferred: existingRoutes.length === 0,
        checkpoints: isToWork
          ? [
              { sequenceOrder: 1, name: '집', checkpointType: 'home', transportMode: 'walk' },
              { sequenceOrder: 2, name: selectedStation.name, checkpointType: 'subway', linkedStationId: selectedStation.id, lineInfo: selectedStation.line, transportMode: 'subway' },
              { sequenceOrder: 3, name: '회사', checkpointType: 'work' },
            ]
          : [
              { sequenceOrder: 1, name: '회사', checkpointType: 'work', transportMode: 'walk' },
              { sequenceOrder: 2, name: selectedStation.name, checkpointType: 'subway', linkedStationId: selectedStation.id, lineInfo: selectedStation.line, transportMode: 'subway' },
              { sequenceOrder: 3, name: '집', checkpointType: 'home' },
            ],
      };

      await commuteApi.createRoute(dto);
      navigate('/commute');
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 새 경로 시작
  const startCreating = () => {
    setIsCreating(true);
    setStep('select-type');
    setSelectedStation(null);
    setSearchQuery('');
    setError('');
  };

  // 취소
  const cancelCreating = () => {
    setIsCreating(false);
    setStep('select-type');
    setSelectedStation(null);
    setSearchQuery('');
  };

  // 삭제
  const handleDelete = async (routeId: string) => {
    if (!confirm('이 경로를 삭제할까요?')) return;
    try {
      await commuteApi.deleteRoute(routeId);
      setExistingRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch {
      // ignore
    }
  };

  // 로그인 필요
  if (!userId) {
    return (
      <main className="page apple-route-page">
        <nav className="apple-nav">
          <Link to="/" className="apple-back">←</Link>
          <span className="apple-title">경로</span>
          <span />
        </nav>
        <div className="apple-empty">
          <div className="apple-empty-icon">🚇</div>
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
          <Link to="/" className="apple-back">←</Link>
          <span className="apple-title">경로</span>
          <span />
        </nav>
        <div className="apple-loading">불러오는 중...</div>
      </main>
    );
  }

  // 새 경로 생성 플로우
  if (isCreating) {
    return (
      <main className="page apple-route-page">
        <nav className="apple-nav">
          <button type="button" className="apple-back" onClick={cancelCreating}>←</button>
          <span className="apple-title">새 경로</span>
          <span />
        </nav>

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
                  <span className="type-icon">🌅</span>
                  <span className="type-label">출근</span>
                  <span className="type-desc">집 → 회사</span>
                </button>

                <button
                  type="button"
                  className={`apple-type-card ${routeType === 'evening' ? 'selected' : ''}`}
                  onClick={() => setRouteType('evening')}
                >
                  <span className="type-icon">🌆</span>
                  <span className="type-label">퇴근</span>
                  <span className="type-desc">회사 → 집</span>
                </button>
              </div>
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-primary apple-btn-full"
                onClick={() => setStep('select-station')}
              >
                다음
              </button>
            </div>
          </section>
        )}

        {/* Step 2: 역 선택 */}
        {step === 'select-station' && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">어떤 역을<br />이용하세요?</h1>

              <div className="apple-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="역 이름으로 검색"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchStations(e.target.value);
                  }}
                  className="apple-search-input"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="apple-searching">검색 중...</div>
              )}

              {searchResults.length > 0 && (
                <ul className="apple-station-list">
                  {searchResults.map((station) => (
                    <li key={station.id}>
                      <button
                        type="button"
                        className="apple-station-item"
                        onClick={() => handleSelectStation(station)}
                      >
                        <span className="station-icon">🚇</span>
                        <span className="station-info">
                          <strong>{station.name}</strong>
                          <span>{station.line}</span>
                        </span>
                        <span className="station-arrow">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="apple-no-results">
                  검색 결과가 없습니다
                </div>
              )}

              {!searchQuery && (
                <div className="apple-search-hint">
                  <p>🚇 지하철역 이름을 검색하세요</p>
                  <p className="hint-example">예: 강남, 홍대입구, 여의도</p>
                </div>
              )}
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-secondary"
                onClick={() => setStep('select-type')}
              >
                이전
              </button>
            </div>
          </section>
        )}

        {/* Step 3: 확인 */}
        {step === 'confirm' && selectedStation && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">이 경로가<br />맞나요?</h1>

              <div className="apple-route-preview">
                <div className="route-visual">
                  {routeType === 'morning' ? (
                    <>
                      <div className="route-point">
                        <div className="point-icon start">🏠</div>
                        <div className="point-label">집</div>
                      </div>
                      <div className="route-line">
                        <span>🚶 도보</span>
                      </div>
                      <div className="route-point">
                        <div className="point-icon station">🚇</div>
                        <div className="point-label">{selectedStation.name}</div>
                        <div className="point-sub">{selectedStation.line}</div>
                      </div>
                      <div className="route-line">
                        <span>🚇 지하철</span>
                      </div>
                      <div className="route-point">
                        <div className="point-icon end">🏢</div>
                        <div className="point-label">회사</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="route-point">
                        <div className="point-icon start">🏢</div>
                        <div className="point-label">회사</div>
                      </div>
                      <div className="route-line">
                        <span>🚶 도보</span>
                      </div>
                      <div className="route-point">
                        <div className="point-icon station">🚇</div>
                        <div className="point-label">{selectedStation.name}</div>
                        <div className="point-sub">{selectedStation.line}</div>
                      </div>
                      <div className="route-line">
                        <span>🚇 지하철</span>
                      </div>
                      <div className="route-point">
                        <div className="point-icon end">🏠</div>
                        <div className="point-label">집</div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="change-station-btn"
                  onClick={() => setStep('select-station')}
                >
                  다른 역 선택
                </button>
              </div>

              <div className="apple-info-card">
                <span className="info-icon">💡</span>
                <p>소요시간은 실제 출퇴근을 기록하면서 자동으로 측정됩니다</p>
              </div>

              {error && <div className="apple-error">{error}</div>}
            </div>

            <div className="apple-step-footer">
              <button
                type="button"
                className="apple-btn-primary apple-btn-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : '경로 저장'}
              </button>
            </div>
          </section>
        )}
      </main>
    );
  }

  // 메인 화면: 경로 목록
  return (
    <main className="page apple-route-page">
      <nav className="apple-nav">
        <Link to="/" className="apple-back">←</Link>
        <span className="apple-title">경로</span>
        <Link to="/commute" className="apple-nav-link">트래킹</Link>
      </nav>

      {existingRoutes.length === 0 ? (
        // 경로 없음
        <div className="apple-empty">
          <div className="apple-empty-icon">🚇</div>
          <h2>경로가 없어요</h2>
          <p>출퇴근 경로를 추가하면<br />시간을 기록할 수 있어요</p>
          <button type="button" className="apple-btn-primary" onClick={startCreating}>
            경로 추가
          </button>
        </div>
      ) : (
        // 경로 목록
        <div className="apple-route-list">
          <section className="route-section">
            <h2 className="section-title">내 경로</h2>
            {existingRoutes.map((route) => (
              <div key={route.id} className="apple-route-card">
                <Link to={`/commute?routeId=${route.id}`} className="route-card-main">
                  <span className="route-icon">
                    {route.routeType === 'morning' ? '🌅' : '🌆'}
                  </span>
                  <div className="route-info">
                    <strong>{route.name}</strong>
                    <span>{route.checkpoints.map(c => c.name).join(' → ')}</span>
                  </div>
                  <span className="route-arrow">▶</span>
                </Link>
                <button
                  type="button"
                  className="route-delete"
                  onClick={() => handleDelete(route.id)}
                  aria-label="삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </section>

          <button type="button" className="apple-add-btn" onClick={startCreating}>
            <span className="add-icon">+</span>
            <span>새 경로 추가</span>
          </button>
        </div>
      )}
    </main>
  );
}
