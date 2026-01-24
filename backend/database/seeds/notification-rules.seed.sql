-- Seed: System Notification Rules
-- Date: 2026-01-20
-- Description: Default system rules for smart notifications

-- Clear existing system rules (for re-seeding)
DELETE FROM alert_system.notification_rules WHERE is_system_rule = true;

-- Weather Rules
INSERT INTO alert_system.notification_rules (name, category, priority, conditions, message_template, is_system_rule)
VALUES
-- Rain warning (high priority)
('비 예보 알림', 'weather', 75,
 '[{"dataSource": "weather", "field": "condition", "operator": "contains", "value": "rain"}]',
 '☔ 오늘 비 예보가 있어요. 우산 챙기세요!',
 true),

-- Snow warning
('눈 예보 알림', 'weather', 75,
 '[{"dataSource": "weather", "field": "condition", "operator": "contains", "value": "snow"}]',
 '❄️ 눈 예보! 미끄럼 주의하세요.',
 true),

-- Cold weather warning (critical)
('한파 주의보', 'weather', 100,
 '[{"dataSource": "weather", "field": "temperature", "operator": "lt", "value": -10}]',
 '🥶 오늘 기온 {{weather.temperature}}°C 예상! 따뜻하게 입으세요.',
 true),

-- Freezing temperature
('영하 기온 알림', 'weather', 75,
 '[{"dataSource": "weather", "field": "temperature", "operator": "lt", "value": 0}]',
 '🧊 영하 날씨예요 ({{weather.temperature}}°C). 동파 주의!',
 true),

-- Hot weather warning (critical)
('폭염 주의보', 'weather', 100,
 '[{"dataSource": "weather", "field": "temperature", "operator": "gt", "value": 33}]',
 '🔥 오늘 기온 {{weather.temperature}}°C 예상! 더위 조심하세요.',
 true),

-- Strong wind warning
('강풍 주의', 'weather', 75,
 '[{"dataSource": "weather", "field": "windSpeed", "operator": "gt", "value": 10}]',
 '💨 바람이 강해요 ({{weather.windSpeed}}m/s). 외출 시 주의하세요.',
 true),

-- Air Quality Rules
-- Very poor air quality (critical)
('초미세먼지 매우나쁨', 'air_quality', 100,
 '[{"dataSource": "airQuality", "field": "pm25", "operator": "gt", "value": 75}]',
 '🚨 초미세먼지 매우나쁨 (PM2.5 {{airQuality.pm25}}μg/m³)! 외출을 자제하세요.',
 true),

-- Poor PM2.5
('초미세먼지 나쁨', 'air_quality', 75,
 '[{"dataSource": "airQuality", "field": "pm25", "operator": "gt", "value": 35}]',
 '😷 초미세먼지 나쁨 (PM2.5 {{airQuality.pm25}}μg/m³). 마스크 착용 권장!',
 true),

-- Poor PM10
('미세먼지 나쁨', 'air_quality', 75,
 '[{"dataSource": "airQuality", "field": "pm10", "operator": "gt", "value": 80}]',
 '😷 미세먼지 나쁨 (PM10 {{airQuality.pm10}}μg/m³). 외출 시 마스크 착용!',
 true),

-- Good air quality
('공기 좋음', 'air_quality', 25,
 '[{"dataSource": "airQuality", "field": "pm10", "operator": "lt", "value": 30}, {"dataSource": "airQuality", "field": "pm25", "operator": "lt", "value": 15, "logicalOperator": "and"}]',
 '🌿 오늘 공기 좋아요! 환기하기 좋은 날이에요.',
 true),

-- Transit Comparison Rules
-- Bus faster than subway
('버스가 빠름', 'transit_comparison', 50,
 '[{"dataSource": "busArrival", "field": "arrivalTime", "operator": "gte", "value": 0}, {"dataSource": "subwayArrival", "field": "arrivalTime", "operator": "gte", "value": 0, "logicalOperator": "and"}]',
 '🚌 {{transit.comparison}}',
 true),

-- Subway arriving soon
('지하철 곧 도착', 'transit', 50,
 '[{"dataSource": "subwayArrival", "field": "arrivalTime", "operator": "lte", "value": 3}]',
 '🚇 지하철 {{subwayArrival.arrivalTime}}분 후 도착! 서두르세요.',
 true),

-- Bus arriving soon
('버스 곧 도착', 'transit', 50,
 '[{"dataSource": "busArrival", "field": "arrivalTime", "operator": "lte", "value": 3}]',
 '🚌 버스 {{busArrival.arrivalTime}}분 후 도착! 정류장으로 출발하세요.',
 true);
