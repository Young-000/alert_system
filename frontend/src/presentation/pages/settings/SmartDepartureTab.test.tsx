import { render, screen, waitFor } from '@testing-library/react';
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
