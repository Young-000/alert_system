import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteResponse,
  type RouteType,
  type CreateCheckpointDto,
} from '@infrastructure/api/commute-api.client';
import { subwayApiClient, busApiClient, type SubwayStation, type BusStop } from '@infrastructure/api';

type SetupStep =
  | 'select-type'      // 출근/퇴근 선택
  | 'select-transport' // 교통수단 선택
  | 'select-station'   // 역/정류장 검색
  | 'ask-more'         // 더 거쳐가나요?
  | 'confirm';         // 최종 확인

type TransportMode = 'subway' | 'bus';

interface SelectedStop {
  id: string;
  name: string;
  line: string;
  transportMode: TransportMode;
}

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

  // 교통수단 & 정류장
  const [currentTransport, setCurrentTransport] = useState<TransportMode>('subway');
  const [selectedStops, setSelectedStops] = useState<SelectedStop[]>([]);

  // 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [subwayResults, setSubwayResults] = useState<SubwayStation[]>([]);
  const [busResults, setBusResults] = useState<BusStop[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // 역/정류장 검색
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
        setSubwayResults(results.slice(0, 6));
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

  // 역/정류장 선택
  const handleSelectStop = (stop: SubwayStation | BusStop) => {
    const isSubway = 'line' in stop;
    const newStop: SelectedStop = {
      id: isSubway ? stop.id : (stop as BusStop).nodeId,
      name: stop.name,
      line: isSubway ? stop.line : '',
      transportMode: currentTransport,
    };
    setSelectedStops(prev => [...prev, newStop]);
    setSearchQuery('');
    setSubwayResults([]);
    setBusResults([]);
    setStep('ask-more');
  };

  // 정류장 삭제
  const removeStop = (index: number) => {
    setSelectedStops(prev => prev.filter((_, i) => i !== index));
  };

  // 경로 저장
  const handleSave = async () => {
    if (!userId || selectedStops.length === 0) return;

    setIsSaving(true);
    setError('');

    try {
      const routeName = routeType === 'morning' ? '출근 경로' : '퇴근 경로';
      const isToWork = routeType === 'morning';

      // 체크포인트 생성
      const checkpoints: CreateCheckpointDto[] = [];
      let seq = 1;

      // 시작점
      checkpoints.push({
        sequenceOrder: seq++,
        name: isToWork ? '집' : '회사',
        checkpointType: isToWork ? 'home' : 'work',
        transportMode: 'walk',
      });

      // 중간 정류장들
      for (const stop of selectedStops) {
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

      const dto: CreateRouteDto = {
        userId,
        name: routeName,
        routeType,
        isPreferred: existingRoutes.length === 0,
        checkpoints,
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
    setSelectedStops([]);
    setSearchQuery('');
    setError('');
  };

  // 취소
  const cancelCreating = () => {
    setIsCreating(false);
    setStep('select-type');
    setSelectedStops([]);
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

  // 현재까지 경로 미리보기 렌더링
  const renderRouteSoFar = () => {
    const isToWork = routeType === 'morning';
    const start = isToWork ? '집' : '회사';

    return (
      <div className="route-so-far">
        <span className="route-point-mini">{start}</span>
        {selectedStops.map((stop, i) => (
          <span key={i} className="route-segment">
            <span className="route-arrow-mini">→</span>
            <span className="route-point-mini stop">
              {stop.transportMode === 'subway' ? '🚇' : '🚌'} {stop.name}
            </span>
          </span>
        ))}
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

              <div className="apple-type-cards">
                <button
                  type="button"
                  className={`apple-type-card ${currentTransport === 'subway' ? 'selected' : ''}`}
                  onClick={() => setCurrentTransport('subway')}
                >
                  <span className="type-icon">🚇</span>
                  <span className="type-label">지하철</span>
                </button>

                <button
                  type="button"
                  className={`apple-type-card ${currentTransport === 'bus' ? 'selected' : ''}`}
                  onClick={() => setCurrentTransport('bus')}
                >
                  <span className="type-icon">🚌</span>
                  <span className="type-label">버스</span>
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
              <h1 className="apple-question">
                {currentTransport === 'subway'
                  ? '어떤 역을\n이용하세요?'
                  : '어떤 정류장을\n이용하세요?'}
              </h1>

              {selectedStops.length > 0 && renderRouteSoFar()}

              <div className="apple-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={currentTransport === 'subway' ? '역 이름으로 검색' : '정류장 이름으로 검색'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchStops(e.target.value);
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
                      setSubwayResults([]);
                      setBusResults([]);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="apple-searching">검색 중...</div>
              )}

              {/* 지하철 검색 결과 */}
              {subwayResults.length > 0 && (
                <ul className="apple-station-list">
                  {subwayResults.map((station) => (
                    <li key={station.id}>
                      <button
                        type="button"
                        className="apple-station-item"
                        onClick={() => handleSelectStop(station)}
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

              {/* 버스 검색 결과 */}
              {busResults.length > 0 && (
                <ul className="apple-station-list">
                  {busResults.map((stop) => (
                    <li key={stop.nodeId}>
                      <button
                        type="button"
                        className="apple-station-item"
                        onClick={() => handleSelectStop(stop)}
                      >
                        <span className="station-icon">🚌</span>
                        <span className="station-info">
                          <strong>{stop.name}</strong>
                          <span>{stop.stopNo || ''}</span>
                        </span>
                        <span className="station-arrow">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchQuery && !isSearching && subwayResults.length === 0 && busResults.length === 0 && (
                <div className="apple-no-results">
                  검색 결과가 없습니다
                </div>
              )}

              {!searchQuery && (
                <div className="apple-search-hint">
                  <p>{currentTransport === 'subway' ? '🚇 지하철역' : '🚌 버스 정류장'} 이름을 검색하세요</p>
                  <p className="hint-example">
                    {currentTransport === 'subway'
                      ? '예: 강남, 홍대입구, 여의도'
                      : '예: 강남역, 시청앞, 명동'}
                  </p>
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

        {/* Step 4: 더 거쳐가나요? */}
        {step === 'ask-more' && (
          <section className="apple-step">
            <div className="apple-step-content">
              <h1 className="apple-question">다른 곳도<br />거쳐가시나요?</h1>

              {/* 현재까지 경로 표시 */}
              <div className="apple-route-progress">
                <div className="progress-title">지금까지 경로</div>
                <div className="progress-route">
                  <span className="progress-point start">
                    {routeType === 'morning' ? '🏠 집' : '🏢 회사'}
                  </span>
                  {selectedStops.map((stop, i) => (
                    <div key={i} className="progress-segment">
                      <div className="progress-line" />
                      <div className="progress-stop">
                        <span className="stop-icon">
                          {stop.transportMode === 'subway' ? '🚇' : '🚌'}
                        </span>
                        <span className="stop-name">{stop.name}</span>
                        <span className="stop-line">{stop.line}</span>
                        <button
                          type="button"
                          className="stop-remove"
                          onClick={() => removeStop(i)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="progress-segment">
                    <div className="progress-line dashed" />
                    <span className="progress-point end">
                      {routeType === 'morning' ? '🏢 회사' : '🏠 집'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="apple-choice-cards">
                <button
                  type="button"
                  className="apple-choice-card"
                  onClick={() => setStep('select-transport')}
                >
                  <span className="choice-icon">➕</span>
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
              <h1 className="apple-question">이 경로가<br />맞나요?</h1>

              <div className="apple-route-preview">
                <div className="route-visual">
                  {/* 시작점 */}
                  <div className="route-point">
                    <div className="point-icon start">
                      {routeType === 'morning' ? '🏠' : '🏢'}
                    </div>
                    <div className="point-label">
                      {routeType === 'morning' ? '집' : '회사'}
                    </div>
                  </div>

                  {/* 중간 정류장들 */}
                  {selectedStops.map((stop, i) => (
                    <div key={i} className="route-segment-full">
                      <div className="route-line">
                        <span>
                          {i === 0 ? '🚶 도보' : (selectedStops[i-1].transportMode === 'subway' ? '🚇 지하철' : '🚌 버스')}
                        </span>
                      </div>
                      <div className="route-point">
                        <div className={`point-icon ${stop.transportMode}`}>
                          {stop.transportMode === 'subway' ? '🚇' : '🚌'}
                        </div>
                        <div className="point-label">{stop.name}</div>
                        <div className="point-sub">{stop.line}</div>
                      </div>
                    </div>
                  ))}

                  {/* 마지막 구간 + 도착점 */}
                  <div className="route-line">
                    <span>
                      {selectedStops[selectedStops.length - 1].transportMode === 'subway'
                        ? '🚇 지하철'
                        : '🚌 버스'}
                    </span>
                  </div>
                  <div className="route-point">
                    <div className="point-icon end">
                      {routeType === 'morning' ? '🏢' : '🏠'}
                    </div>
                    <div className="point-label">
                      {routeType === 'morning' ? '회사' : '집'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="change-station-btn"
                  onClick={() => setStep('ask-more')}
                >
                  경로 수정하기
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
