import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteDashboardPage } from './CommuteDashboardPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CommuteDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => 'test-user-id');
  });

  it('should render dashboard page', async () => {
    render(
      <MemoryRouter>
        <CommuteDashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('통근 통계')).toBeInTheDocument();
    });
  });

  it('should show login message if not authenticated', () => {
    Storage.prototype.getItem = vi.fn(() => null);
    render(
      <MemoryRouter>
        <CommuteDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByText('통근 통계를 보려면 먼저 로그인하세요')).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });
});
