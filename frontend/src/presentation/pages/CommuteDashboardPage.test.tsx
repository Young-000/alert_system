import { render, screen } from '@testing-library/react';
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

  it('should render dashboard page', () => {
    render(
      <MemoryRouter>
        <CommuteDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/통근 통계/i)).toBeInTheDocument();
  });

  it('should redirect to login if not authenticated', () => {
    Storage.prototype.getItem = jest.fn(() => null);
    render(
      <MemoryRouter>
        <CommuteDashboardPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
