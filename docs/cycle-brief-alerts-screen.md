# Cycle Brief — P1-3: 알림 설정 화면 (CRUD + 토글)

> Cycle 26 | Feature: alerts-screen | Branch: feature/alerts-screen

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1 (Expo 셋업) + P1-2 (홈 화면) 완료.
이번 사이클에서 알림 탭을 실제 기능으로 구현.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (JWT 인증)

## P1-3 스코프

### 목표
알림 탭의 플레이스홀더를 실제 알림 CRUD + 토글 화면으로 구현.

### 핵심 기능
1. **알림 목록**: 등록된 알림 목록 표시 (시간, 이름, 활성 상태)
2. **알림 생성**: 새 알림 추가 폼 (시간 선택, 이름, 요일 선택)
3. **알림 수정**: 기존 알림 편집
4. **알림 삭제**: 스와이프 삭제 또는 삭제 버튼
5. **알림 토글**: 활성화/비활성화 스위치

### 기존 백엔드 API (재사용)

```
GET    /alerts/user/:userId     — 사용자 알림 목록
POST   /alerts                  — 알림 생성
PATCH  /alerts/:id              — 알림 수정
DELETE /alerts/:id              — 알림 삭제
PATCH  /alerts/:id/toggle       — 알림 활성화/비활성화 토글
```

### 참고 파일 (기존 PWA)
- `frontend/src/presentation/pages/alerts/AlertPage.tsx` — 기존 알림 페이지
- `frontend/src/presentation/pages/alerts/AlertForm.tsx` — 알림 생성/수정 폼
- `frontend/src/infrastructure/api/index.ts` — API 클라이언트 (Alert 관련 메서드)
- `mobile/app/(tabs)/alerts.tsx` — 현재 플레이스홀더 (이 파일을 교체)

## 성공 기준

- [ ] 알림 목록 표시 (시간, 이름, 요일, 활성 상태)
- [ ] 새 알림 생성 (시간 피커, 이름, 요일 선택)
- [ ] 알림 수정 (기존 데이터 로드 → 수정)
- [ ] 알림 삭제 (확인 모달)
- [ ] 알림 토글 (활성/비활성 스위치)
- [ ] 빈 상태 ("알림이 없어요" + 추가 버튼)
- [ ] 로딩/에러 상태
- [ ] TypeScript 에러 0개
