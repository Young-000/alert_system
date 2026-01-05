import React, { useState, CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiClient } from '@infrastructure/api/auth-api.client';
import { ApiClient } from '@infrastructure/api/api-client';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiClient = new ApiClient();
  const authApiClient = new AuthApiClient(apiClient);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('비밀번호는 6자 이상이어야 합니다');
          setLoading(false);
          return;
        }
        await authApiClient.register({
          email,
          password,
          name,
          phoneNumber: phoneNumber || undefined,
        });
      } else {
        await authApiClient.login({ email, password });
      }
      navigate('/alerts');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      if (message.includes('already exists')) {
        setError('이미 등록된 이메일입니다');
      } else if (message.includes('Invalid credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
      } else {
        setError(mode === 'register' ? '회원가입 실패' : '로그인 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {mode === 'login' ? '로그인' : '회원가입'}
        </h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '6자 이상' : '비밀번호 입력'}
              required
              style={styles.input}
            />
          </div>

          {mode === 'register' && (
            <>
              <div style={styles.inputGroup}>
                <label htmlFor="name" style={styles.label}>이름</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label htmlFor="phoneNumber" style={styles.label}>
                  전화번호 (알림톡 수신용)
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01012345678"
                  style={styles.input}
                />
                <small style={styles.hint}>
                  알림톡을 받으시려면 전화번호를 입력해주세요
                </small>
              </div>
            </>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <div style={styles.toggleContainer}>
          <span style={styles.toggleText}>
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            style={styles.toggleButton}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '24px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    outline: 'none',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  button: {
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#7c3aed',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  toggleContainer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  toggleText: {
    fontSize: '14px',
    color: '#666',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#7c3aed',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '8px',
  },
};
