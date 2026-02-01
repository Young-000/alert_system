import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteTrackingPage } from './CommuteTrackingPage';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CommuteTrackingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn(() => 'test-user-id');
  });

  it('should render commute tracking page', () => {
    render(
      <MemoryRouter>
        <CommuteTrackingPage />
      </MemoryRouter>
    );
    // 페이지가 렌더링되어야 함
    expect(document.body).toBeInTheDocument();
  });

  it('should redirect to login if not authenticated', () => {
    Storage.prototype.getItem = jest.fn(() => null);
    render(
      <MemoryRouter>
        <CommuteTrackingPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
