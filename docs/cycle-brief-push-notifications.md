# Cycle Brief — P1-5: FCM/APNs 푸시 알림

> Cycle 28 | Feature: push-notifications | Branch: feature/push-notifications

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1~P1-4 완료 (4개 탭 모두 기능 구현).
이번 사이클에서 네이티브 푸시 알림을 추가하여 알림톡 외 푸시 채널 확보.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend**: NestJS + TypeORM (AWS ECS Fargate)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (JWT 인증)

## P1-5 스코프

### 목표
Expo Push Notifications를 이용한 네이티브 푸시 알림 구현.
기존 알림톡(Solapi) + Web Push(VAPID)에 더해 FCM/APNs 채널 추가.

### 현재 알림 시스템 (기존)
1. **EventBridge Scheduler** → 시간되면 `/scheduler/trigger/:alertId` 호출
2. **SendNotificationUseCase** → 데이터 수집 (날씨, 교통 등)
3. **Solapi 알림톡** → 카카오 알림톡 발송 (메인 채널)
4. **Web Push (VAPID)** → PWA 브라우저 알림 (보조 채널)

### 추가할 부분
5. **Expo Push** → 네이티브 앱 푸시 알림 (새 채널)

### 백엔드 변경사항

#### 1. Expo Push Token 저장
```
POST   /push/expo-token    — Expo Push Token 등록
DELETE /push/expo-token    — Expo Push Token 해제
```

push_subscriptions 테이블에 `platform` 컬럼 추가 (또는 새 테이블):
- 기존 Web Push: `{endpoint, keys}`
- Expo Push: `{expoPushToken}` 형태

#### 2. Expo Push 발송 서비스
- `expo-server-sdk` 패키지 사용
- `SendNotificationUseCase`에서 Web Push와 함께 Expo Push도 발송
- 기존 `sendWebPush` 메서드 확장 또는 별도 `sendExpoPush` 메서드

#### 3. 발송 흐름 (변경 후)
```
EventBridge → /scheduler/trigger/:alertId
  → SendNotificationUseCase.execute()
    → 데이터 수집 (날씨, 교통, 경로)
    → Solapi 알림톡 발송 (메인)
    → Web Push 발송 (보조 - PWA용)
    → Expo Push 발송 (보조 - 네이티브 앱용) ← NEW
```

### 프론트엔드 (Mobile) 변경사항

#### 1. expo-notifications 설정
- 권한 요청 (requestPermissionsAsync)
- Expo Push Token 획득 (getExpoPushTokenAsync)
- 토큰을 백엔드에 POST /push/expo-token으로 전송

#### 2. 알림 수신 처리
- 포그라운드: 인앱 알림 배너
- 백그라운드: OS 네이티브 알림
- 알림 탭: 누르면 해당 화면으로 이동

#### 3. 설정에서 알림 권한 관리
- 설정 탭에 "푸시 알림" 토글 추가
- 활성화/비활성화 시 토큰 등록/해제

### 참고 파일

**백엔드 (기존):**
- `backend/src/application/use-cases/send-notification.use-case.ts` — 메인 알림 유즈케이스
- `backend/src/infrastructure/messaging/web-push.service.ts` — Web Push 서비스 (참고 패턴)
- `backend/src/presentation/controllers/push.controller.ts` — Push 구독 컨트롤러
- `backend/src/infrastructure/persistence/typeorm/push-subscription.entity.ts` — 구독 엔티티
- `backend/src/presentation/modules/push.module.ts` — Push 모듈

**프론트엔드 (Mobile):**
- `mobile/app/(tabs)/settings.tsx` — 설정 화면 (토글 추가 위치)
- `mobile/src/services/api-client.ts` — API 클라이언트
- `mobile/app/_layout.tsx` — 앱 진입점 (알림 리스너 등록)

## 성공 기준

- [ ] 앱 시작 시 푸시 알림 권한 요청
- [ ] Expo Push Token 백엔드에 등록
- [ ] 백엔드에서 Expo Push 발송 (알림 시간에)
- [ ] 포그라운드: 인앱 알림 표시
- [ ] 백그라운드: OS 알림 표시
- [ ] 알림 탭 → 해당 화면 이동
- [ ] 설정에서 푸시 알림 토글
- [ ] 로그아웃 시 토큰 해제
- [ ] TypeScript 에러 0개
- [ ] 기존 Solapi + Web Push 동작에 영향 없음
