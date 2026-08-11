import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCommuteDashboard } from './use-commute-dashboard';

/**
 * `@infrastructure/api/` 아래 모듈은 **하나의 mock으로 접힌다**.
 * (`src/__mocks__/infrastructure/api/` 때문에 이 경로의 vi.mock이 네임스페이스
 * 전체에 적용된다. 두 번 부르면 뒤엣것만 남고 앞 export는 undefined가 된다.)
 * 그래서 commute·behavior 클라이언트 getter를 vi.mock 한 번에 같이 넣는다.
 *
 * 클라이언트 인스턴스는 실제 코드와 마찬가지로 **싱글턴**이어야 한다.
 * 매번 새 객체를 주면 commuteApi가 effect 의존성이라 렌더마다 로드가 재실행되고,
 * 앞선 실행이 cleanup(isMounted=false)되면서 에러 상태가 반영되지 않는다.
 */
const mockGetStats = vi.fn();
const mockGetHistory = vi.fn();
const mockGetUserAnalytics = vi.fn();
const mockCompareRoutes = vi.fn();
const mockGetBehaviorAnalytics = vi.fn();
const mockGetPatterns = vi.fn();

const commuteApiStub = {
  getStats: (...args: unknown[]) => mockGetStats(...args),
  getHistory: (...args: unknown[]) => mockGetHistory(...args),
  getUserAnalytics: (...args: unknown[]) => mockGetUserAnalytics(...args),
  compareRoutes: (...args: unknown[]) => mockCompareRoutes(...args),
};
const behaviorApiStub = {
  getAnalytics: (...args: unknown[]) => mockGetBehaviorAnalytics(...args),
  getPatterns: (...args: unknown[]) => mockGetPatterns(...args),
};

vi.mock('@infrastructure/api/commute-api.client', () => ({
  getCommuteApiClient: () => commuteApiStub,
  getBehaviorApiClient: () => behaviorApiStub,
}));

vi.mock('./types', () => ({
  getStopwatchRecords: () => [],
}));

const USER_ID = 'user-1';

/** compareRoutes가 호출되도록 비교 가능한 경로 2개를 가진 통계 */
const STATS = { routeStats: [{ routeId: 'route-1' }, { routeId: 'route-2' }] };
const HISTORY = { sessions: [], totalCount: 0, hasMore: false };

type Failing = 'analytics' | 'compare' | 'behavior' | null;

/** 어느 하위 요청을 실패시킬지 정해 모든 응답을 다시 깐다. */
function routeGet(failing: Failing): void {
  const fail = () => Promise.reject(new Error('boom'));

  mockGetStats.mockResolvedValue(STATS);
  mockGetHistory.mockResolvedValue(HISTORY);
  mockGetPatterns.mockResolvedValue([]);

  if (failing === 'analytics') mockGetUserAnalytics.mockImplementation(fail);
  else mockGetUserAnalytics.mockResolvedValue([]);

  if (failing === 'compare') mockCompareRoutes.mockImplementation(fail);
  else mockCompareRoutes.mockResolvedValue({ routes: [] });

  if (failing === 'behavior') mockGetBehaviorAnalytics.mockImplementation(fail);
  else mockGetBehaviorAnalytics.mockResolvedValue({ hasEnoughData: false });
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  // useAuth는 localStorage를 읽는다 (useAuth.test.ts와 같은 방식)
  localStorage.clear();
  localStorage.setItem('userId', USER_ID);
});

describe('useCommuteDashboard — 재시도하면 부분 실패 문구가 사라진다', () => {
  it('분석 요청이 실패한 뒤 재시도로 성공하면 analyticsError가 비워진다', async () => {
    routeGet('analytics');
    const { result } = renderHook(() => useCommuteDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.analyticsError).toBe('분석 데이터를 불러올 수 없습니다');
    });

    routeGet(null); // 네트워크 복구
    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.analyticsError).toBe('');
    });
  });

  it('비교 요청이 실패한 뒤 재시도로 성공하면 comparisonError가 비워진다', async () => {
    routeGet('compare');
    const { result } = renderHook(() => useCommuteDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.comparisonError).toBe('비교 데이터를 불러올 수 없습니다');
    });

    routeGet(null);
    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.comparisonError).toBe('');
    });
  });

  it('행동 분석이 실패한 뒤 재시도로 성공하면 behaviorError가 비워진다', async () => {
    routeGet('behavior');
    const { result } = renderHook(() => useCommuteDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.behaviorError).toBe('패턴 분석에 실패했습니다');
    });

    routeGet(null);
    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.behaviorError).toBe('');
    });
  });

  it('재시도해도 계속 실패하면 에러 문구는 그대로 남는다', async () => {
    routeGet('analytics');
    const { result } = renderHook(() => useCommuteDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.analyticsError).toBe('분석 데이터를 불러올 수 없습니다');
    });

    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analyticsError).toBe('분석 데이터를 불러올 수 없습니다');
  });
});
