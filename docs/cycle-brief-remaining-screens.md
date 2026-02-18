# Cycle Brief — P1-4: 경로 설정 + 설정 + 알림 기록 화면

> Cycle 27 | Feature: remaining-screens | Branch: feature/remaining-screens

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1 (Expo 셋업) + P1-2 (홈 화면) + P1-3 (알림 설정) 완료.
이번 사이클에서 남은 3개 탭 화면을 실제 기능으로 구현.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (JWT 인증)

## P1-4 스코프

### 목표
남은 플레이스홀더 화면 3개를 실제 기능으로 구현:
1. **출퇴근 탭 (commute.tsx)**: 경로 관리 + 알림 기록
2. **설정 탭 (settings.tsx)**: 프로필 + 앱 설정 강화

### 화면 1: 출퇴근 탭 → 경로 관리 + 알림 기록

#### 경로 관리 섹션
- 등록된 경로 목록 표시 (이름, 타입, 체크포인트 수, 예상 소요시간)
- 경로 추가 (이름, 타입 선택, 체크포인트 추가/삭제)
- 경로 수정/삭제
- 경로 즐겨찾기(preferred) 토글

#### 알림 기록 섹션
- 최근 알림 발송 기록 목록 (시간, 알림 이름, 타입, 상태)
- Pull-to-refresh
- 통계 요약 (총/성공/실패)

### 화면 2: 설정 탭 강화

#### 현재 상태
- 프로필(이름, 이메일) + 로그아웃만 있음

#### 추가할 기능
- 알림 설정 바로가기 (알림 탭으로 이동)
- 경로 관리 바로가기 (출퇴근 탭으로 이동)
- 앱 정보 (버전, 오픈소스 라이센스 등)

### 기존 백엔드 API (재사용)

```
# 경로 관리
GET    /routes/user/:userId           — 사용자 경로 목록
POST   /routes                        — 경로 생성
PATCH  /routes/:id                    — 경로 수정
DELETE /routes/:id                    — 경로 삭제

# 알림 기록
GET    /notifications/history?limit=20&offset=0  — 알림 발송 기록
GET    /notifications/stats                       — 알림 통계
```

### 참고 파일 (기존 PWA)
- `frontend/src/infrastructure/api/commute-api.client.ts` — 경로 API 타입 + 클라이언트
- `frontend/src/infrastructure/api/notification-api.client.ts` — 알림 기록 API
- `frontend/src/presentation/pages/settings/SettingsPage.tsx` — 기존 설정 페이지
- `frontend/src/presentation/pages/settings/RoutesTab.tsx` — 경로 관리 탭

### 기존 모바일 파일 (교체 대상)
- `mobile/app/(tabs)/commute.tsx` — 현재 플레이스홀더
- `mobile/app/(tabs)/settings.tsx` — 현재 프로필 + 로그아웃만

## 성공 기준

- [ ] 경로 목록 표시 (이름, 타입, 체크포인트 수, 예상 시간)
- [ ] 경로 추가 (이름, 타입, 체크포인트 CRUD)
- [ ] 경로 수정 (기존 데이터 로드)
- [ ] 경로 삭제 (확인 후 삭제)
- [ ] 경로 즐겨찾기 토글
- [ ] 알림 기록 목록 (시간, 이름, 상태)
- [ ] 알림 통계 요약 (총/성공/실패)
- [ ] 설정: 알림/경로 바로가기
- [ ] 설정: 앱 정보 섹션
- [ ] 빈 상태 ("경로가 없어요", "알림 기록이 없어요")
- [ ] 로딩/에러 상태
- [ ] 비로그인 시 로그인 유도
- [ ] TypeScript 에러 0개
