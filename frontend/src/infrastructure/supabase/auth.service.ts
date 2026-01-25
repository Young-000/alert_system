import { supabase, DbUser } from './client';
import bcrypt from 'bcryptjs';

export interface AuthResult {
  success: boolean;
  user?: DbUser;
  error?: string;
}

export class SupabaseAuthService {
  // 회원가입 (phone + password)
  async register(phoneNumber: string, password: string, name?: string): Promise<AuthResult> {
    try {
      // 중복 체크
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (existing) {
        return { success: false, error: '이미 등록된 전화번호입니다' };
      }

      // 비밀번호 해시
      const passwordHash = await this.hashPassword(password);

      // 사용자 생성
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone_number: phoneNumber,
          password_hash: passwordHash,
          name: name || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Register error:', error);
        return { success: false, error: '회원가입에 실패했습니다' };
      }

      // 로컬 스토리지에 저장
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userPhone', data.phone_number);

      return { success: true, user: data };
    } catch (err) {
      console.error('Register exception:', err);
      return { success: false, error: '회원가입 중 오류가 발생했습니다' };
    }
  }

  // 로그인
  async login(phoneNumber: string, password: string): Promise<AuthResult> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error || !user) {
        return { success: false, error: '등록되지 않은 전화번호입니다' };
      }

      // 비밀번호 검증
      const isValid = await this.verifyPassword(password, user.password_hash || '');
      if (!isValid) {
        return { success: false, error: '비밀번호가 일치하지 않습니다' };
      }

      // 로컬 스토리지에 저장
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userPhone', user.phone_number);

      return { success: true, user };
    } catch (err) {
      console.error('Login exception:', err);
      return { success: false, error: '로그인 중 오류가 발생했습니다' };
    }
  }

  // 로그아웃
  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('accessToken');
  }

  // 현재 사용자 조회
  async getCurrentUser(): Promise<DbUser | null> {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  // 로그인 상태 확인
  isLoggedIn(): boolean {
    return !!localStorage.getItem('userId');
  }

  // 위치 업데이트
  async updateLocation(latitude: number, longitude: number): Promise<boolean> {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;

    const { error } = await supabase
      .from('users')
      .update({ latitude, longitude, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return !error;
  }

  private async hashPassword(password: string): Promise<string> {
    // 브라우저에서는 bcryptjs 사용
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }
}

export const authService = new SupabaseAuthService();
