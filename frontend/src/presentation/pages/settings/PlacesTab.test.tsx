import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacesTab } from './PlacesTab';
import { TestProviders } from '../../../test-utils';
import type { Place } from '@infrastructure/api';

// @infrastructure/api는 vi.mock이 네임스페이스 전체로 접히므로(src/__mocks__/infrastructure/api/)
// importOriginal을 펼친 뒤 필요한 export만 갈아끼운다. 두 번 나눠 mock하면 앞 export가 undefined가 된다.
const { placeApi } = vi.hoisted(() => ({
  placeApi: {
    getPlaces: vi.fn(),
    createPlace: vi.fn(),
    deletePlace: vi.fn(),
    togglePlace: vi.fn(),
  },
}));

vi.mock('@infrastructure/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  placeApiClient: placeApi,
}));

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    userId: 'user-1',
    userName: '회원',
    userEmail: '',
    phoneNumber: '',
    isLoggedIn: true,
  }),
  notifyAuthChange: vi.fn(),
}));

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: 'place-1',
    userId: 'user-1',
    placeType: 'home',
    label: '우리집',
    latitude: 37.5665,
    longitude: 126.978,
    radiusM: 200,
    isActive: true,
    createdAt: '2026-08-12T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
    ...overrides,
  };
}

function renderTab(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <PlacesTab />
    </TestProviders>,
  );
}

describe('PlacesTab — 장소 ON/OFF 토글', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placeApi.getPlaces.mockResolvedValue([place()]);
  });

  it('토글이 실패하면 실패 사실을 화면에 알린다', async () => {
    // 등록/삭제는 actionError 배너로 실패를 알리는데 토글만 조용히 삼켰다.
    // 전역 MutationCache.onError는 logError(텔레메트리)만 하므로 사용자에게는 아무 일도 일어나지 않는다.
    placeApi.togglePlace.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '우리집 비활성화' });

    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '장소 상태 변경에 실패했습니다.',
      );
    });
  });

  it('토글이 성공하면 에러를 띄우지 않는다', async () => {
    // 대조군 — 무조건 에러를 그리는 게 아니라는 것을 고정한다.
    placeApi.togglePlace.mockResolvedValue(place({ isActive: false }));
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '우리집 비활성화' });

    await user.click(toggle);

    await waitFor(() => {
      expect(placeApi.togglePlace).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('요청이 끝나기 전 다시 눌러도 중복 요청을 보내지 않는다', async () => {
    // 삭제 버튼은 isDeleting으로 막혀 있는데 토글에는 그 방어가 없었다.
    placeApi.togglePlace.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '우리집 비활성화' });

    await user.click(toggle);
    await user.click(toggle);

    expect(placeApi.togglePlace).toHaveBeenCalledTimes(1);
  });
});
