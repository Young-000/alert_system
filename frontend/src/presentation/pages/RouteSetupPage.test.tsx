import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RouteSetupPage } from './RouteSetupPage';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('RouteSetupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => 'test-user-id');
  });

  it('should render route setup page', () => {
    render(
      <MemoryRouter>
        <RouteSetupPage />
      </MemoryRouter>
    );
    expect(screen.getByText('경로')).toBeInTheDocument();
  });

  it('should show login message if not authenticated', () => {
    Storage.prototype.getItem = jest.fn(() => null);
    render(
      <MemoryRouter>
        <RouteSetupPage />
      </MemoryRouter>
    );
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
  });
});
