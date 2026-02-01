import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => 'test-user-id');
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
    Storage.prototype.getItem = jest.fn(() => null);
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
