import { useState, useCallback, useMemo, useRef } from 'react';
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

  const searchStops = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSubwayResults([]);
      setBusResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    try {
      if (currentTransport === 'subway') {
        const results = await subwayApiClient.searchStations(query);
        setSubwayResults(results.slice(0, 10));
        setBusResults([]);
      } else {
        const results = await busApiClient.searchStops(query);
        setBusResults(results.slice(0, 6));
        setSubwayResults([]);
      }
    } catch {
      setSubwayResults([]);
      setBusResults([]);
      setSearchError('검색에 실패했습니다');
    } finally {
      setIsSearching(false);
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

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSubwayResults([]);
    setBusResults([]);
  }, []);

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
    clearSearch,
    handleStationClick,
    handleLineSelect,
    handleSelectBusStop,
  };
}
