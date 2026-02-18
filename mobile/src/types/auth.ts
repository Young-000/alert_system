/** 로그인 요청 */
export type LoginDto = {
  email: string;
  password: string;
};

/** 회원가입 요청 */
export type RegisterDto = {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
};

/** 인증 응답 (로그인/회원가입 공통) */
export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

/** 인증된 사용자 정보 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
};

/** 사용자 프로필 응답 (GET /users/:id) */
export type UserProfile = {
  id: string;
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
};
