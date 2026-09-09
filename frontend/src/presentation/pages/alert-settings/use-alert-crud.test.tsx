import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlertCrud } from './use-alert-crud';
import type { Alert } from '@infrastructure/api';

const mockGetAlertsByUser = vi.fn();
const mockToggleAlert = vi.fn();
const mockDeleteAlert = vi.fn();
const mockCreateAlert = vi.fn();
const mockUpdateAlert = vi.fn();

vi.mock('@infrastructure/api', () => ({
  alertApiClient: {
    getAlertsByUser: (...args: unknown[]) => mockGetAlertsByUser(...args),
    toggleAlert: (...args: unknown[]) => mockToggleAlert(...args),
    deleteAlert: (...args: unknown[]) => mockDeleteAlert(...args),
    createAlert: (...args: unknown[]) => mockCreateAlert(...args),
    updateAlert: (...args: unknown[]) => mockUpdateAlert(...args),
  },
}));

// 경로 조회는 테스트마다 성공/실패를 갈아끼울 수 있어야 한다.
// 고정 stub이면 조회 실패 자체를 재현할 수 없다.
const routesStub = vi.hoisted(() => ({
  current: { data: [] as unknown[] | undefined, isError: false, refetch: vi.fn() },
}));

vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => routesStub.current,
}));

const USER_ID = 'user-1';

const alertOn: Alert = {
  id: 'alert-1',
  userId: USER_ID,
  name: '출근 알림',
  schedule: '0 8 * * *',
  alertTypes: ['weather'],
  enabled: true,
} as Alert;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useAlertCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routesStub.current = { data: [], isError: false, refetch: vi.fn() };
  });

  describe('경로 조회 실패', () => {
    it('경로 조회가 실패하면 routesError로 알린다', async () => {
      // 실패가 `?? []`로 흡수되면 "저장된 경로가 없다"와 구분되지 않는다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      routesStub.current = { data: undefined, isError: true, refetch: vi.fn() };

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.routesError).toBe('저장된 경로를 불러오지 못했습니다');
    });

    it('경로만 실패해도 알림 목록은 계속 쓸 수 있다', async () => {
      // 과잉 차단 회귀 방지 — loadError는 "서버의 기존 알림을 알 수 없다"는 뜻이고
      // 위저드·빠른 프리셋을 닫는 근거다. 부차 조회 실패가 이걸 오염시키면 안 된다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      routesStub.current = { data: undefined, isError: true, refetch: vi.fn() };

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.loadError).toBe('');
    });

    it('둘 다 성공하면 아무 에러도 알리지 않는다', async () => {
      // 대조군 — 정상 경로에 배너가 뜨지 않는다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.loadError).toBe('');
      expect(result.current.routesError).toBe('');
    });
  });

  describe('토스트 타이머와 실패 문구', () => {
    it('앞선 성공의 자동 해제 타이머가 뒤이어 뜬 실패 문구를 지우지 않는다', async () => {
      // 타이머는 그것을 예약한 문구의 것이다. 성공 문구가 5초 뒤 사라지도록 예약된 뒤
      // 그 사이에 삭제가 실패하면, 만료된 타이머가 success와 error를 함께 지워
      // 열려 있는 삭제 모달에서 실패 사유만 증발한다(모달은 alertCrud.error를 그린다).
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockCreateAlert.mockResolvedValue(undefined);
      mockDeleteAlert.mockRejectedValue(
        new Error('API Error 409: {"message":"이미 삭제된 알림입니다."}'),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });
      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      vi.useFakeTimers();
      try {
        // 빠른 날씨 알림 성공 → 5초 뒤 토스트를 지우는 타이머가 예약된다
        await act(async () => {
          await result.current.handleQuickWeatherAlert();
        });
        expect(result.current.success).toBe('날씨 알림이 설정되었습니다!');

        // 5초가 지나기 전에 삭제가 실패한다
        act(() => result.current.handleDeleteClick(alertOn));
        await act(async () => {
          await result.current.handleDeleteConfirm();
        });
        expect(result.current.error).toBe('이미 삭제된 알림입니다.');

        // 앞선 성공의 타이머가 만료돼도 실패 사유는 화면에 남아 있어야 한다
        await act(async () => {
          vi.advanceTimersByTime(5000);
        });
        expect(result.current.error).toBe('이미 삭제된 알림입니다.');
      } finally {
        vi.useRealTimers();
      }
    });

    it('성공 문구는 예약대로 자동으로 사라진다', async () => {
      // 대조군 — 타이머 취소가 자동 해제 자체를 없애버리면 안 된다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockCreateAlert.mockResolvedValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });
      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      vi.useFakeTimers();
      try {
        await act(async () => {
          await result.current.handleQuickWeatherAlert();
        });
        expect(result.current.success).toBe('날씨 알림이 설정되었습니다!');

        await act(async () => {
          vi.advanceTimersByTime(5000);
        });
        expect(result.current.success).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('handleToggleAlert', () => {
    it('토글이 성공하면 서버 목록을 다시 읽어 캐시를 갱신한다', async () => {
      // 서버는 토글 후 enabled: false를 돌려준다
      mockGetAlertsByUser
        .mockResolvedValueOnce([alertOn])
        .mockResolvedValue([{ ...alertOn, enabled: false }]);
      mockToggleAlert.mockResolvedValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });

      // 캐시를 갱신하지 않으면 staleTime(2분) 안에 재마운트했을 때
      // 화면이 옛 enabled 값으로 되돌아간다
      await waitFor(() => expect(mockGetAlertsByUser).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.alerts[0].enabled).toBe(false));
    });

    it('토글이 실패하면 낙관적 변경을 되돌리고 에러를 알린다', async () => {
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockToggleAlert.mockRejectedValue(new Error('network'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });

      expect(result.current.alerts[0].enabled).toBe(true);
      expect(result.current.error).toBe('알림 상태 변경에 실패했습니다.');
    });
  });
});

describe('useAlertCrud — 실패 사유 전달', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('삭제가 거절되면 서버가 준 사유를 그대로 알린다', async () => {
    // 생성(:232)은 이미 서버 사유를 올린다. 삭제만 '삭제에 실패했습니다.'로
    // 덮으면 이미 지워진 알림(404)에도 사용자가 같은 버튼을 다시 누르게 된다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockDeleteAlert.mockRejectedValue(
      new Error('API Error 404: {"message":"알림을 찾을 수 없습니다."}'),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.handleDeleteClick(alertOn);
    });
    await act(async () => {
      await result.current.handleDeleteConfirm();
    });

    expect(result.current.error).toBe('알림을 찾을 수 없습니다.');
  });

  it('토글이 거절되면 서버가 준 사유를 그대로 알린다', async () => {
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockToggleAlert.mockRejectedValue(
      new Error('API Error 404: {"message":"알림을 찾을 수 없습니다."}'),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    await act(async () => {
      await result.current.handleToggleAlert(alertOn);
    });

    expect(result.current.error).toBe('알림을 찾을 수 없습니다.');
    // 되돌리기는 그대로 유지된다 — 사유를 올리느라 롤백을 잃으면 안 된다.
    expect(result.current.alerts[0].enabled).toBe(true);
  });

  it('연달아 실패해도 두 번째 사유가 첫 번째 타이머에 지워지지 않는다', async () => {
    // 각 실패는 2초 뒤 문구를 지우는 타이머를 건다. 앞선 타이머를 취소하지 않으면
    // 재시도 직후 뜬 문구가 남은 시간만큼만 보이고 사라진다 — 실패가 성공처럼 보인다.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockToggleAlert.mockRejectedValue(new Error('boom'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });
      expect(result.current.error).not.toBe('');

      // 사용자가 1.5초 뒤 재시도한다 (첫 타이머는 아직 살아 있다)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });
      expect(result.current.error).not.toBe('');

      // 첫 타이머가 터지는 시점(t=2000). 두 번째 문구는 t=3500까지 살아야 한다.
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.error).toBe('알림 상태 변경에 실패했습니다.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('사유를 못 꺼내면 기존 문구로 되돌아간다', async () => {
    // 대조군 — 본문 없는 실패까지 빈 문구로 만들지 않는다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockDeleteAlert.mockRejectedValue(new Error('boom'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.handleDeleteClick(alertOn);
    });
    await act(async () => {
      await result.current.handleDeleteConfirm();
    });

    expect(result.current.error).toBe('삭제에 실패했습니다.');
  });
});

describe('useAlertCrud — 수정이 만드는 중복', () => {
  // 생성은 같은 시각·같은 유형의 알림을 막는다(`AlertSettingsPage.tsx:117`).
  // 서버에는 이 규칙이 없다(알림 경로에 ConflictException 0건) — 유일한 방어가
  // 클라이언트다. 그런데 수정 경로에는 그 검사가 없어서, 생성이 거부하는 상태를
  // 수정으로 만들 수 있었다. 결과는 같은 분에 같은 알림톡 두 통이다.
  const alertEight: Alert = {
    id: 'alert-1',
    userId: USER_ID,
    name: '아침 날씨 알림',
    schedule: '0 8 * * *',
    alertTypes: ['weather'],
    enabled: true,
  } as Alert;

  const alertSeven: Alert = {
    id: 'alert-2',
    userId: USER_ID,
    name: '출근 날씨 알림',
    schedule: '0 7 * * *',
    alertTypes: ['weather'],
    enabled: true,
  } as Alert;

  beforeEach(() => {
    vi.clearAllMocks();
    routesStub.current = { data: [], isError: false, refetch: vi.fn() };
  });

  it('다른 알림과 같은 시각·같은 유형이 되는 수정은 저장하지 않고 사유를 남긴다', async () => {
    mockGetAlertsByUser.mockResolvedValue([alertEight, alertSeven]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(2));

    // 07:00 알림을 08:00으로 옮긴다 → 08:00 알림과 시각·유형이 모두 같아진다.
    act(() => {
      result.current.handleEditClick(alertSeven);
    });
    act(() => {
      result.current.setEditForm({ name: '출근 날씨 알림', schedule: '08:00' });
    });
    await act(async () => {
      await result.current.handleEditConfirm();
    });

    expect(mockUpdateAlert).not.toHaveBeenCalled();
    expect(result.current.error).toContain('동일한 알림이 있습니다');
    // 모달은 열린 채로 둔다 — 사유를 읽고 시각을 고칠 수 있어야 한다.
    expect(result.current.editTarget).not.toBeNull();
  });

  it('이름만 바꾸는 수정은 자기 자신 때문에 막히지 않는다', async () => {
    // 중복 후보에서 편집 대상을 빼지 않으면 시각을 그대로 둔 개명이 전부 막힌다.
    mockGetAlertsByUser.mockResolvedValue([alertEight]);
    mockUpdateAlert.mockResolvedValue({});

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.handleEditClick(alertEight);
    });
    act(() => {
      result.current.setEditForm({ name: '새 이름', schedule: '08:00' });
    });
    await act(async () => {
      await result.current.handleEditConfirm();
    });

    expect(mockUpdateAlert).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('');
  });
});

describe('useAlertCrud — 빠른 프리셋과 위저드의 규칙 일치', () => {
  // 프리셋은 "매일 오전 8시 날씨+미세먼지"를 만든다. 예전에는 알림 **이름**이
  // '아침 날씨 알림'인지만 봤다 — 위저드로 만든 같은 알림에 다른 이름이 붙어 있으면
  // 그대로 통과해 08시에 알림톡이 두 통 나갔다. 정작 위저드는 같은 알림 생성을 막는다.
  const eightWeatherNamedDifferently: Alert = {
    id: 'alert-9',
    userId: USER_ID,
    name: '출근 날씨',
    schedule: '0 8 * * *',
    alertTypes: ['weather', 'airQuality'],
    enabled: true,
  } as Alert;

  beforeEach(() => {
    vi.clearAllMocks();
    routesStub.current = { data: [], isError: false, refetch: vi.fn() };
  });

  it('이름이 달라도 같은 알림이 있으면 프리셋이 만들지 않는다', async () => {
    mockGetAlertsByUser.mockResolvedValue([eightWeatherNamedDifferently]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    await act(async () => {
      await result.current.handleQuickWeatherAlert();
    });

    expect(mockCreateAlert).not.toHaveBeenCalled();
    // 버튼도 같은 판단을 해야 한다 — 갈라지면 열린 버튼이 눌러야만 거절된다.
    expect(result.current.hasQuickWeatherAlert).toBe(true);
  });

  it('같은 알림이 없으면 프리셋이 만든다 (대조군)', async () => {
    // 과잉 차단 회귀 방지 — 08시가 아닌 알림은 프리셋을 막지 않는다.
    mockGetAlertsByUser.mockResolvedValue([
      { ...eightWeatherNamedDifferently, schedule: '0 7 * * *' } as Alert,
    ]);
    mockCreateAlert.mockResolvedValue(undefined);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    expect(result.current.hasQuickWeatherAlert).toBe(false);

    await act(async () => {
      await result.current.handleQuickWeatherAlert();
    });

    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
  });
});
