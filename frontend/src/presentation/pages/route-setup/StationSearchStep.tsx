import type { LocalTransportMode, SelectedStop, GroupedStation, SetupStep } from './types';
import type { BusStop } from '@infrastructure/api';
import type { RouteType } from '@infrastructure/api/commute-api.client';
import { RouteSoFar } from './RouteSoFar';

interface StationSearchStepProps {
  currentTransport: LocalTransportMode;
  selectedStops: SelectedStop[];
  routeType: RouteType;
  searchQuery: string;
  isSearching: boolean;
  error: string;
  groupedSubwayResults: GroupedStation[];
  busResults: BusStop[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStationClick: (grouped: GroupedStation) => void;
  onBusStopSelect: (stop: BusStop) => void;
  onStepChange: (step: SetupStep) => void;
}

export function StationSearchStep({
  currentTransport,
  selectedStops,
  routeType,
  searchQuery,
  isSearching,
  error,
  groupedSubwayResults,
  busResults,
  onSearchChange,
  onClearSearch,
  onStationClick,
  onBusStopSelect,
  onStepChange,
}: StationSearchStepProps): JSX.Element {
  return (
    <section className="apple-step">
      <div className="apple-step-content">
        {/* 승하차 흐름 안내 */}
        <div className="boarding-flow-indicator">
          {selectedStops.length === 0 ? (
            <span className="boarding-label boarding">
              {currentTransport === 'subway' ? '승차역' : '승차 정류장'} 선택
            </span>
          ) : (
            <span className="boarding-label alighting">
              {currentTransport === 'subway' ? '하차역 또는 환승역' : '하차 정류장'} 선택
            </span>
          )}
        </div>

        <h1 className="apple-question">
          {selectedStops.length === 0
            ? currentTransport === 'subway'
              ? '어디서\n타시나요?'
              : '어디서\n타시나요?'
            : currentTransport === 'subway'
              ? '어디서\n내리시나요?'
              : '어디서\n내리시나요?'}
        </h1>

        {selectedStops.length > 0 && (
          <RouteSoFar routeType={routeType} selectedStops={selectedStops} />
        )}

        <div className="apple-search-box">
          <span className="search-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input
            id="stop-search"
            type="text"
            placeholder={currentTransport === 'subway' ? '역 이름으로 검색 (예: 강남)' : '정류장 이름으로 검색'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="apple-search-input"
            autoFocus
            aria-label={currentTransport === 'subway' ? '지하철역 검색' : '버스 정류장 검색'}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              aria-label="검색어 지우기"
              onClick={onClearSearch}
            >
              ✕
            </button>
          )}
        </div>

        {error && <div className="route-validation-error" role="alert"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {error}</div>}

        {isSearching && (
          <div className="apple-searching">검색 중...</div>
        )}

        {/* 지하철 검색 결과 */}
        {currentTransport === 'subway' && groupedSubwayResults.length > 0 && (
          <ul className="search-results-list" role="listbox" aria-label="지하철역 검색 결과">
            {groupedSubwayResults.map((grouped) => (
              <li key={grouped.name} role="option" tabIndex={0}>
                <button
                  type="button"
                  className="search-result-item"
                  onClick={() => onStationClick(grouped)}
                  aria-label={`${grouped.name}역 ${grouped.lines.length > 1 ? `(${grouped.lines.length}개 호선)` : grouped.lines[0].line}`}
                >
                  <span className="result-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg></span>
                  <span className="result-info">
                    <strong>{grouped.name}</strong>
                    <span className="result-detail">
                      {grouped.lines.length === 1
                        ? grouped.lines[0].line
                        : `${grouped.lines.map(l => l.line).join(', ')}`}
                    </span>
                  </span>
                  <span className="result-action" aria-hidden="true">
                    {grouped.lines.length > 1 ? '호선 선택 ▼' : '선택 →'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 버스 검색 결과 */}
        {busResults.length > 0 && (
          <ul className="search-results-list" role="listbox" aria-label="버스 정류장 검색 결과">
            {busResults.map((stop) => (
              <li key={stop.nodeId} role="option" tabIndex={0}>
                <button
                  type="button"
                  className="search-result-item"
                  onClick={() => onBusStopSelect(stop)}
                  aria-label={`${stop.name} 정류장 ${stop.stopNo ? `(${stop.stopNo})` : ''}`}
                >
                  <span className="result-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg></span>
                  <span className="result-info">
                    <strong>{stop.name}</strong>
                    <span className="result-detail">{stop.stopNo || '정류장'}</span>
                  </span>
                  <span className="result-action" aria-hidden="true">선택 →</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchQuery && !isSearching && groupedSubwayResults.length === 0 && busResults.length === 0 && (
          <div className="apple-no-results">
            검색 결과가 없습니다
          </div>
        )}

        {!searchQuery && (
          <div className="apple-search-hint">
            <p>{currentTransport === 'subway' ? '지하철역' : '버스 정류장'} 이름을 검색하세요</p>
            <p className="hint-example">
              {currentTransport === 'subway'
                ? '예: 강남, 홍대입구, 여의도'
                : '예: 강남역, 시청앞, 명동'}
            </p>
            {currentTransport === 'subway' && (
              <p className="hint-note" style={{ marginTop: '0.5rem', color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                역 이름 검색 후 원하는 호선을 선택할 수 있어요
              </p>
            )}
          </div>
        )}
      </div>

      <div className="apple-step-footer">
        <button
          type="button"
          className="apple-btn-secondary"
          onClick={() => onStepChange('select-transport')}
        >
          이전
        </button>
      </div>
    </section>
  );
}
