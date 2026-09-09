import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { authApiClient } from '@infrastructure/api';
import { MemoryRouter } from 'react-router-dom';
import type { Mocked } from 'vitest';

vi.mock('@infrastructure/api', () => ({
  authApiClient: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

const mockAuthApiClient = authApiClient as Mocked<typeof authApiClient>;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        user: { id: 'user-1', email: 'user@example.com', name: 'John Doe', phoneNumber: '01012345678' },
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
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('로그인 실패 시 에러 메시지를 표시해야 한다', async () => {
      // `ApiClient`는 HTTP 실패를 `API Error {status}: {body}` 형태로만 던진다.
      // 예전 픽스처(`new Error('Login failed')`)는 실제로 생기지 않는 모양이라,
      // 어떤 실패든 자격 증명 오류로 말하던 버그를 통과시키고 있었다.
      mockAuthApiClient.login.mockRejectedValue(
        new Error('API Error 401: {"statusCode":401,"message":"이메일 또는 비밀번호가 일치하지 않습니다."}'),
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
        user: { id: 'user-1', email: 'new@example.com', name: '홍길동', phoneNumber: '01098765432' },
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
      fireEvent.change(screen.getByLabelText('전화번호'), {
        target: { value: '01098765432' },
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
          phoneNumber: '01098765432',
        });
      });
    });

    it('이미 등록된 이메일로 회원가입 시 에러 메시지를 표시해야 한다', async () => {
      // ApiClient가 실제로 던지는 모양: `API Error {status}: {body}`
      mockAuthApiClient.register.mockRejectedValue(
        new Error('API Error 409: {"statusCode":409,"message":"이미 사용 중인 이메일입니다.","path":"/auth/register"}'),
      );

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
      fireEvent.change(screen.getByLabelText('전화번호'), {
        target: { value: '01012345678' },
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

    it('본문에 "409"가 섞인 다른 실패를 이메일 중복으로 오인하지 않는다', async () => {
      // 상태는 400인데 응답 본문(path)에 409라는 숫자가 들어 있는 경우.
      mockAuthApiClient.register.mockRejectedValue(
        new Error('API Error 400: {"statusCode":400,"message":"Bad Request","path":"/auth/register?trace=409"}'),
      );

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

      await waitFor(() => {
        expect(screen.getByLabelText('이름')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@example.com' } });
      fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText('전화번호'), { target: { value: '01012345678' } });
      fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123' } });

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit');
      fireEvent.click(submitButton!);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('회원가입에 실패했습니다.');
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

describe('LoginPage — 실패 사유를 고정 문구로 덮지 않는다', () => {
  // 서버는 사유를 **한국어로** 내려준다 (create-user.dto의 message들,
  // login.use-case의 UnauthorizedException). 그런데 이 화면만 그것을 버리고
  // 고정 문구를 썼다. 특히 로그인은 어떤 실패든 "비밀번호가 틀렸다"고 말해서,
  // 요청 제한(@Throttle 5회/분)이나 서버 장애 때 사용자가 맞는 비밀번호를
  // 계속 고쳐 치게 만든다 — 다시 눌러도 같은 실패다.
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  function fillLogin(): void {
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
  }

  async function fillRegister(): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));
    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('전화번호'), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'abc' } });
    const submit = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('type') === 'submit');
    fireEvent.click(submit!);
  }

  it('회원가입 거절 사유(비밀번호 길이)를 그대로 보여준다', async () => {
    mockAuthApiClient.register.mockRejectedValue(
      new Error(
        'API Error 400: {"statusCode":400,"message":["비밀번호는 최소 6자 이상이어야 합니다."],"path":"/auth/register"}',
      ),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await fillRegister();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '비밀번호는 최소 6자 이상이어야 합니다.',
      );
    });
  });

  it('회원가입이 요청 제한에 걸리면 그 사실을 알린다', async () => {
    // @Throttle 3회/분 (auth.controller.ts). 고정 문구로 덮으면 사용자는
    // 입력을 고쳐가며 계속 눌러 제한을 더 키운다.
    mockAuthApiClient.register.mockRejectedValue(
      new Error('API Error 429: {"statusCode":429,"message":"ThrottlerException: Too Many Requests"}'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await fillRegister();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      );
    });
  });

  it('로그인이 요청 제한에 걸리면 비밀번호가 틀렸다고 말하지 않는다', async () => {
    mockAuthApiClient.login.mockRejectedValue(
      new Error('API Error 429: {"statusCode":429,"message":"ThrottlerException: Too Many Requests"}'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fillLogin();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      );
    });
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      '이메일 또는 비밀번호가 일치하지 않습니다.',
    );
  });

  it('서버 장애를 자격 증명 오류로 말하지 않는다', async () => {
    mockAuthApiClient.login.mockRejectedValue(
      new Error('API Error 500: {"statusCode":500,"message":"Internal Server Error"}'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fillLogin();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      );
    });
  });

  it('자격 증명이 실제로 틀렸을 때는 기존 문구를 유지한다', async () => {
    // 대조군 — 401은 사용자 열거를 피하려고 일부러 같은 문구를 쓴다.
    mockAuthApiClient.login.mockRejectedValue(
      new Error('API Error 401: {"statusCode":401,"message":"이메일 또는 비밀번호가 일치하지 않습니다."}'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fillLogin();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    });
  });
});
