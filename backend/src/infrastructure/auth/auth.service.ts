import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@domain/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  generateToken(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
    };
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }
}
