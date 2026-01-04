import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { userApiClient } from '@infrastructure/api';
import { MemoryRouter } from 'react-router-dom';

const mockUserApiClient = userApiClient as jest.Mocked<typeof userApiClient>;

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('should submit form with user data', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
    };
    mockUserApiClient.createUser.mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /계정 만들기/i }));

    await waitFor(() => {
      expect(mockUserApiClient.createUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        name: 'John Doe',
      });
    });
  });
});
