import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseSettingsReturn } from './use-settings';
import { SettingsPage } from './SettingsPage';

const retryLoad = vi.fn();
let settings: UseSettingsReturn;

vi.mock('./use-settings', () => ({
  useSettings: () => settings,
}));

// 탭 본문은 각자 자기 쿼리를 들고 있어 이 테스트의 관심사가 아니다.
vi.mock('./PlacesTab', () => ({ PlacesTab: () => <div /> }));
vi.mock('./SmartDepartureTab', () => ({ SmartDepartureTab: () => <div /> }));

function baseSettings(overrides: Partial<UseSettingsReturn> = {}): UseSettingsReturn {
  return {
    userId: 'user-1',
    phoneNumber: '',
    navigate: vi.fn() as unknown as UseSettingsReturn['navigate'],
    activeTab: 'routes',
    setActiveTab: vi.fn(),
    alerts: [],
    routes: [],
    isLoading: false,
    loadError: '',
    retryLoad,
    showLocalDataReset: false,
    setShowLocalDataReset: vi.fn(),
    resetSuccess: false,
    handleLocalDataReset: vi.fn(),
    pushSupported: false,
    pushEnabled: false,
    pushLoading: false,
    actionError: '',
    showDeleteAllData: false,
    setShowDeleteAllData: vi.fn(),
    isDeletingAllData: false,
    isExporting: false,
    privacyMessage: '',
    handleTogglePush: vi.fn(),
    handleExportData: vi.fn(),
    handleDeleteAllData: vi.fn(),
    handleLogout: vi.fn(),
    handleCopyUserId: vi.fn(),
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('목록 조회가 실패했을 때', () => {
    // 조회 실패는 개수 0으로 흘러들어온다. 그대로 그리면 경로가 있는 사용자에게
    // "등록된 경로가 없어요"라고 말해, 저장한 경로가 지워진 것처럼 보인다.
    it('경로 탭에서 "없어요" 대신 실패를 알린다', () => {
      settings = baseSettings({ activeTab: 'routes', loadError: '경로와 알림을 불러오지 못했어요' });

      renderPage();

      expect(screen.queryByText('등록된 경로가 없어요')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('알림 탭에서 "없어요" 대신 실패를 알린다', () => {
      settings = baseSettings({ activeTab: 'alerts', loadError: '경로와 알림을 불러오지 못했어요' });

      renderPage();

      expect(screen.queryByText('설정된 알림이 없어요')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('다시 시도할 경로를 준다 (dead-end 금지)', () => {
      settings = baseSettings({ activeTab: 'routes', loadError: '경로와 알림을 불러오지 못했어요' });

      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

      expect(retryLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe('조회가 정상일 때', () => {
    it('경로가 없으면 기존 빈 상태를 그대로 보여준다', () => {
      settings = baseSettings({ activeTab: 'routes', loadError: '' });

      renderPage();

      expect(screen.getByText('등록된 경로가 없어요')).toBeInTheDocument();
    });
  });
});
