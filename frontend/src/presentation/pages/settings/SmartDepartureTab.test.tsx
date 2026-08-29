import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartDepartureTab } from './SmartDepartureTab';
import { TestProviders } from '../../../test-utils';

const { commuteApi, smartDepartureApi } = vi.hoisted(() => ({
  commuteApi: { getUserRoutes: vi.fn() },
  smartDepartureApi: {
    getSettings: vi.fn(),
    createSetting: vi.fn(),
    deleteSetting: vi.fn(),
    toggleSetting: vi.fn(),
  },
}));

vi.mock('@infrastructure/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  smartDepartureApiClient: smartDepartureApi,
  getCommuteApiClient: () => commuteApi,
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

const mockSmartDepartureApi = smartDepartureApi;

function renderTab(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <SmartDepartureTab />
    </TestProviders>,
  );
}

describe('SmartDepartureTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartDepartureApi.getSettings.mockResolvedValue([]);
    commuteApi.getUserRoutes.mockResolvedValue([]);
  });

  it('경로를 아직 불러오는 중에는 "경로를 등록해주세요"를 띄우지 않는다', async () => {
    // 설정은 즉시, 경로는 아직 응답하지 않은 상태 — 경로가 있는 사용자에게
    // 잘못된 빈 상태가 스쳐 보이면 안 된다.
    mockSmartDepartureApi.getSettings.mockResolvedValue([]);
    commuteApi.getUserRoutes.mockReturnValue(new Promise(() => {}));

    renderTab();

    // 설정 응답이 끝난 뒤에도 경로가 미확정인 동안은 빈 상태를 확정하지 않는다.
    // (수정 전에는 설정이 먼저 도착한 순간 이 문구가 떠버렸다)
    await expect(
      screen.findByText('먼저 경로를 등록해주세요'),
    ).rejects.toThrow();

    // 로딩은 계속 유지된다
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('경로가 하나도 없으면 경로 설정으로 가는 다음 행동을 제공한다', async () => {
    commuteApi.getUserRoutes.mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('먼저 경로를 등록해주세요')).toBeInTheDocument();
    });

    // dead-end 금지 — 빈 상태에서 다음 행동이 정확히 하나 있어야 한다
    const cta = screen.getByRole('link', { name: '경로 등록하러 가기' });
    expect(cta).toHaveAttribute('href', '/routes');
  });

  it('경로가 있으면 설정 없음 빈 상태를 보여준다', async () => {
    commuteApi.getUserRoutes.mockResolvedValue([
      { id: 'route-1', name: '출근 경로', routeType: 'morning' },
    ] as never);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('등록된 스마트 출발 설정이 없습니다')).toBeInTheDocument();
    });
    expect(screen.queryByText('먼저 경로를 등록해주세요')).not.toBeInTheDocument();
  });
});

describe('SmartDepartureTab — ON/OFF 토글', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commuteApi.getUserRoutes.mockResolvedValue([
      { id: 'route-1', name: '출근 경로', routeType: 'morning' },
    ] as never);
    mockSmartDepartureApi.getSettings.mockResolvedValue([
      {
        id: 'setting-1',
        userId: 'user-1',
        routeId: 'route-1',
        departureType: 'commute',
        arrivalTarget: '09:00',
        prepTimeMinutes: 15,
        isEnabled: true,
        activeDays: [1, 2, 3, 4, 5],
        preAlerts: [10],
        createdAt: '2026-08-12T00:00:00.000Z',
        updatedAt: '2026-08-12T00:00:00.000Z',
      },
    ] as never);
  });

  it('토글이 실패하면 실패 사실을 화면에 알린다', async () => {
    // 생성/삭제는 actionError 배너를 쓰는데 토글만 조용히 삼켰다.
    mockSmartDepartureApi.toggleSetting.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '출근 비활성화' });

    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '설정 상태 변경에 실패했습니다.',
      );
    });
  });

  it('토글이 성공하면 에러를 띄우지 않는다', async () => {
    mockSmartDepartureApi.toggleSetting.mockResolvedValue({ id: 'setting-1' } as never);
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '출근 비활성화' });

    await user.click(toggle);

    await waitFor(() => {
      expect(mockSmartDepartureApi.toggleSetting).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('요청이 끝나기 전 다시 눌러도 중복 요청을 보내지 않는다', async () => {
    mockSmartDepartureApi.toggleSetting.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderTab();
    const toggle = await screen.findByRole('button', { name: '출근 비활성화' });

    await user.click(toggle);
    await user.click(toggle);

    expect(mockSmartDepartureApi.toggleSetting).toHaveBeenCalledTimes(1);
  });
});

describe('SmartDepartureTab — 조회 실패', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 경로는 정상 응답시킨다 — 경로가 비면 "먼저 경로를 등록해주세요"라는
    // 다른 빈 상태가 잡혀서 설정 조회 실패를 검증할 수 없다.
    commuteApi.getUserRoutes.mockResolvedValue([
      { id: 'route-1', name: '출근 경로', routeType: 'morning' },
    ] as never);
  });

  it('조회에 실패하면 "설정이 없습니다"라고 단언하지 않는다', async () => {
    // 설정 조회가 실패해도 data=undefined / isLoading=false가 되어
    // 저장해 둔 스마트 출발 설정이 사라진 것처럼 보인다.
    mockSmartDepartureApi.getSettings.mockRejectedValue(new Error('500'));

    renderTab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('등록된 스마트 출발 설정이 없습니다'),
    ).not.toBeInTheDocument();
  });

  it('조회에 실패하면 다시 시도할 수 있다', async () => {
    mockSmartDepartureApi.getSettings.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();

    renderTab();
    const retry = await screen.findByRole('button', { name: '다시 시도' });

    mockSmartDepartureApi.getSettings.mockResolvedValue([]);
    await user.click(retry);

    expect(
      await screen.findByText('등록된 스마트 출발 설정이 없습니다'),
    ).toBeInTheDocument();
  });

  it('조회에 성공하면 빈 상태를 정상적으로 보여준다', async () => {
    // 대조군 — 진짜 빈 목록은 그대로 빈 상태로 남는다.
    mockSmartDepartureApi.getSettings.mockResolvedValue([]);

    renderTab();

    expect(
      await screen.findByText('등록된 스마트 출발 설정이 없습니다'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('SmartDepartureTab — 실패가 예정된 등록 폼으로 밀지 않는다', () => {
  // 서버는 같은 departureType이 이미 있으면 409 `이미 출근 설정이 존재합니다.`로
  // 거절한다(manage-smart-departure.use-case.ts:55). 유형은 출근·퇴근 둘뿐이라
  // 둘 다 등록해 둔 사용자에게 폼을 열어주면 무엇을 골라도 실패한다.
  function setting(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'sd-1',
      userId: 'user-1',
      routeId: 'route-1',
      departureType: 'commute',
      arrivalTarget: '09:00',
      prepTimeMinutes: 15,
      isEnabled: true,
      activeDays: [1, 2, 3, 4, 5],
      preAlerts: [],
      createdAt: '2026-08-12T00:00:00.000Z',
      updatedAt: '2026-08-12T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    commuteApi.getUserRoutes.mockResolvedValue([{ id: 'route-1', name: '출근길' }]);
  });

  it('출근·퇴근을 모두 등록했으면 추가 버튼을 열어주지 않는다', async () => {
    mockSmartDepartureApi.getSettings.mockResolvedValue([
      setting({ id: 'sd-1', departureType: 'commute' }),
      setting({ id: 'sd-2', departureType: 'return' }),
    ]);

    renderTab();

    // 로딩 중에는 헤더 자체가 없으므로, 목록이 그려진 뒤에 판정해야 한다.
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(2);
    });
    expect(
      screen.queryByRole('button', { name: '+ 추가' }),
    ).not.toBeInTheDocument();
  });

  it('조회에 실패했으면 추가 버튼을 열어주지 않는다', async () => {
    mockSmartDepartureApi.getSettings.mockRejectedValue(new Error('500'));

    renderTab();

    // 에러 화면이 확정된 뒤에 판정한다 (로딩 중 통과하는 가짜 성공 방지).
    await screen.findByRole('button', { name: '다시 시도' });
    expect(
      screen.queryByRole('button', { name: '+ 추가' }),
    ).not.toBeInTheDocument();
  });

  it('이미 등록된 유형은 폼의 선택지에서 뺀다', async () => {
    // 기본값이 '출근'으로 고정돼 있어, 출근을 이미 등록한 사용자가 폼을 열면
    // 그대로 제출하는 순간 409가 난다.
    mockSmartDepartureApi.getSettings.mockResolvedValue([
      setting({ id: 'sd-1', departureType: 'commute' }),
    ]);
    const user = userEvent.setup();

    renderTab();
    await user.click(await screen.findByRole('button', { name: '+ 추가' }));

    const select = screen.getByLabelText('유형') as HTMLSelectElement;
    expect(select.value).toBe('return');
    expect(
      screen.queryByRole('option', { name: '🌅 출근' }),
    ).not.toBeInTheDocument();
  });

  it('아무것도 등록하지 않았으면 두 유형 모두 고를 수 있다', async () => {
    // 대조군 — 정상 경로까지 막아버리지 않는다는 것을 고정한다.
    mockSmartDepartureApi.getSettings.mockResolvedValue([]);
    const user = userEvent.setup();

    renderTab();
    await user.click(await screen.findByRole('button', { name: '+ 추가' }));

    expect(screen.getByRole('option', { name: '🌅 출근' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🌇 퇴근' })).toBeInTheDocument();
  });
});
