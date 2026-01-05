# 알림톡 템플릿

카카오 비즈니스 또는 NHN Cloud에서 승인받아야 하는 템플릿 목록입니다.

## 템플릿 등록 방법

### NHN Cloud
1. https://console.nhncloud.com 접속
2. Notification > KakaoTalk Bizmessage 선택
3. 발신프로필 등록 (사업자등록증 필요)
4. 템플릿 등록 → 아래 내용 복사하여 등록

### 카카오 비즈니스
1. https://business.kakao.com 접속
2. 카카오톡 채널 생성
3. 알림톡 신청
4. 템플릿 등록

---

## 템플릿 목록

### 1. DAILY_001 - 일일 알림 (통합)

**템플릿 코드:** `DAILY_001`
**카테고리:** 정보성

```
#{userName}님, 좋은 아침이에요! ☀️

📅 #{date}

🌡️ 날씨
- 기온: #{temperature}
- 상태: #{weather}

😷 미세먼지
- PM10: #{pm10}
- PM2.5: #{pm25}
- 상태: #{airQualityStatus}

🚌 교통 정보
#{busInfo}

🚇 지하철 정보
#{subwayInfo}

좋은 하루 되세요!
```

**변수:**
- `userName`: 사용자 이름
- `date`: 날짜 (예: 1월 15일)
- `temperature`: 기온 (예: 5°C)
- `weather`: 날씨 상태 (예: 맑음)
- `pm10`: PM10 수치
- `pm25`: PM2.5 수치
- `airQualityStatus`: 미세먼지 상태 (좋음/보통/나쁨)
- `busInfo`: 버스 도착 정보
- `subwayInfo`: 지하철 도착 정보

---

### 2. WEATHER_001 - 날씨 알림

**템플릿 코드:** `WEATHER_001`
**카테고리:** 정보성

```
#{userName}님, 오늘의 날씨입니다 ☀️

📅 #{date}

🌡️ 기온: #{temperature}
☁️ 상태: #{weather}

😷 미세먼지
- PM10: #{pm10} (#{airQualityStatus})
- PM2.5: #{pm25}

좋은 하루 되세요!
```

---

### 3. TRAFFIC_001 - 출근길 교통 알림

**템플릿 코드:** `TRAFFIC_001`
**카테고리:** 정보성

```
#{userName}님, 출근길 교통 정보입니다 🚌

🚌 버스
#{busInfo}

🚇 지하철
#{subwayInfo}

⏰ 예상 소요 시간: #{estimatedTime}

안전한 출근 되세요!
```

---

### 4. TRAFFIC_002 - 퇴근길 교통 알림

**템플릿 코드:** `TRAFFIC_002`
**카테고리:** 정보성

```
#{userName}님, 퇴근길 교통 정보입니다 🏠

🚌 버스
#{busInfo}

🚇 지하철
#{subwayInfo}

오늘도 수고하셨습니다!
```

---

## 심사 주의사항

1. **정보성 메시지만 가능**: 광고/프로모션 내용 포함 시 반려
2. **변수 형식 준수**: `#{변수명}` 형식 사용
3. **이모지 허용**: 적절한 이모지 사용 가능
4. **링크**: 정보 확인용 링크만 허용 (광고 링크 불가)

## 예상 심사 기간

- NHN Cloud: 1~2 영업일
- 카카오 비즈니스: 1~3 영업일
