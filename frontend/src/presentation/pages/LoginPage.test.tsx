import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import { ApiClient } from '@infrastructure/api/api-client';

jest.mock('@infrastructure/api/user-api.client');
jest.mock('@infrastructure/api/api-client');

describe('LoginPage', () => {
  let mockUserApiClient: jest.Mocked<UserApiClient>;

  beforeEach(() => {
    mockUserApiClient = {
      createUser: jest.fn(),
      getUser: jest.fn(),
    } as any;
    (UserApiClient as jest.Mock).mockImplementation(() => mockUserApiClient);
  });

  it('should render login form', () => {
    render(<LoginPage />);
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

    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockUserApiClient.createUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        name: 'John Doe',
      });
    });
  });
});

