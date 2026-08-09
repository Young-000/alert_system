import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthCallbackPage } from './AuthCallbackPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const setCallbackHash = (hash: string): void => {
  window.history.replaceState(null, '', `/auth/callback${hash}`);
};

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setCallbackHash('');
  });

  it('토큰과 userId를 저장하고 성공 화면을 보여준다', async () => {
    setCallbackHash('#token=abc123&userId=user-1');

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('로그인 성공!')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBe('abc123');
    expect(localStorage.getItem('userId')).toBe('user-1');
  });

  it('인증 정보가 없으면 실패로 처리한다', async () => {
    setCallbackHash('#foo=bar');

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('로그인 실패')).toBeInTheDocument();
  });

  describe('자격증명 저장 실패 (시크릿 모드·저장소 차단)', () => {
    let setItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // setupTests.ts가 localStorage를 자체 MemoryStorage로 대체하므로 인스턴스에 스파이를 건다.
      setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    });

    afterEach(() => {
      setItemSpy.mockRestore();
    });

    it('저장하지 못하면 성공 화면을 보여주지 않는다', async () => {
      setCallbackHash('#token=abc123&userId=user-1');

      render(
        <MemoryRouter>
          <AuthCallbackPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('로그인 실패')).toBeInTheDocument();
      expect(screen.queryByText('로그인 성공!')).not.toBeInTheDocument();
    });

    it('저장 실패 사유와 다음 행동을 알린다', async () => {
      setCallbackHash('#token=abc123&userId=user-1');

      render(
        <MemoryRouter>
          <AuthCallbackPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/로그인 정보를 저장할 수 없어요/)).toBeInTheDocument();
      });
    });
  });
});
