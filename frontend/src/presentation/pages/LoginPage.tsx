import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileCard } from '../components/MobileCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import { ApiClient } from '@infrastructure/api/api-client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiClient = new ApiClient();
  const userApiClient = new UserApiClient(apiClient);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await userApiClient.createUser({ email, name });
      localStorage.setItem('userId', user.id);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Alert</h1>
          <p className="text-sm text-gray-600">출근/퇴근 시 필요한 정보를 통합 제공</p>
        </div>

        <MobileCard>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">시작하기</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />

            <Input
              label="이름"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="w-full"
            >
              시작하기
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              시작하기를 클릭하면 서비스 이용약관에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}
