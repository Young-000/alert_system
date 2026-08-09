import { useState, useEffect, useCallback } from 'react';
import {
  subwayApiClient,
  busApiClient,
} from '@infrastructure/api';
import type { SubwayStation, BusStop } from '@infrastructure/api';
import type { TransportItem, GroupedStation } from './types';
import { SEARCH_DEBOUNCE_MS, MAX_SEARCH_RESULTS } from './types';

interface TransportSearchState {
  searchQuery: string;
  searchResults: TransportItem[];
  selectedTransports: TransportItem[];
  isSearching: boolean;
  searchError: string | null;
  groupedStations: GroupedStation[];
  selectedStation: GroupedStation | null;
}

interface TransportSearchActions {
  setSearchQuery: (query: string) => void;
  setSelectedTransports: React.Dispatch<React.SetStateAction<TransportItem[]>>;
  setSelectedStation: (station: GroupedStation | null) => void;
  toggleTransport: (item: TransportItem) => void;
  retrySearch: () => void;
}

export function useTransportSearch(
  transportTypes: ('subway' | 'bus')[],
): TransportSearchState & TransportSearchActions {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TransportItem[]>([]);
  const [selectedTransports, setSelectedTransports] = useState<TransportItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [groupedStations, setGroupedStations] = useState<GroupedStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<GroupedStation | null>(null);
  // Bumped by retrySearch to re-run the effect with an unchanged query.
  const [retryNonce, setRetryNonce] = useState(0);

  const retrySearch = useCallback((): void => {
    setRetryNonce((n) => n + 1);
  }, []);

  // Unified search for subway + bus (with grouping for 2-step selection)
  useEffect(() => {
    const shouldSearch = searchQuery.trim().length >= 2;

    const controller = new AbortController();

    const searchTimeout = setTimeout(async () => {
      if (!shouldSearch) {
        setSearchResults([]);
        setGroupedStations([]);
        setSearchError(null);
        // 진행 중이던 검색은 abort돼 스스로 isSearching을 내리지 않는다.
        // 여기서 내리지 않으면 빈 입력창 위에 "검색 중..."이 영구히 남는다.
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      try {
        const results: TransportItem[] = [];

        if (transportTypes.includes('subway')) {
          const stations = await subwayApiClient.searchStations(searchQuery);
          stations.forEach((s: SubwayStation) => {
            results.push({
              type: 'subway',
              id: s.id,
              name: s.name,
              detail: s.line,
            });
          });
        }

        if (transportTypes.includes('bus')) {
          const stops = await busApiClient.searchStops(searchQuery);
          stops.forEach((s: BusStop) => {
            results.push({
              type: 'bus',
              id: s.nodeId,
              name: s.name,
              detail: `${s.stopNo} · ${s.stopType}`,
            });
          });
        }

        if (!controller.signal.aborted) {
          setSearchResults(results.slice(0, MAX_SEARCH_RESULTS));

          if (transportTypes.includes('subway') && !transportTypes.includes('bus')) {
            const stationMap = new Map<string, TransportItem[]>();
            results.filter(r => r.type === 'subway').forEach(item => {
              const existing = stationMap.get(item.name) || [];
              stationMap.set(item.name, [...existing, item]);
            });
            const grouped: GroupedStation[] = Array.from(stationMap.entries()).map(([name, lines]) => ({
              name,
              lines,
            }));
            setGroupedStations(grouped);
          } else {
            setGroupedStations([]);
          }

          setIsSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setGroupedStations([]);
          setSearchError('검색에 실패했어요. 잠시 후 다시 시도해주세요.');
          setIsSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(searchTimeout);
      controller.abort();
    };
  }, [searchQuery, transportTypes, retryNonce]);

  const toggleTransport = useCallback((item: TransportItem): void => {
    setSelectedTransports((prev) => {
      const exists = prev.find((t) => t.id === item.id && t.type === item.type);
      if (exists) {
        return prev.filter((t) => !(t.id === item.id && t.type === item.type));
      }
      return [...prev, item];
    });
  }, []);

  return {
    searchQuery,
    searchResults,
    selectedTransports,
    isSearching,
    searchError,
    groupedStations,
    selectedStation,
    setSearchQuery,
    setSelectedTransports,
    setSelectedStation,
    toggleTransport,
    retrySearch,
  };
}
