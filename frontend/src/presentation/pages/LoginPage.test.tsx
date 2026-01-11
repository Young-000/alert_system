import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { authApiClient } from '@infrastructure/api';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@infrastructure/api', () => ({
  authApiClient: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

const mockAuthApiClient = authApiClient as jest.Mocked<typeof authApiClient>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('로그인 모드', () => {
    it('로그인 폼을 렌더링해야 한다', () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('이메일')).toBeInTheDocument();
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    });

    it('로그인 성공 시 토큰을 저장하고 알림 페이지로 이동해야 한다', async () => {
      const mockResponse = {
        user: { id: 'user-1', email: 'user@example.com', name: 'John Doe' },
        accessToken: 'test-token',
      };
      mockAuthApiClient.login.mockResolvedValue(mockResponse);

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: '로그인' }));

      await waitFor(() => {
        expect(mockAuthApiClient.login).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(localStorage.getItem('userId')).toBe('user-1');
        expect(localStorage.getItem('accessToken')).toBe('test-token');
        expect(mockNavigate).toHaveBeenCalledWith('/alerts');
      });
    });

    it('로그인 실패 시 에러 메시지를 표시해야 한다', async () => {
      mockAuthApiClient.login.mockRejectedValue(new Error('Login failed'));

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'wrongpassword' },
      });
      fireEvent.click(screen.getByRole('button', { name: '로그인' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 일치하지 않습니다.');
      });
    });
  });

  describe('회원가입 모드', () => {
    it('회원가입 모드로 전환 시 이름 필드가 표시되어야 한다', async () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      // 회원가입 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

      await waitFor(() => {
        expect(screen.getByLabelText('이름')).toBeInTheDocument();
      });
    });

    it('회원가입 폼을 제출할 수 있어야 한다', async () => {
      const mockResponse = {
        user: { id: 'user-1', email: 'new@example.com', name: '홍길동' },
        accessToken: 'new-token',
      };
      mockAuthApiClient.register.mockResolvedValue(mockResponse);

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      // 회원가입 모드로 전환
      fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

      await waitFor(() => {
        expect(screen.getByLabelText('이름')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByLabelText('이름'), {
        target: { value: '홍길동' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'password123' },
      });

      // 폼 제출 (회원가입 모드에서 submit 버튼 찾기)
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
      fireEvent.click(submitButton!);

      await waitFor(() => {
        expect(mockAuthApiClient.register).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          name: '홍길동',
        });
      });
    });

    it('이미 등록된 이메일로 회원가입 시 에러 메시지를 표시해야 한다', async () => {
      mockAuthApiClient.register.mockRejectedValue(new Error('409 Conflict'));

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      // 회원가입 모드로 전환
      fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

      await waitFor(() => {
        expect(screen.getByLabelText('이름')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'existing@example.com' },
      });
      fireEvent.change(screen.getByLabelText('이름'), {
        target: { value: '홍길동' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'password123' },
      });

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
      fireEvent.click(submitButton!);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('이미 등록된 이메일입니다.');
      });
    });
  });

  describe('UI 인터랙션', () => {
    it('비밀번호 표시/숨기기 토글이 동작해야 한다', () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText('비밀번호');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByLabelText('비밀번호 표시');
      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideButton = screen.getByLabelText('비밀번호 숨기기');
      fireEvent.click(hideButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('로딩 중에는 버튼이 비활성화되어야 한다', async () => {
      mockAuthApiClient.login.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: '로그인' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /처리 중/i })).toBeDisabled();
      });
    });

    it('모드 전환 시 에러 메시지가 초기화되어야 한다', async () => {
      mockAuthApiClient.login.mockRejectedValue(new Error('Login failed'));

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      // 로그인 실패
      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'wrong' },
      });
      fireEvent.click(screen.getByRole('button', { name: '로그인' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // 회원가입 모드로 전환
      fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });
});
