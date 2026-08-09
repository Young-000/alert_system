import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTransportSearch } from './use-transport-search';
import { subwayApiClient } from '@infrastructure/api';
import type { SubwayStation } from '@infrastructure/api';
import { SEARCH_DEBOUNCE_MS } from './types';

vi.mock('@infrastructure/api', () => ({
  subwayApiClient: { searchStations: vi.fn() },
  busApiClient: { searchStops: vi.fn() },
}));

const searchStations = vi.mocked(subwayApiClient.searchStations);

function station(name: string, line: string): SubwayStation {
  return { id: `${name}-${line}`, name, line } as SubwayStation;
}

/** 해결 시점을 테스트가 정하는 Promise */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const SUBWAY_ONLY: ('subway' | 'bus')[] = ['subway'];

describe('useTransportSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    searchStations.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('검색어를 2글자 미만으로 지우면 검색 중 표시가 풀린다', async () => {
    // 검색 중에 사용자가 지워서 검색 대상이 사라지면, 진행 중이던 요청은
    // abort 처리돼 아무 상태도 되돌리지 않는다. 새로 도는 이펙트가
    // isSearching을 내리지 않으면 빈 입력창 위에 "검색 중..."이 영구히 남는다.
    const pending = deferred<SubwayStation[]>();
    searchStations.mockReturnValue(pending.promise);

    const { result } = renderHook(() => useTransportSearch(SUBWAY_ONLY));

    act(() => result.current.setSearchQuery('강남'));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(result.current.isSearching).toBe(true);

    // 한 글자로 지운다 → 검색 대상 아님
    act(() => result.current.setSearchQuery('강'));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    // 뒤늦게 도착한 이전 응답은 abort된 상태라 아무것도 되돌리지 않는다
    await act(async () => {
      pending.resolve([station('강남역', '2호선')]);
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.searchResults).toEqual([]);
  });

  it('검색어를 완전히 비워도 검색 중 표시가 풀린다', async () => {
    const pending = deferred<SubwayStation[]>();
    searchStations.mockReturnValue(pending.promise);

    const { result } = renderHook(() => useTransportSearch(SUBWAY_ONLY));

    act(() => result.current.setSearchQuery('강남'));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(result.current.isSearching).toBe(true);

    act(() => result.current.setSearchQuery(''));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
  });

  it('검색이 끝나면 결과를 담고 검색 중 표시를 푼다', async () => {
    searchStations.mockResolvedValue([station('강남역', '2호선')]);

    const { result } = renderHook(() => useTransportSearch(SUBWAY_ONLY));

    act(() => result.current.setSearchQuery('강남'));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.searchError).toBeNull();
  });

  it('검색이 실패하면 사유와 재시도 경로를 남긴다', async () => {
    searchStations.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useTransportSearch(SUBWAY_ONLY));

    act(() => result.current.setSearchQuery('강남'));
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.searchError).not.toBeNull());
    expect(result.current.isSearching).toBe(false);

    // 재시도는 같은 검색어로 이펙트를 다시 돌린다
    searchStations.mockResolvedValue([station('강남역', '2호선')]);
    act(() => result.current.retrySearch());
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.searchResults).toHaveLength(1));
    expect(result.current.searchError).toBeNull();
  });
});
