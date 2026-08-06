import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy, GoogleProfile } from './google.strategy';

const CONFIG: Record<string, string> = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
};

function createStrategy(): GoogleStrategy {
  const configService = {
    get: (key: string): string | undefined => CONFIG[key],
  } as unknown as ConfigService;

  return new GoogleStrategy(configService);
}

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'google-123',
    displayName: '홍길동',
    emails: [{ value: 'user@example.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
    ...overrides,
  } as Profile;
}

async function validate(
  strategy: GoogleStrategy,
  profile: Profile,
): Promise<{ error: Error | null | undefined; user: GoogleProfile | false | undefined }> {
  return new Promise((resolve) => {
    void strategy.validate('access', 'refresh', profile, (error, user) => {
      resolve({
        error: error as Error | null | undefined,
        user: user as GoogleProfile | false | undefined,
      });
    });
  });
}

describe('GoogleStrategy.validate', () => {
  it('구글이 확인해준 이메일이면 프로필을 넘긴다', async () => {
    const { error, user } = await validate(createStrategy(), createProfile());

    expect(error).toBeNull();
    expect(user).toMatchObject({
      googleId: 'google-123',
      email: 'user@example.com',
      name: '홍길동',
    });
  });

  it('email_verified가 false면 로그인을 거부한다', async () => {
    const profile = createProfile({
      emails: [{ value: 'unverified@example.com', verified: false }],
    });

    const { user } = await validate(createStrategy(), profile);

    expect(user).toBe(false);
  });

  it('이메일이 없으면 로그인을 거부한다 (빈 문자열로 계정 조회 금지)', async () => {
    const { user } = await validate(createStrategy(), createProfile({ emails: undefined }));

    expect(user).toBe(false);
  });

  it('이메일이 빈 문자열이면 로그인을 거부한다', async () => {
    const profile = createProfile({ emails: [{ value: '', verified: true }] });

    const { user } = await validate(createStrategy(), profile);

    expect(user).toBe(false);
  });
});
