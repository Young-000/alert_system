import { Injectable, Inject, Logger } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { GoogleProfile } from '@infrastructure/auth/google.strategy';

@Injectable()
export class GoogleOAuthUseCase {
  private readonly logger = new Logger(GoogleOAuthUseCase.name);

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
  ) {}

  async execute(googleProfile: GoogleProfile): Promise<User> {
    const { googleId, email, name } = googleProfile;

    // 1. Google ID로 기존 사용자 검색
    let user = await this.userRepository.findByGoogleId(googleId);
    if (user) {
      this.logger.log(`Existing user found by Google ID: ${email}`);
      return user;
    }

    // 2. 이메일로 기존 사용자 검색 (기존 이메일 계정과 연동)
    user = await this.userRepository.findByEmail(email);
    if (user) {
      // 기존 이메일 계정에 Google ID 연동
      this.logger.log(`Linking Google ID to existing email account: ${email}`);
      await this.userRepository.updateGoogleId(user.id, googleId);
      return await this.userRepository.findById(user.id) as User;
    }

    // 3. 새 사용자 생성 (Google 로그인으로 신규 가입)
    this.logger.log(`Creating new user from Google: ${email}`);
    const newUser = new User(
      email,
      name,
      '', // phoneNumber - Google 로그인 시 비어있음 (나중에 프로필에서 입력)
      undefined, // passwordHash - 소셜 로그인은 비밀번호 없음
      undefined, // location
      googleId,
    );

    return this.userRepository.save(newUser);
  }
}
