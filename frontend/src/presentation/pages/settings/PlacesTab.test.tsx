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

describe('PlacesTab — 조회 실패', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회에 실패하면 "등록된 장소가 없습니다"라고 단언하지 않는다', async () => {
    // 실패는 data=undefined로 들어오고 isLoading은 false가 된다. 그대로 그리면
    // 등록해 둔 집·직장이 지워진 것처럼 보인다.
    placeApi.getPlaces.mockRejectedValue(new Error('500'));

    renderTab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.queryByText('등록된 장소가 없습니다')).not.toBeInTheDocument();
  });

  it('조회에 실패하면 다시 시도할 수 있다', async () => {
    // dead-end 금지 — 그 화면에서 할 수 있는 일이 하나는 있어야 한다.
    placeApi.getPlaces.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();

    renderTab();
    const retry = await screen.findByRole('button', { name: '다시 시도' });

    placeApi.getPlaces.mockResolvedValue([place()]);
    await user.click(retry);

    expect(await screen.findByText('우리집')).toBeInTheDocument();
  });

  it('조회에 성공하면 빈 상태를 정상적으로 보여준다', async () => {
    // 대조군 — 진짜 빈 목록까지 에러로 바꿔버리지 않는다는 것을 고정한다.
    placeApi.getPlaces.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText('등록된 장소가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('PlacesTab — 실패가 예정된 등록 폼으로 밀지 않는다', () => {
  // 서버는 같은 유형이 이미 있으면 409 `이미 등록된 집 장소가 있습니다.`로 거절한다
  // (manage-places.use-case.ts createPlace). 유형은 집·직장 둘뿐이라
  // 둘 다 등록해 둔 사용자에게 등록 폼을 열어주면 무엇을 골라도 실패한다.
  // 모바일(`mobile/app/places.tsx` canAddMore)에는 이 방어가 있었고 웹에만 없었다.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('집·직장을 모두 등록했으면 추가 버튼을 열어주지 않는다', async () => {
    placeApi.getPlaces.mockResolvedValue([
      place({ id: 'p1', placeType: 'home', label: '우리집' }),
      place({ id: 'p2', placeType: 'work', label: '사무실' }),
    ]);

    renderTab();

    expect(await screen.findByText('우리집')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ 추가' })).not.toBeInTheDocument();
  });

  it('조회에 실패했으면 추가 버튼을 열어주지 않는다', async () => {
    // 무엇이 등록돼 있는지 모르는 상태다. 이미 2개를 등록한 사용자에게
    // 빈 목록처럼 보인다고 등록을 권하면 409로 끝난다.
    placeApi.getPlaces.mockRejectedValue(new Error('500'));

    renderTab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: '+ 추가' })).not.toBeInTheDocument();
  });

  it('이미 등록된 유형은 폼의 선택지에서 뺀다', async () => {
    // 기본값이 '집'으로 고정돼 있어, 집만 등록한 사용자가 폼을 열면
    // 그대로 제출하는 순간 409가 난다.
    placeApi.getPlaces.mockResolvedValue([
      place({ id: 'p1', placeType: 'home', label: '우리집' }),
    ]);
    const user = userEvent.setup();

    renderTab();
    await user.click(await screen.findByRole('button', { name: '+ 추가' }));

    const select = screen.getByLabelText('유형') as HTMLSelectElement;
    expect(select.value).toBe('work');
    expect(
      screen.queryByRole('option', { name: '🏠 집' }),
    ).not.toBeInTheDocument();
  });

  it('아무것도 등록하지 않았으면 두 유형 모두 고를 수 있다', async () => {
    // 대조군 — 정상 경로까지 막아버리지 않는다는 것을 고정한다.
    placeApi.getPlaces.mockResolvedValue([]);
    const user = userEvent.setup();

    renderTab();
    await user.click(await screen.findByRole('button', { name: '+ 추가' }));

    expect(screen.getByRole('option', { name: '🏠 집' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🏢 직장' })).toBeInTheDocument();
  });
});
