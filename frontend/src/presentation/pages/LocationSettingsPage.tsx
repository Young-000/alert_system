import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileCard } from '../components/MobileCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import { ApiClient } from '@infrastructure/api/api-client';
import type { UserLocation } from '@infrastructure/api/user-api.client';

export function LocationSettingsPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);

  const userId = localStorage.getItem('userId');
  const apiClient = new ApiClient();
  const userApiClient = new UserApiClient(apiClient);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    loadUserLocation();
  }, [userId]);

  const loadUserLocation = async () => {
    try {
      const user = await userApiClient.getUser(userId!);
      if (user.location) {
        setAddress(user.location.address);
        setLat(user.location.lat.toString());
        setLng(user.location.lng.toString());
      }
    } catch (err) {
      console.error('Failed to load user location:', err);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('현재 위치 기능을 사용할 수 없습니다.');
      return;
    }

    setUsingCurrentLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setLat(latitude.toString());
          setLng(longitude.toString());

          // 역지오코딩으로 주소 가져오기 (간단한 예시)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          setAddress(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setError('주소를 가져오는데 실패했습니다.');
        } finally {
          setUsingCurrentLocation(false);
        }
      },
      () => {
        setError('위치 정보를 가져오는데 실패했습니다.');
        setUsingCurrentLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address || !lat || !lng) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const location: UserLocation = {
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
      await userApiClient.updateUserLocation(userId!, location);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '위치 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">위치 설정</h1>

        <MobileCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseCurrentLocation}
                isLoading={usingCurrentLocation}
                className="w-full mb-4"
              >
                📍 현재 위치 사용
              </Button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">또는 직접 입력</p>
              
              <Input
                label="주소"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="예: 서울시 강남구"
                required
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  label="위도 (Latitude)"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="37.5665"
                  required
                />

                <Input
                  label="경도 (Longitude)"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="126.9780"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="flex-1"
              >
                저장
              </Button>
            </div>
          </form>
        </MobileCard>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-800">
            💡 <strong>팁:</strong> 정확한 날씨와 미세먼지 정보를 받으려면 정확한 위치 설정이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
