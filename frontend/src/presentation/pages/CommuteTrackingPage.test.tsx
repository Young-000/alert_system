import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteTrackingPage } from './CommuteTrackingPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CommuteTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => 'test-user-id');
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
    Storage.prototype.getItem = vi.fn(() => null);
    render(
      <MemoryRouter>
        <CommuteTrackingPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
