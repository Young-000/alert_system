import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteDashboardPage } from './CommuteDashboardPage';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CommuteDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => 'test-user-id');
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
    Storage.prototype.getItem = jest.fn(() => null);
    render(
      <MemoryRouter>
        <CommuteDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('먼저 로그인해주세요.')).toBeInTheDocument();
  });
});
