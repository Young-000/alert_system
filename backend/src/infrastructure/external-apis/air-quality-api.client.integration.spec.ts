import { AirQualityApiClient } from './air-quality-api.client';

const shouldRun = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration('AirQualityApiClient Integration', () => {
  let client: AirQualityApiClient;
  const apiKey = process.env.AIR_QUALITY_API_KEY || 'c854d1870b7792e9e000563a58e8d1e4aa664c0642501163c4b9e420a90f8686';

  beforeEach(() => {
    client = new AirQualityApiClient(apiKey);
  });

  it('should fetch real air quality data for Seoul', async () => {
    // 서울 좌표
    const lat = 37.5665;
    const lng = 126.9780;

    const result = await client.getAirQuality(lat, lng);

    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.pm10).toBeGreaterThanOrEqual(0);
    expect(result.pm25).toBeGreaterThanOrEqual(0);
    expect(result.aqi).toBeGreaterThanOrEqual(0);
    expect(result.status).toBeDefined();
    console.log('Air Quality Data:', {
      location: result.location,
      pm10: result.pm10,
      pm25: result.pm25,
      aqi: result.aqi,
      status: result.status,
    });
  }, 10000); // 10초 타임아웃

  it('should fetch air quality data with default location for invalid coordinates', async () => {
    // 잘못된 좌표는 기본값(서울)으로 처리됨
    const lat = 0;
    const lng = 0;

    const result = await client.getAirQuality(lat, lng);
    
    // 기본값으로 서울 데이터를 가져옴
    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.pm10).toBeGreaterThanOrEqual(0);
    expect(result.pm25).toBeGreaterThanOrEqual(0);
  });
});
