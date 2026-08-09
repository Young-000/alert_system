import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { authApiClient } from '@infrastructure/api';
import { MemoryRouter } from 'react-router-dom';
import type { Mocked } from 'vitest';

/**
 * 로그인 자격증명 저장 실패(시크릿 모드·저장소 차단·용량 초과) 시의 규약.
 *
 * `safeSetItem`은 실패를 boolean으로 알리지만 호출부가 이를 보지 않으면
 * 화면은 "로그인 성공"을 보여주고 이동한 뒤, 토큰이 없어 곧바로 로그인 화면으로
 * 되튕긴다. 사용자에게는 원인이 보이지 않는 무한 왕복이 된다.
 */
vi.mock('@infrastructure/api', () => ({
  authApiClient: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

const mockAuthApiClient = authApiClient as Mocked<typeof authApiClient>;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage - 자격증명 저장 실패', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // 시크릿 모드/저장소 차단 재현.
    // setupTests.ts가 localStorage를 자체 MemoryStorage 인스턴스로 대체하므로
    // Storage.prototype이 아니라 인스턴스에 스파이를 건다.
    setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
  });

  afterEach(() => {
    setItemSpy.mockRestore();
  });

  const submitLogin = (): void => {
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
  };

  it('토큰을 저장하지 못하면 이동하지 않는다', async () => {
    mockAuthApiClient.login.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'John Doe', phoneNumber: '01012345678' },
      accessToken: 'test-token',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    submitLogin();

    await waitFor(() => {
      expect(mockAuthApiClient.login).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('저장 실패 사유와 다음 행동을 화면에 알린다', async () => {
    mockAuthApiClient.login.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'John Doe', phoneNumber: '01012345678' },
      accessToken: 'test-token',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    submitLogin();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/저장/);
  });

  it('회원가입 경로에서도 저장 실패 시 온보딩으로 보내지 않는다', async () => {
    mockAuthApiClient.register.mockResolvedValue({
      user: { id: 'user-2', email: 'new@example.com', name: '신규', phoneNumber: '' },
      accessToken: 'test-token',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '신규' },
    });
    fireEvent.change(screen.getByLabelText('전화번호'), {
      target: { value: '01012345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(mockAuthApiClient.register).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
