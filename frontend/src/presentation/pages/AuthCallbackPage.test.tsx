import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthCallbackPage } from './AuthCallbackPage';
import { saveCredentials } from '@infrastructure/storage/safe-storage';
import type * as SafeStorage from '@infrastructure/storage/safe-storage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// 기본은 실제 구현을 쓰고, 저장 실패 케이스만 모듈 경계에서 뒤집는다.
// localStorage 인스턴스 스파이는 환경에 따라 가로채기가 갈려 CI에서만 깨진다.
vi.mock('@infrastructure/storage/safe-storage', async () => {
  const actual = await vi.importActual<typeof SafeStorage>('@infrastructure/storage/safe-storage');
  return { ...actual, saveCredentials: vi.fn(actual.saveCredentials) };
});

const setCallbackHash = (hash: string): void => {
  window.history.replaceState(null, '', `/auth/callback${hash}`);
};

describe('AuthCallbackPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    setCallbackHash('');
    const actual = await vi.importActual<typeof SafeStorage>(
      '@infrastructure/storage/safe-storage'
    );
    vi.mocked(saveCredentials).mockImplementation(actual.saveCredentials);
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
    beforeEach(() => {
      vi.mocked(saveCredentials).mockReturnValue(false);
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
