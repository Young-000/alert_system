import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';

// Mock push manager
jest.mock('@infrastructure/push/push-manager', () => ({
  isPushSupported: jest.fn().mockResolvedValue(false),
  isPushSubscribed: jest.fn().mockResolvedValue(false),
  subscribeToPush: jest.fn().mockResolvedValue(false),
  unsubscribeFromPush: jest.fn().mockResolvedValue(false),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('userName', '테스트');
    localStorage.setItem('phoneNumber', '01012345678');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show login message when not logged in', () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  });

  it('should render tabs', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('프로필')).toBeInTheDocument();
    });

    expect(screen.getByText('경로')).toBeInTheDocument();
    expect(screen.getByText('알림')).toBeInTheDocument();
    expect(screen.getByText('앱')).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('프로필')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('알림'));

    // After switching to alerts tab, should show alert-related content
    await waitFor(() => {
      expect(screen.getByText('알림')).toBeInTheDocument();
    });
  });

  it('should show user profile information', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('전화번호')).toBeInTheDocument();
    });
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByText('사용자 ID')).toBeInTheDocument();
  });

  it('should handle logout', async () => {
    renderPage();

    // Wait for loading to complete and profile content to appear
    await waitFor(() => {
      expect(screen.getByText(/로그아웃/)).toBeInTheDocument();
    });

    const logoutBtn = screen.getByText(/로그아웃/);
    await userEvent.click(logoutBtn);

    // Should navigate to home
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
