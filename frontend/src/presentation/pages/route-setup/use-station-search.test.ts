import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStationSearch } from './use-station-search';
import { subwayApiClient } from '@infrastructure/api';
import type { SubwayStation } from '@infrastructure/api';

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

describe('useStationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    searchStations.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('늦게 도착한 이전 검색 응답이 최신 결과를 덮어쓰지 않는다', async () => {
    // 디바운스는 요청 수를 줄일 뿐, 이미 나간 요청의 순서를 보장하지 않는다.
    // 먼저 보낸 "강남"의 응답이 "역삼"보다 늦게 오면 입력창과 목록이 어긋난다.
    const slowFirst = deferred<SubwayStation[]>();
    const fastSecond = deferred<SubwayStation[]>();
    searchStations
      .mockReturnValueOnce(slowFirst.promise)
      .mockReturnValueOnce(fastSecond.promise);

    const { result } = renderHook(() =>
      useStationSearch('subway', [], vi.fn()),
    );

    act(() => result.current.handleSearchChange('강남'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => result.current.handleSearchChange('역삼'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 최신 요청이 먼저 도착
    await act(async () => {
      fastSecond.resolve([station('역삼', '2호선')]);
      await fastSecond.promise;
    });
    // 뒤늦게 도착한 이전 요청
    await act(async () => {
      slowFirst.resolve([station('강남', '2호선')]);
      await slowFirst.promise;
    });

    await waitFor(() => {
      expect(result.current.subwayResults.map((s) => s.name)).toEqual(['역삼']);
    });
  });

  it('검색어를 지운 뒤 도착한 응답이 목록을 되살리지 않는다', async () => {
    // 역을 고르면 clearSearch()로 목록을 비우는데, 그 시점에 떠 있던 요청이
    // 뒤늦게 도착해 목록을 다시 채우면 이미 선택을 끝낸 화면에 드롭다운이 되살아난다.
    const pending = deferred<SubwayStation[]>();
    searchStations.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() =>
      useStationSearch('subway', [], vi.fn()),
    );

    act(() => result.current.handleSearchChange('강남'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => result.current.clearSearch());

    await act(async () => {
      pending.resolve([station('강남', '2호선')]);
      await pending.promise;
    });

    expect(result.current.subwayResults).toEqual([]);
  });

  it('검색어를 모두 지우면 검색 중 표시가 풀린다', async () => {
    // 빈 검색어로 들어온 호출은 요청 번호만 올리고 곧장 빠져나간다. 그 사이
    // 떠 있던 요청은 stale로 판정돼 finally에서 isSearching을 내리지 않으므로,
    // 아무도 내리지 않으면 빈 입력창 위에 "검색 중..."이 영구히 남는다.
    const pending = deferred<SubwayStation[]>();
    searchStations.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() =>
      useStationSearch('subway', [], vi.fn()),
    );

    act(() => result.current.handleSearchChange('강남'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isSearching).toBe(true);

    act(() => result.current.handleSearchChange(''));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {
      pending.resolve([station('강남', '2호선')]);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.subwayResults).toEqual([]);
  });
});
