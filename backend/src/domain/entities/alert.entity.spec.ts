import {
  Alert,
  AlertType,
  AlertCategory,
  AlertTriggerType,
  DepartureAlertConfig,
} from './alert.entity';

describe('Alert', () => {
  describe('기본 생성', () => {
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

  describe('카테고리 시스템', () => {
    it('기본 카테고리는 DAILY_WEATHER여야 한다', () => {
      const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);

      expect(alert.category).toBe(AlertCategory.DAILY_WEATHER);
    });

    it('기본 트리거 타입은 FIXED_TIME이어야 한다', () => {
      const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);

      expect(alert.triggerType).toBe(AlertTriggerType.FIXED_TIME);
    });

    it('routeId와 교통 타입이 있으면 DEPARTURE_REMINDER로 추론해야 한다', () => {
      const alert = new Alert(
        'user-id',
        '출발 알림',
        '0 8 * * *',
        [AlertType.BUS, AlertType.SUBWAY],
        undefined,
        undefined,
        undefined,
        false,
        undefined,
        'route-123'
      );

      expect(alert.category).toBe(AlertCategory.DEPARTURE_REMINDER);
    });
  });

  describe('createDailyWeatherAlert()', () => {
    it('날씨 알림을 생성해야 한다', () => {
      const alert = Alert.createDailyWeatherAlert('user-id', '오전 날씨', '0 7 * * *');

      expect(alert.category).toBe(AlertCategory.DAILY_WEATHER);
      expect(alert.triggerType).toBe(AlertTriggerType.FIXED_TIME);
      expect(alert.alertTypes).toContain(AlertType.WEATHER);
      expect(alert.alertTypes).toContain(AlertType.AIR_QUALITY);
    });

    it('미세먼지 제외 옵션이 동작해야 한다', () => {
      const alert = Alert.createDailyWeatherAlert('user-id', '날씨만', '0 7 * * *', false);

      expect(alert.alertTypes).toContain(AlertType.WEATHER);
      expect(alert.alertTypes).not.toContain(AlertType.AIR_QUALITY);
    });

    it('isDailyWeatherAlert()가 true를 반환해야 한다', () => {
      const alert = Alert.createDailyWeatherAlert('user-id', '날씨', '0 7 * * *');

      expect(alert.isDailyWeatherAlert()).toBe(true);
      expect(alert.isDepartureReminderAlert()).toBe(false);
    });
  });

  describe('createDepartureAlert()', () => {
    it('출발 알림을 생성해야 한다', () => {
      const config: DepartureAlertConfig = {
        routeId: 'route-1',
        triggerType: AlertTriggerType.FIXED_TIME,
        fixedTime: '08:00',
      };

      const alert = Alert.createDepartureAlert('user-id', '출발!', config);

      expect(alert.category).toBe(AlertCategory.DEPARTURE_REMINDER);
      expect(alert.routeId).toBe('route-1');
      expect(alert.alertTypes).toContain(AlertType.SUBWAY);
      expect(alert.alertTypes).toContain(AlertType.BUS);
    });

    it('SMART_DEPARTURE 모드로 생성할 수 있어야 한다', () => {
      const config: DepartureAlertConfig = {
        routeId: 'route-1',
        triggerType: AlertTriggerType.SMART_DEPARTURE,
        targetArrivalTime: '09:00',
        bufferMinutes: 15,
      };

      const alert = Alert.createDepartureAlert('user-id', '스마트 출발', config);

      expect(alert.triggerType).toBe(AlertTriggerType.SMART_DEPARTURE);
      expect(alert.smartSchedulingEnabled).toBe(true);
      expect(alert.departureConfig?.targetArrivalTime).toBe('09:00');
      expect(alert.departureConfig?.bufferMinutes).toBe(15);
    });

    it('isDepartureReminderAlert()가 true를 반환해야 한다', () => {
      const config: DepartureAlertConfig = {
        routeId: 'route-1',
        triggerType: AlertTriggerType.FIXED_TIME,
      };

      const alert = Alert.createDepartureAlert('user-id', '출발', config);

      expect(alert.isDepartureReminderAlert()).toBe(true);
      expect(alert.isDailyWeatherAlert()).toBe(false);
    });
  });

  describe('카테고리/트리거 업데이트', () => {
    it('카테고리를 변경할 수 있어야 한다', () => {
      const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);

      alert.updateCategory(AlertCategory.DEPARTURE_REMINDER);

      expect(alert.category).toBe(AlertCategory.DEPARTURE_REMINDER);
    });

    it('트리거 타입을 변경할 수 있어야 한다', () => {
      const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);

      alert.updateTriggerType(AlertTriggerType.SMART_DEPARTURE);

      expect(alert.triggerType).toBe(AlertTriggerType.SMART_DEPARTURE);
    });
  });

  describe('스케줄 시간 추출', () => {
    it('cron 표현식에서 시간을 추출해야 한다', () => {
      const alert = new Alert('user-id', '알림', '30 8 * * *', [AlertType.WEATHER]);

      expect(alert.notificationTime).toBe('08:30');
    });

    it('직접 시간 형식도 지원해야 한다', () => {
      const alert = new Alert('user-id', '알림', '07:45', [AlertType.WEATHER]);

      expect(alert.notificationTime).toBe('07:45');
    });
  });

  describe('toJSON()', () => {
    it('모든 필드를 포함한 JSON을 반환해야 한다', () => {
      const config: DepartureAlertConfig = {
        routeId: 'route-1',
        triggerType: AlertTriggerType.SMART_DEPARTURE,
        targetArrivalTime: '09:00',
      };
      const alert = Alert.createDepartureAlert('user-id', '출발', config);

      const json = alert.toJSON();

      expect(json.userId).toBe('user-id');
      expect(json.category).toBe(AlertCategory.DEPARTURE_REMINDER);
      expect(json.triggerType).toBe(AlertTriggerType.SMART_DEPARTURE);
      expect(json.departureConfig).toBeDefined();
      expect(json.routeId).toBe('route-1');
    });
  });
});
