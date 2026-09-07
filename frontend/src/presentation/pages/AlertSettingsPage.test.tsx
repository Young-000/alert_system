import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertSettingsPage } from './AlertSettingsPage';
import {
  alertApiClient,
  commuteApiClient,
  getCommuteApiClient,
} from '@infrastructure/api';
import type { AlertType } from '@infrastructure/api';
import type { Mocked, MockedFunction } from 'vitest';
import { TestProviders } from '../../test-utils';

vi.mock('@infrastructure/api');

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => {
    const userId = localStorage.getItem('userId') || '';
    return {
      userId,
      userName: '회원',
      userEmail: '',
      phoneNumber: '',
      isLoggedIn: !!userId,
    };
  },
  notifyAuthChange: vi.fn(),
}));

const mockAlertApiClient = alertApiClient as Mocked<typeof alertApiClient>;
const mockCommuteApiClient = commuteApiClient as Mocked<typeof commuteApiClient>;
const mockGetCommuteApiClient = getCommuteApiClient as MockedFunction<typeof getCommuteApiClient>;

function renderPage(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <AlertSettingsPage />
    </TestProviders>
  );
}

describe('AlertSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCommuteApiClient.mockReturnValue(mockCommuteApiClient);
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockAlertApiClient.createAlert.mockResolvedValue({
      id: 'new-alert',
      userId: 'user-1',
      name: 'test',
      schedule: '0 8 * * *',
      alertTypes: ['weather'],
      enabled: true,
    });
    mockAlertApiClient.deleteAlert.mockResolvedValue(undefined as never);
    mockAlertApiClient.toggleAlert.mockResolvedValue(undefined as never);
    mockAlertApiClient.updateAlert.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      name: 'updated',
      schedule: '0 8 * * *',
      alertTypes: ['weather'],
      enabled: true,
    });
    mockCommuteApiClient.getUserRoutes.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- Auth ---

  it('should show login empty state when userId is not set', async () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    });
    expect(screen.getByText('알림을 설정하려면 먼저 로그인하세요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  });

  // --- Wizard first step ---

  it('should render wizard first step with type selection', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    expect(screen.getByText('날씨')).toBeInTheDocument();
    expect(screen.getByText('교통')).toBeInTheDocument();
  });

  it('should show quick weather action button', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('날씨 알림 바로 시작')).toBeInTheDocument();
    });
    expect(screen.getByText('원클릭 설정')).toBeInTheDocument();
  });

  it('should not show quick presets when alert list failed to load', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });
    // 서버에 이미 같은 알림이 있는지 알 수 없으므로 중복 생성 경로를 차단해야 한다
    expect(screen.queryByText('빠른 알림 설정')).not.toBeInTheDocument();
    expect(screen.queryByText('날씨 + 미세먼지')).not.toBeInTheDocument();
  });

  it('should show alimtalk banner', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('카카오 알림톡으로 알림을 받아요')).toBeInTheDocument();
    });
  });

  it('should not leak the raw API error body when quick weather alert creation fails', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    // ApiClient가 실제로 던지는 모양: `API Error {status}: {JSON body}`
    mockAlertApiClient.createAlert.mockRejectedValueOnce(
      new Error(
        'API Error 409: {"statusCode":409,"message":"이미 같은 시간에 등록된 알림이 있습니다.","error":"Conflict","path":"/alerts"}',
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('원클릭 설정')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '원클릭 설정' }));

    // 서버가 준 한국어 사유가 그대로 보여야 한다
    await waitFor(() => {
      expect(
        screen.getByText('이미 같은 시간에 등록된 알림이 있습니다.'),
      ).toBeInTheDocument();
    });

    // 내부 구현 문자열(JSON 본문·상태코드 키)이 화면에 새어나오면 안 된다
    expect(screen.queryByText(/API Error/)).not.toBeInTheDocument();
    expect(screen.queryByText(/statusCode/)).not.toBeInTheDocument();
  });

  // --- Wizard navigation ---

  it('should navigate through wizard steps when weather is selected', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select weather
    const weatherButton = screen.getByText('날씨').closest('button');
    fireEvent.click(weatherButton!);

    // Click next
    const nextButton = screen.getByText('다음 →');
    fireEvent.click(nextButton);

    // Should go to routine step (skipping transport steps)
    await waitFor(() => {
      expect(screen.getByText('하루 루틴을 알려주세요')).toBeInTheDocument();
    });
  });

  it('should show transport type step when transport is selected', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select transport
    const transportButton = screen.getByText('교통').closest('button');
    fireEvent.click(transportButton!);

    // Click next
    fireEvent.click(screen.getByText('다음 →'));

    // Should go to transport type selection step
    await waitFor(() => {
      expect(screen.getByText('어떤 교통수단을 이용하세요?')).toBeInTheDocument();
    });
  });

  it('should show routine step with wake-up time when weather is selected', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select weather
    fireEvent.click(screen.getByText('날씨').closest('button')!);
    fireEvent.click(screen.getByText('다음 →'));

    await waitFor(() => {
      expect(screen.getByText('하루 루틴을 알려주세요')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('기상 시간')).toBeInTheDocument();
    expect(screen.getByText('알림 미리보기')).toBeInTheDocument();
  });

  it('should show routine step with leave times when transport is selected', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select both weather and transport
    fireEvent.click(screen.getByText('날씨').closest('button')!);
    fireEvent.click(screen.getByText('교통').closest('button')!);

    fireEvent.click(screen.getByText('다음 →'));

    // With transport selected, should go to transport type step first
    await waitFor(() => {
      expect(screen.getByText('어떤 교통수단을 이용하세요?')).toBeInTheDocument();
    });
  });

  it('should disable next button when no type is selected', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('다음 →');
    expect(nextButton).toBeDisabled();
  });

  // --- Existing alerts ---

  it('should load existing alerts', async () => {
    localStorage.setItem('userId', 'user-1');
    const mockAlerts = [
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);

    renderPage();

    await waitFor(() => {
      const elements = screen.getAllByText('출근 알림');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should show alert list section when alerts exist', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ]);

    renderPage();

    // Wait for the alert list to render (proves alerts loaded from react-query)
    await waitFor(() => {
      const elements = screen.getAllByText('출근 알림');
      expect(elements.length).toBeGreaterThan(0);
    });

    // The "설정된 알림" heading confirms AlertList is rendered
    expect(screen.getByText('설정된 알림')).toBeInTheDocument();
  });

  // --- Delete alert ---

  it('should delete an alert', async () => {
    localStorage.setItem('userId', 'user-1');
    const mockAlerts = [
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '테스트 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);
    mockAlertApiClient.deleteAlert.mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
      const elements = screen.getAllByText('테스트 알림');
      expect(elements.length).toBeGreaterThan(0);
    });

    // Click delete button
    const deleteButton = screen.getByLabelText('삭제');
    fireEvent.click(deleteButton);

    // Confirm in modal
    await waitFor(() => {
      expect(screen.getByText('알림 삭제')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
    const confirmButton = deleteButtons.find(btn => btn.classList.contains('btn-danger'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockAlertApiClient.deleteAlert).toHaveBeenCalledWith('alert-1');
    });
  });

  it('should cancel delete when cancel is clicked', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '테스트 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('삭제')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('삭제'));

    await waitFor(() => {
      expect(screen.getByText('알림 삭제')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('취소'));

    await waitFor(() => {
      expect(screen.queryByText('알림 삭제')).not.toBeInTheDocument();
    });
  });

  it('should not leak a previous delete error into a newly reopened delete modal', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '테스트 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ]);
    mockAlertApiClient.deleteAlert.mockRejectedValueOnce(new Error('network'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('삭제')).toBeInTheDocument();
    });

    // 1st attempt: open modal and confirm -> delete fails -> error shown in modal
    fireEvent.click(screen.getByLabelText('삭제'));
    await waitFor(() => {
      expect(screen.getByText('알림 삭제')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
    const confirmButton = deleteButtons.find(btn => btn.classList.contains('btn-danger'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.getByText('삭제에 실패했습니다.')).toBeInTheDocument();
    });

    // Cancel, then reopen the modal
    fireEvent.click(screen.getByText('취소'));
    await waitFor(() => {
      expect(screen.queryByText('알림 삭제')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('삭제'));
    await waitFor(() => {
      expect(screen.getByText('알림 삭제')).toBeInTheDocument();
    });

    // The stale error from the previous failed attempt must NOT appear
    expect(screen.queryByText('삭제에 실패했습니다.')).not.toBeInTheDocument();
  });

  // --- Toggle alert ---

  it('should toggle alert enabled state', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ]);

    renderPage();

    // AlertList toggle is <input type="checkbox"> with aria-label "출근 알림 끄기"
    await waitFor(() => {
      expect(screen.getByLabelText('출근 알림 끄기')).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText('출근 알림 끄기');
    fireEvent.click(toggle);

    // use-alert-crud.ts calls toggleAlert(alert.id) with single argument
    await waitFor(() => {
      expect(mockAlertApiClient.toggleAlert).toHaveBeenCalledWith('alert-1');
    });
  });

  // --- Loading state ---

  it('should show loading state while alerts are loading', () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('서버에 연결 중입니다...')).toBeInTheDocument();
  });

  // --- Page header ---

  it('should show notification history link', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('알림 발송 기록 보기')).toBeInTheDocument();
    });
  });

  // --- Footer ---

  it('should show footer text', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출퇴근 알림 서비스')).toBeInTheDocument();
    });
  });

  // --- Multiple alerts ---

  it('should display multiple alerts in list', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 날씨',
        schedule: '0 7 * * *',
        alertTypes: ['weather', 'airQuality'] as AlertType[],
        enabled: true,
      },
      {
        id: 'alert-2',
        userId: 'user-1',
        name: '퇴근 교통',
        schedule: '0 17 * * *',
        alertTypes: ['subway'] as AlertType[],
        enabled: false,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출근 날씨')).toBeInTheDocument();
    });
    expect(screen.getByText('퇴근 교통')).toBeInTheDocument();
  });

  // --- Wizard back navigation ---

  it('should go back when clicking back button in wizard', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select weather and go to next step
    fireEvent.click(screen.getByText('날씨').closest('button')!);
    fireEvent.click(screen.getByText('다음 →'));

    await waitFor(() => {
      expect(screen.getByText('하루 루틴을 알려주세요')).toBeInTheDocument();
    });

    // Go back
    fireEvent.click(screen.getByText('← 이전'));

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });
  });

  /**
   * 정류장을 고른 뒤 '교통'을 다시 끄면, 화면·미리보기·저장이 갈렸다.
   *
   * 미리보기(`getNotificationTimes`)는 `wantsTransport`를 보고 교통 알림을 뺐지만
   * 확인 화면과 저장 payload는 `selectedTransports`를 그대로 읽었다. 그 결과 사용자가
   * 끈 지하철 알림이 저장되고, 스케줄은 교통 시각 없이 계산되므로 기상 시각에 울렸다.
   */
  it('should drop stations from the saved alert when transport is unchecked again', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockCommuteApiClient.getUserRoutes.mockResolvedValue([
      {
        id: 'route-1',
        userId: 'user-1',
        name: '출근길',
        routeType: 'morning',
        isPreferred: true,
        totalTransferTime: 0,
        pureMovementTime: 0,
        checkpoints: [
          {
            id: 'cp-1',
            sequenceOrder: 1,
            name: '강남역',
            checkpointType: 'subway',
            linkedStationId: 'S1',
            lineInfo: '2호선',
            expectedWaitTime: 0,
            totalExpectedTime: 0,
            isTransferRelated: false,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ] as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // 교통을 켜고 저장된 경로에서 강남역을 가져온다 → routine 단계로 점프
    fireEvent.click(screen.getByRole('button', { name: '교통 알림 선택' }));
    fireEvent.click(screen.getByText('다음 →'));

    await waitFor(() => {
      expect(screen.getByText('어떤 교통수단을 이용하세요?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('선택'));
    fireEvent.click(await screen.findByText('출근길'));

    await waitFor(() => {
      expect(screen.getByText('하루 루틴을 알려주세요')).toBeInTheDocument();
    });

    // routine → station → transport → type 으로 되돌아간다
    fireEvent.click(screen.getByText('← 이전'));
    await screen.findByText('자주 이용하는 역/정류장을 검색하세요');
    fireEvent.click(screen.getByText('← 이전'));
    await screen.findByText('어떤 교통수단을 이용하세요?');
    fireEvent.click(screen.getByText('← 이전'));
    await screen.findByText('어떤 정보를 받고 싶으세요?');

    // 교통을 끄고 날씨만 켠다
    fireEvent.click(screen.getByRole('button', { name: '교통 알림 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '날씨 알림 선택' }));

    fireEvent.click(screen.getByText('다음 →'));
    await screen.findByText('하루 루틴을 알려주세요');
    fireEvent.click(screen.getByText('다음 →'));
    await screen.findByText('설정을 확인해주세요');

    // 확인 화면에 끈 교통이 남아 있으면 안 된다
    expect(screen.queryByText(/강남역/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('알림 시작하기'));

    await waitFor(() => {
      expect(mockAlertApiClient.createAlert).toHaveBeenCalled();
    });

    const dto = mockAlertApiClient.createAlert.mock.calls[0][0];
    expect(dto.alertTypes).not.toContain('subway');
    expect(dto.subwayStationId).toBeUndefined();
    // 경로는 교통 단계에서만 가져올 수 있다 — 교통을 끄면 연결도 남지 않아야 한다.
    // (남으면 백엔드가 날씨 알림에 "출근길 출발 준비하세요"를 붙인다:
    //  notification-message-builder.service.ts:288)
    expect(dto.routeId).toBeUndefined();
  });
});
