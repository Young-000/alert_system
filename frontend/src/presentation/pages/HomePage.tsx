import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileCard } from '../components/MobileCard';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { SwipeableCard } from '../components/SwipeableCard';
import { ApiClient } from '@infrastructure/api/api-client';
import { WeatherApiClient } from '@infrastructure/api/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/api/air-quality-api.client';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import type { User } from '@infrastructure/api/user-api.client';

export function HomePage() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = localStorage.getItem('userId');
  const apiClient = new ApiClient();
  const weatherApiClient = new WeatherApiClient(apiClient);
  const airQualityApiClient = new AirQualityApiClient(apiClient);
  const userApiClient = new UserApiClient(apiClient);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await userApiClient.getUser(userId!);
      setUser(userData);

      if (userData.location) {
        try {
          const [weatherData, airQualityData] = await Promise.all([
            weatherApiClient.getWeatherByUser(userId!),
            airQualityApiClient.getAirQualityByUser(userId!),
          ]);
          setWeather(weatherData);
          setAirQuality(airQualityData);
        } catch (err) {
          console.error('Failed to load weather/air quality:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('clear') || conditionLower.includes('맑음')) return '☀️';
    if (conditionLower.includes('cloud')) return '☁️';
    if (conditionLower.includes('rain')) return '🌧️';
    if (conditionLower.includes('snow')) return '❄️';
    return '🌤️';
  };

  const getAirQualityColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('좋음')) return 'text-green-600';
    if (statusLower.includes('moderate') || statusLower.includes('보통')) return 'text-yellow-600';
    if (statusLower.includes('unhealthy') || statusLower.includes('나쁨')) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요, {user?.name || '사용자'}님 👋
          </h1>
          {user?.location ? (
            <p className="text-sm text-gray-600 flex items-center">
              <span className="mr-1">📍</span>
              {user.location.address}
            </p>
          ) : (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/location')}
              className="mt-2"
            >
              위치 설정하기
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* 날씨 카드 */}
        {weather && (
          <SwipeableCard>
            <MobileCard title="날씨 정보" icon="🌤️">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-5xl">{getWeatherIcon(weather.condition)}</div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {Math.round(weather.temperature)}°C
                    </div>
                    <div className="text-sm text-gray-600">{weather.condition}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>습도 {weather.humidity}%</span>
                <span>풍속 {weather.windSpeed}km/h</span>
              </div>
            </MobileCard>
          </SwipeableCard>
        )}

        {/* 미세먼지 카드 */}
        {airQuality && (
          <SwipeableCard>
            <MobileCard title="미세먼지 정보" icon="🟢">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-5xl">
                    {airQuality.status === 'Good' || airQuality.status === '좋음' ? '🟢' : 
                     airQuality.status === 'Moderate' || airQuality.status === '보통' ? '🟡' : '🔴'}
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${getAirQualityColor(airQuality.status)}`}>
                      {airQuality.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">AQI: {airQuality.aqi}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>PM10: {airQuality.pm10} ㎍/㎥</span>
                <span>PM2.5: {airQuality.pm25} ㎍/㎥</span>
              </div>
            </MobileCard>
          </SwipeableCard>
        )}

        {/* 빠른 액션 버튼 */}
        <div className="mt-6 space-y-2">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={() => navigate('/alerts')}
          >
            알림 설정하기
          </Button>
        </div>
      </div>
    </div>
  );
}

