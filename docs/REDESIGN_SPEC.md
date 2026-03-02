# Alert System 재설계 명세서

## 1. 핵심 기능 정의

### 기능 A: 알림 시스템
1. **날씨 알림** - 오늘 전체 날씨 정보
   - 현재 날씨
   - 시간대별 변화 (오전 → 오후 → 저녁)
   - 특이사항 강조 ("오후에 비 예보")

2. **출발 알림** - 경로 첫 번째 구간 출발 알림
   - 고정 시간 알림 (예: 매일 8시)
   - 스마트 알림 (도착 희망 시간 기준 역산)

### 기능 B: 경로 측정 시스템
1. **경로 설정**
   - 순차적 체크포인트 입력
   - 템플릿 기반 빠른 설정

2. **시간 측정**
   - 스탑워치 모드 (수동)
   - 위치 기반 자동 트래킹 (향후)

3. **경로 분석**
   - 경로별 평균/최소/최대 시간
   - 구간별 세부 분석
   - 경로 비교 추천

---

## 2. 도메인 모델 재설계

### 2.1 Alert 타입 재정의

```typescript
// 기존
enum AlertType {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

// 개선안: 명확한 목적 기반 분리
enum AlertCategory {
  // 날씨 관련
  DAILY_WEATHER = 'daily_weather',     // 오늘 전체 날씨 (핵심)

  // 출발 관련
  DEPARTURE_REMINDER = 'departure_reminder',  // 경로 첫 구간 출발 (핵심)

  // 부가 기능 (향후)
  TRANSIT_DELAY = 'transit_delay',     // 지하철/버스 지연 알림
  AIR_QUALITY = 'air_quality',         // 미세먼지 나쁨 알림
}

// 알림 방식
enum AlertTriggerType {
  FIXED_TIME = 'fixed_time',           // 고정 시간
  SMART_DEPARTURE = 'smart_departure', // 도착 시간 기준 역산
}
```

### 2.2 날씨 알림 메시지 구조

```typescript
interface DailyWeatherAlert {
  // 현재 상태
  current: {
    temperature: number;
    condition: string;
    conditionKr: string;
  };

  // 오늘 요약
  summary: {
    high: number;
    low: number;
    tempDiff: number;  // 일교차
  };

  // 시간대별 변화 (핵심!)
  timeline: Array<{
    timeSlot: '오전' | '오후' | '저녁';
    condition: string;
    temperature: number;
    rainProbability: number;
  }>;

  // 특이사항 (강조 메시지)
  highlights: string[];
  // 예: ["오후에 비 예보, 우산 챙기세요", "일교차 15도, 겉옷 필수"]

  // 한 줄 팁
  tip: string;
}
```

### 2.3 출발 알림 구조

```typescript
interface DepartureAlert {
  routeId: string;
  routeName: string;

  // 첫 번째 체크포인트 정보
  firstCheckpoint: {
    name: string;           // "강남역"
    transportMode: string;  // "subway"
    lineInfo?: string;      // "2호선"
  };

  // 알림 설정
  triggerType: AlertTriggerType;

  // 고정 시간 모드
  fixedTime?: string;  // "08:00"

  // 스마트 모드
  targetArrivalTime?: string;  // "09:00" (회사 도착 희망)
  estimatedDuration?: number;   // 45분 (평균 소요시간)
  bufferMinutes?: number;       // 10분 (여유 시간)

  // 실시간 정보 (알림 발송 시)
  transitInfo?: {
    nextArrival: number;  // 3분 후 도착
    congestion?: string;  // "보통"
  };
}
```

---

## 3. 경로 측정 플로우

### 3.1 경로 설정 (간소화)

```
[온보딩 플로우]
1. "출발지는 어디인가요?" → 집 주소 or 현재 위치
2. "어떻게 이동하나요?" → 도보 / 지하철 / 버스 선택
3. "어느 역/정류장을 이용하나요?" → 검색 & 선택
4. "환승이 있나요?" → 있음 / 없음
5. "도착지는 어디인가요?" → 회사 주소 or 현재 위치

[자동 생성]
→ 체크포인트 자동 구성
→ 예상 시간 자동 계산 (API 기반)
```

### 3.2 시간 측정 모드

```typescript
enum TrackingMode {
  // 1. 스탑워치 모드 (현재 구현됨)
  STOPWATCH = 'stopwatch',
  // - 수동으로 체크포인트 도착 버튼 클릭
  // - 가장 정확하지만 번거로움

  // 2. 반자동 모드 (권장, 구현 필요)
  SEMI_AUTO = 'semi_auto',
  // - 세션 시작/종료만 수동
  // - 중간 체크포인트는 위치 기반 자동 기록
  // - 사용자 확인/수정 가능

  // 3. 완전 자동 모드 (향후)
  FULL_AUTO = 'full_auto',
  // - 출발/도착도 위치 기반 자동 감지
  // - 백그라운드 위치 추적 필요 (배터리 이슈)
}
```

### 3.3 경로 분석 데이터

```typescript
interface RouteAnalytics {
  routeId: string;
  routeName: string;

  // 전체 통계
  totalTrips: number;

  // 시간 분석
  duration: {
    average: number;
    min: number;
    max: number;
    stdDev: number;  // 편차 (일관성)
  };

  // 구간별 분석
  segmentStats: Array<{
    checkpointName: string;
    transportMode: string;
    averageDuration: number;
    variability: 'stable' | 'variable' | 'unpredictable';
  }>;

  // 조건별 분석
  conditionAnalysis: {
    byWeather: Record<string, { avgDuration: number; count: number }>;
    byDayOfWeek: Record<string, { avgDuration: number; count: number }>;
    byTimeSlot: Record<string, { avgDuration: number; count: number }>;
  };

  // 추천 점수 (0-100)
  score: number;
  scoreFactors: {
    speed: number;      // 빠르기
    reliability: number; // 일관성
    comfort: number;    // 환승 횟수 등
  };
}
```

---

## 4. 구현 우선순위

### Phase 1: MVP 완성 (1-2주)
- [ ] 날씨 알림 메시지 개선 (시간대별 변화 포함)
- [ ] 출발 알림 타입 분리 (DEPARTURE_REMINDER)
- [ ] 경로 설정 UI 간소화 (템플릿 + 순차 입력)
- [ ] 스탑워치 측정 안정화

### Phase 2: 분석 기능 (2-3주)
- [ ] 경로별 통계 대시보드
- [ ] 경로 비교 기능
- [ ] 구간별 세부 분석

### Phase 3: 자동화 (3-4주)
- [ ] 반자동 위치 트래킹
- [ ] 스마트 출발 알림 (도착 시간 역산)
- [ ] 조건별 경로 추천

---

## 5. 데이터베이스 스키마 변경

### alerts 테이블 수정

```sql
-- 기존 컬럼 유지하면서 추가
ALTER TABLE alerts ADD COLUMN alert_category VARCHAR(50);
ALTER TABLE alerts ADD COLUMN trigger_type VARCHAR(50) DEFAULT 'fixed_time';
ALTER TABLE alerts ADD COLUMN target_arrival_time TIME;
ALTER TABLE alerts ADD COLUMN buffer_minutes INTEGER DEFAULT 10;

-- 기본값 마이그레이션
UPDATE alerts SET alert_category =
  CASE
    WHEN 'weather' = ANY(alert_types) THEN 'daily_weather'
    ELSE 'departure_reminder'
  END;
```

### route_analytics 테이블 추가

```sql
CREATE TABLE route_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES commute_routes(id),

  -- 집계 데이터
  total_trips INTEGER DEFAULT 0,
  avg_duration_minutes DECIMAL(10,2),
  min_duration_minutes INTEGER,
  max_duration_minutes INTEGER,
  std_dev_minutes DECIMAL(10,2),

  -- 점수
  speed_score INTEGER,
  reliability_score INTEGER,
  comfort_score INTEGER,
  total_score INTEGER,

  -- 마지막 업데이트
  last_calculated_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_route_analytics_route ON route_analytics(route_id);
CREATE INDEX idx_route_analytics_score ON route_analytics(total_score DESC);
```

---

## 6. API 엔드포인트 정리

### 알림 API
```
POST   /alerts                    - 알림 생성
GET    /alerts/user/:userId       - 사용자 알림 목록
PATCH  /alerts/:id                - 알림 수정
DELETE /alerts/:id                - 알림 삭제
POST   /alerts/:id/test           - 테스트 발송
```

### 경로 API
```
POST   /routes                    - 경로 생성
GET    /routes/user/:userId       - 사용자 경로 목록
GET    /routes/:id                - 경로 상세
PATCH  /routes/:id                - 경로 수정
DELETE /routes/:id                - 경로 삭제
GET    /routes/templates          - 경로 템플릿 목록
```

### 세션 API
```
POST   /sessions/start            - 측정 시작
POST   /sessions/:id/checkpoint   - 체크포인트 기록
POST   /sessions/:id/complete     - 측정 완료
GET    /sessions/active           - 진행 중 세션
GET    /sessions/history          - 측정 기록
```

### 분석 API
```
GET    /analytics/routes/:routeId - 경로 분석
GET    /analytics/compare         - 경로 비교
GET    /analytics/recommend       - 경로 추천
GET    /analytics/summary         - 전체 요약
```

---

## 7. 프론트엔드 화면 구성

### 메인 탭
1. **홈** - 오늘의 출퇴근 요약 + 날씨
2. **경로** - 내 경로 관리 + 측정
3. **분석** - 통계 + 비교 + 추천
4. **설정** - 알림 + 계정

### 핵심 화면
1. **경로 설정 위자드** - 순차적 입력 UI
2. **측정 화면** - 스탑워치 + 체크포인트
3. **경로 비교 화면** - 여러 경로 나란히 비교
4. **대시보드** - 통계 시각화
