import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

// Google OAuth 설정값 가져오기
function getGoogleConfig(configService: ConfigService) {
  const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'not-configured';
  const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured';
  const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback';

  return { clientID, clientSecret, callbackURL };
}

/**
 * 구글 userinfo의 `email_verified`는 불리언으로 오지만, 엔드포인트에 따라
 * 문자열 `'true'`로 오는 경우가 있어 둘 다 받는다. 그 밖의 값은 미확인으로 본다.
 */
function isVerified(verified: unknown): boolean {
  return verified === true || verified === 'true';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isEnabled: boolean;

  constructor(configService: ConfigService) {
    const config = getGoogleConfig(configService);

    super({
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: ['email', 'profile'],
    });

    this.isEnabled = config.clientID !== 'not-configured' && config.clientSecret !== 'not-configured';

    if (this.isEnabled) {
      this.logger.log('Google OAuth Strategy initialized');
    } else {
      this.logger.warn('Google OAuth Strategy disabled (missing credentials)');
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      if (!this.isEnabled) {
        done(new Error('Google OAuth is not configured'), undefined);
        return;
      }

      const { id, emails, displayName, photos } = profile;
      const primaryEmail = emails?.[0];

      // 이 이메일은 뒤에서 기존 계정을 찾아 연동하는 열쇠로 쓰인다
      // (`GoogleOAuthUseCase.execute`). 구글이 소유를 확인해준 주소가 아니면
      // 남의 계정에 붙을 수 있으므로 여기서 끊는다.
      if (!primaryEmail?.value) {
        this.logger.warn(`Google login rejected: no email in profile (id: ${id})`);
        done(null, false);
        return;
      }

      if (!isVerified(primaryEmail.verified)) {
        this.logger.warn(`Google login rejected: email not verified (${primaryEmail.value})`);
        done(null, false);
        return;
      }

      const googleProfile: GoogleProfile = {
        googleId: id,
        email: primaryEmail.value,
        name: displayName || '',
        picture: photos?.[0]?.value,
      };

      this.logger.log(`Google login: ${googleProfile.email}`);
      done(null, googleProfile);
    } catch (error) {
      this.logger.error(`Google validation error: ${error}`);
      done(error as Error, undefined);
    }
  }
}
