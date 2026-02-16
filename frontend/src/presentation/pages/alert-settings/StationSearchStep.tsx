import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { TransportItem, GroupedStation } from './types';

interface StationSearchStepProps {
  readonly transportTypes: ('subway' | 'bus')[];
  readonly searchQuery: string;
  readonly searchResults: TransportItem[];
  readonly selectedTransports: TransportItem[];
  readonly isSearching: boolean;
  readonly groupedStations: GroupedStation[];
  readonly selectedStation: GroupedStation | null;
  readonly savedRoutes: RouteResponse[];
  readonly onSearchChange: (query: string) => void;
  readonly onToggleTransport: (item: TransportItem) => void;
  readonly onSelectStation: (station: GroupedStation | null) => void;
}

export function StationSearchStep({
  transportTypes,
  searchQuery,
  searchResults,
  selectedTransports,
  isSearching,
  groupedStations,
  selectedStation,
  savedRoutes,
  onSearchChange,
  onToggleTransport,
  onSelectStation,
}: StationSearchStepProps): JSX.Element {
  return (
    <section className="wizard-step">
      <h1>자주 이용하는 역/정류장을 검색하세요</h1>
      <p className="muted">출근길에 이용하는 곳을 선택해주세요</p>

      {/* 경로에서 빠른 선택 */}
      <RouteQuickSelect
        savedRoutes={savedRoutes}
        selectedTransports={selectedTransports}
        selectedStation={selectedStation}
        transportTypes={transportTypes}
        onToggleTransport={onToggleTransport}
      />

      {/* 역 선택 후 노선 선택 UI (2단계) */}
      {selectedStation ? (
        <LineSelection
          selectedStation={selectedStation}
          selectedTransports={selectedTransports}
          onToggleTransport={onToggleTransport}
          onBack={() => onSelectStation(null)}
          onClearSearch={() => onSearchChange('')}
        />
      ) : (
        <SearchSection
          searchQuery={searchQuery}
          isSearching={isSearching}
          groupedStations={groupedStations}
          searchResults={searchResults}
          selectedTransports={selectedTransports}
          transportTypes={transportTypes}
          onSearchChange={onSearchChange}
          onToggleTransport={onToggleTransport}
          onSelectStation={onSelectStation}
        />
      )}

      {selectedTransports.length > 0 && (
        <div className="selected-items">
          <p className="muted">선택됨:</p>
          <div className="selected-tags">
            {selectedTransports.map((item) => (
              <span key={`${item.type}-${item.id}`} className="tag">
                {item.type === 'subway' ? '지하철' : '버스'} {item.name}
                <button
                  type="button"
                  className="tag-remove"
                  aria-label={`${item.name} 제거`}
                  onClick={() => onToggleTransport(item)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// --- Sub-components for StationSearchStep ---

interface RouteQuickSelectProps {
  readonly savedRoutes: RouteResponse[];
  readonly selectedTransports: TransportItem[];
  readonly selectedStation: GroupedStation | null;
  readonly transportTypes: ('subway' | 'bus')[];
  readonly onToggleTransport: (item: TransportItem) => void;
}

function RouteQuickSelect({
  savedRoutes,
  selectedTransports,
  selectedStation,
  transportTypes,
  onToggleTransport,
}: RouteQuickSelectProps): JSX.Element | null {
  if (savedRoutes.length === 0 || selectedTransports.length > 0 || selectedStation) {
    return null;
  }

  const routeStops: { route: RouteResponse; stop: TransportItem }[] = [];
  savedRoutes.forEach(route => {
    const firstSubway = route.checkpoints.find(c => c.checkpointType === 'subway' && c.linkedStationId);
    const firstBus = route.checkpoints.find(c => c.checkpointType === 'bus_stop' && c.linkedBusStopId);

    if (transportTypes.includes('subway') && firstSubway && firstSubway.linkedStationId) {
      routeStops.push({
        route,
        stop: {
          type: 'subway',
          id: firstSubway.linkedStationId,
          name: firstSubway.name,
          detail: firstSubway.lineInfo || '',
        },
      });
    }
    if (transportTypes.includes('bus') && firstBus && firstBus.linkedBusStopId) {
      routeStops.push({
        route,
        stop: {
          type: 'bus',
          id: firstBus.linkedBusStopId,
          name: firstBus.name,
          detail: '',
        },
      });
    }
  });

  if (routeStops.length === 0) return null;

  return (
    <div className="quick-select-section quick-select-highlighted">
      <p className="quick-select-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        {' '}내 경로에서 추천
      </p>
      <div className="quick-select-list">
        {routeStops.slice(0, 3).map(({ route, stop }) => (
          <button
            key={`${route.id}-${stop.id}`}
            type="button"
            className="quick-select-btn"
            onClick={() => onToggleTransport(stop)}
          >
            <span className="qs-icon" aria-hidden="true">{stop.type === 'subway' ? '지하철' : '버스'}</span>
            <span className="qs-name">{stop.name}</span>
            <span className="qs-route">{route.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface LineSelectionProps {
  readonly selectedStation: GroupedStation;
  readonly selectedTransports: TransportItem[];
  readonly onToggleTransport: (item: TransportItem) => void;
  readonly onBack: () => void;
  readonly onClearSearch: () => void;
}

function LineSelection({
  selectedStation,
  selectedTransports,
  onToggleTransport,
  onBack,
  onClearSearch,
}: LineSelectionProps): JSX.Element {
  return (
    <div className="line-selection-step">
      <button
        type="button"
        className="back-to-search"
        onClick={onBack}
        aria-label="역 선택으로 돌아가기"
      >
        &larr; {selectedStation.name}역
      </button>
      <h3 className="line-selection-title">노선을 선택하세요</h3>
      <div className="line-grid" role="radiogroup" aria-label="노선 선택">
        {selectedStation.lines.map((line) => {
          const isSelected = selectedTransports.some(
            (t) => t.id === line.id && t.type === line.type
          );
          return (
            <button
              key={`${line.type}-${line.id}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`line-chip-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                onToggleTransport(line);
                onBack();
                onClearSearch();
              }}
            >
              {line.detail}
              {isSelected && <span className="check-sm">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SearchSectionProps {
  readonly searchQuery: string;
  readonly isSearching: boolean;
  readonly groupedStations: GroupedStation[];
  readonly searchResults: TransportItem[];
  readonly selectedTransports: TransportItem[];
  readonly transportTypes: ('subway' | 'bus')[];
  readonly onSearchChange: (query: string) => void;
  readonly onToggleTransport: (item: TransportItem) => void;
  readonly onSelectStation: (station: GroupedStation) => void;
}

function SearchSection({
  searchQuery,
  isSearching,
  groupedStations,
  searchResults,
  selectedTransports,
  transportTypes,
  onSearchChange,
  onToggleTransport,
  onSelectStation,
}: SearchSectionProps): JSX.Element {
  return (
    <>
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          id="station-search"
          type="search"
          className="search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="예: 강남역, 홍대입구"
          autoFocus
          aria-label="역 또는 정류장 검색"
          autoComplete="off"
        />
      </div>

      <div aria-live="polite" aria-busy={isSearching}>
        {isSearching && <p className="muted">검색 중...</p>}
      </div>

      {/* 지하철만 선택 시: 역 그룹 먼저 표시 */}
      {groupedStations.length > 0 && transportTypes.length === 1 && transportTypes[0] === 'subway' ? (
        <div className="search-results station-groups" role="listbox" aria-label="역 검색 결과">
          {groupedStations.map((station) => (
            <button
              key={station.name}
              type="button"
              role="option"
              className="search-result-item station-group-item"
              onClick={() => {
                if (station.lines.length === 1) {
                  onToggleTransport(station.lines[0]);
                  onSearchChange('');
                } else {
                  onSelectStation(station);
                }
              }}
            >
              <span className="result-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="10" y2="21" />
                </svg>
              </span>
              <div className="result-info">
                <strong>{station.name}역</strong>
                <span className="muted line-count">{station.lines.length}개 노선</span>
              </div>
              <span className="arrow-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
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
                onClick={() => onToggleTransport(item)}
              >
                <span className="result-icon" aria-hidden="true">
                  {item.type === 'subway' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                      <line x1="10" y1="3" x2="10" y2="21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="14" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M7 21l2-4" />
                      <path d="M17 21l-2-4" />
                    </svg>
                  )}
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
          <span className="empty-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <p className="empty-title">검색 결과가 없습니다</p>
          <p className="empty-desc">
            &quot;{searchQuery}&quot;에 해당하는 {transportTypes.includes('subway') && transportTypes.includes('bus') ? '역/정류장' : transportTypes.includes('subway') ? '역' : '정류장'}을 찾을 수 없어요.
            <br />
            다른 이름으로 검색해보세요.
          </p>
        </div>
      ) : null}
    </>
  );
}
