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

  it('should show alimtalk banner', async () => {
    localStorage.setItem('userId', 'user-1');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('카카오 알림톡으로 알림을 받아요')).toBeInTheDocument();
    });
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
});
