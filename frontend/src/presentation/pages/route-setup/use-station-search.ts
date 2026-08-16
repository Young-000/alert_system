import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { subwayApiClient, busApiClient, type SubwayStation, type BusStop } from '@infrastructure/api';
import type { LocalTransportMode, GroupedStation, SelectedStop } from './types';

interface UseStationSearchReturn {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  subwayResults: SubwayStation[];
  busResults: BusStop[];
  isSearching: boolean;
  searchError: string;
  groupedSubwayResults: GroupedStation[];
  lineSelectionModal: GroupedStation | null;
  setLineSelectionModal: React.Dispatch<React.SetStateAction<GroupedStation | null>>;
  handleSearchChange: (value: string) => void;
  retrySearch: () => void;
  clearSearch: () => void;
  handleStationClick: (grouped: GroupedStation) => void;
  handleLineSelect: (stationName: string, line: string, stationId: string) => void;
  handleSelectBusStop: (stop: BusStop) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function useStationSearch(
  currentTransport: LocalTransportMode,
  selectedStops: SelectedStop[],
  onStopSelected: (name: string, line: string, id: string) => void,
): UseStationSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [subwayResults, setSubwayResults] = useState<SubwayStation[]>([]);
  const [busResults, setBusResults] = useState<BusStop[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lineSelectionModal, setLineSelectionModal] = useState<GroupedStation | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // 가장 최근에 시작한 검색의 번호. 응답이 돌아왔을 때 이 값과 다르면 버린다.
  const latestRequestRef = useRef(0);

  const searchStops = useCallback(async (query: string) => {
    // 디바운스는 요청 수를 줄일 뿐 응답 순서를 보장하지 않는다. 먼저 보낸 검색의
    // 응답이 늦게 도착하면 입력창은 "역삼"인데 목록은 "강남"이 된다.
    const requestId = ++latestRequestRef.current;
    const isStale = (): boolean => latestRequestRef.current !== requestId;

    if (!query || query.length < 1) {
      setSubwayResults([]);
      setBusResults([]);
      // 위에서 요청 번호를 올려 진행 중이던 검색을 stale로 만들었으므로
      // 그 검색의 finally는 isSearching을 내리지 않는다. 여기서 내린다.
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    try {
      if (currentTransport === 'subway') {
        const results = await subwayApiClient.searchStations(query);
        if (isStale()) return;
        setSubwayResults(results.slice(0, 10));
        setBusResults([]);
      } else {
        const results = await busApiClient.searchStops(query);
        if (isStale()) return;
        setBusResults(results.slice(0, 6));
        setSubwayResults([]);
      }
    } catch {
      if (isStale()) return;
      setSubwayResults([]);
      setBusResults([]);
      setSearchError('검색에 실패했습니다');
    } finally {
      if (!isStale()) setIsSearching(false);
    }
  }, [currentTransport]);

  const groupedSubwayResults = useMemo((): GroupedStation[] => {
    const groups: Map<string, GroupedStation> = new Map();

    for (const station of subwayResults) {
      const existing = groups.get(station.name);
      if (existing) {
        if (!existing.lines.some(l => l.line === station.line)) {
          existing.lines.push({ line: station.line, id: station.id });
        }
      } else {
        groups.set(station.name, {
          name: station.name,
          lines: [{ line: station.line, id: station.id }],
        });
      }
    }

    return Array.from(groups.values());
  }, [subwayResults]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchStops(value), SEARCH_DEBOUNCE_MS);
  }, [searchStops]);

  // 실패한 검색을 같은 검색어 그대로 다시 보낸다. 아직 안 나간 디바운스가 있으면
  // 취소한다 — 재시도와 겹치면 같은 질의가 두 번 나간다.
  const retrySearch = useCallback(() => {
    clearTimeout(searchTimerRef.current);
    void searchStops(searchQuery);
  }, [searchStops, searchQuery]);

  const clearSearch = useCallback(() => {
    // 역을 고른 뒤에도 떠 있던 요청이 돌아오면 드롭다운이 되살아난다.
    // 아직 안 나간 디바운스와 이미 나간 요청을 함께 무효화한다.
    clearTimeout(searchTimerRef.current);
    latestRequestRef.current += 1;
    setSearchQuery('');
    setSubwayResults([]);
    setBusResults([]);
    setIsSearching(false);
  }, []);

  // 언마운트 후 타이머가 깨어나 이미 사라진 화면의 검색을 시작하지 않도록 정리한다.
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  const handleStationClick = useCallback((grouped: GroupedStation) => {
    if (grouped.lines.length === 1) {
      onStopSelected(grouped.name, grouped.lines[0].line, grouped.lines[0].id);
      clearSearch();
      return;
    }

    const subwayStops = selectedStops.filter(s => s.transportMode === 'subway');
    if (subwayStops.length > 0) {
      const existingLines = new Set(subwayStops.map(s => s.line).filter(Boolean));
      const commonLines = grouped.lines.filter(l => existingLines.has(l.line));

      if (commonLines.length === 1) {
        onStopSelected(grouped.name, commonLines[0].line, commonLines[0].id);
        clearSearch();
        return;
      }
      if (commonLines.length > 1) {
        setLineSelectionModal({ ...grouped, lines: commonLines });
        return;
      }
    }

    setLineSelectionModal(grouped);
  }, [selectedStops, onStopSelected, clearSearch]);

  const handleLineSelect = useCallback((stationName: string, line: string, stationId: string) => {
    onStopSelected(stationName, line, stationId);
    setLineSelectionModal(null);
    clearSearch();
  }, [onStopSelected, clearSearch]);

  const handleSelectBusStop = useCallback((stop: BusStop) => {
    onStopSelected(stop.name, '', stop.nodeId);
    clearSearch();
  }, [onStopSelected, clearSearch]);

  return {
    searchQuery,
    setSearchQuery,
    subwayResults,
    busResults,
    isSearching,
    searchError,
    groupedSubwayResults,
    lineSelectionModal,
    setLineSelectionModal,
    handleSearchChange,
    retrySearch,
    clearSearch,
    handleStationClick,
    handleLineSelect,
    handleSelectBusStop,
  };
}
