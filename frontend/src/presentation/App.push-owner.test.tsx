import { renderHook, waitFor } from '@testing-library/react';
import { syncPushSubscriptionOwner } from '@infrastructure/push/push-manager';
import { usePushSubscriptionOwner } from './App';

vi.mock('@infrastructure/push/push-manager', () => ({
  syncPushSubscriptionOwner: vi.fn().mockResolvedValue(true),
}));

const mockedSync = syncPushSubscriptionOwner as unknown as ReturnType<typeof vi.fn>;

/**
 * 훅이 App에 실제로 걸려 있지 않으면 push-manager의 소유권 이전은 한 번도 불리지 않는다.
 * 배선 자체를 고정한다.
 */
describe('usePushSubscriptionOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('로그인한 사용자로 소유권 이전을 요청한다', async () => {
    localStorage.setItem('userId', 'user-새로운');

    renderHook(() => usePushSubscriptionOwner());

    await waitFor(() => expect(mockedSync).toHaveBeenCalledWith('user-새로운'));
  });

  it('비로그인 상태에서는 요청하지 않는다', () => {
    renderHook(() => usePushSubscriptionOwner());
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it('이전에 실패해도 화면을 죽이지 않는다', async () => {
    localStorage.setItem('userId', 'user-1');
    mockedSync.mockRejectedValueOnce(new Error('network down'));

    expect(() => renderHook(() => usePushSubscriptionOwner())).not.toThrow();
    await waitFor(() => expect(mockedSync).toHaveBeenCalled());
  });
});
