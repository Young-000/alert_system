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

      const googleProfile: GoogleProfile = {
        googleId: id,
        email: emails?.[0]?.value || '',
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
