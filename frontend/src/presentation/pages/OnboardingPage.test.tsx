import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => 'test-user-id');
  });

  it('should render onboarding page', () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/환영/i)).toBeInTheDocument();
  });

  it('should redirect to login if not authenticated', () => {
    Storage.prototype.getItem = vi.fn(() => null);
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
