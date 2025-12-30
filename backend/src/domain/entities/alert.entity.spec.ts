import { Alert } from './alert.entity';
import { AlertType } from './alert.entity';

describe('Alert', () => {
  it('should create an alert with required fields', () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    
    expect(alert.userId).toBe('user-id');
    expect(alert.name).toBe('출근 알림');
    expect(alert.schedule).toBe('0 8 * * *');
    expect(alert.alertTypes).toEqual([AlertType.WEATHER]);
    expect(alert.enabled).toBe(true);
    expect(alert.id).toBeDefined();
  });

  it('should create an alert with bus stop id', () => {
    const alert = new Alert(
      'user-id',
      '출근 알림',
      '0 8 * * *',
      [AlertType.BUS],
      'bus-stop-123'
    );
    
    expect(alert.busStopId).toBe('bus-stop-123');
  });

  it('should create an alert with subway station id', () => {
    const alert = new Alert(
      'user-id',
      '퇴근 알림',
      '0 18 * * *',
      [AlertType.SUBWAY],
      undefined,
      'subway-station-456'
    );
    
    expect(alert.subwayStationId).toBe('subway-station-456');
  });

  it('should disable alert', () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    
    alert.disable();
    
    expect(alert.enabled).toBe(false);
  });

  it('should enable alert', () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    alert.disable();
    
    alert.enable();
    
    expect(alert.enabled).toBe(true);
  });
});

