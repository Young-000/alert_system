# Cycle Brief — P1-1: Expo 프로젝트 셋업

> Cycle 24 | Feature: expo-setup | Branch: feature/expo-setup

## 프로젝트 컨텍스트

출퇴근 메이트 — 매일 아침 최적의 출발 시각을 알려주는 출퇴근 코치 앱.
PWA v1.0 완료 후 Native App v2.0으로 피벗 중.

## 기술 스택

- **기존 Backend**: NestJS + TypeORM + PostgreSQL (AWS ECS Fargate)
  - API Base: `https://d1qgl3ij2xig8k.cloudfront.net`
  - 50+ REST endpoints 재사용
  - JWT 인증 (Bearer token)
- **새 Mobile App**: React Native + Expo (managed workflow)
  - expo-router (file-based navigation)
  - expo-secure-store (토큰 저장)

## P1-1 스코프

### 목표
Expo 프로젝트 초기화 + 네비게이션 구조 + JWT 인증 플로우

### 구체적 요구사항

1. **Expo 프로젝트 셋업**
   - `npx create-expo-app` (TypeScript 템플릿)
   - `mobile/` 디렉토리에 생성 (기존 `frontend/`, `backend/` 옆)
   - expo-router 설치 + file-based routing 설정
   - 기본 의존성: expo-secure-store, expo-constants

2. **네비게이션 구조**
   ```
   app/
     _layout.tsx          — Root layout (auth check)
     (auth)/
       login.tsx          — 로그인 화면
       register.tsx       — 회원가입 화면
     (tabs)/
       _layout.tsx        — 탭 네비게이션
       index.tsx          — 홈 (출근 브리핑)
       alerts.tsx         — 알림 설정
       commute.tsx        — 출퇴근 트래킹
       settings.tsx       — 설정
   ```

3. **JWT 인증**
   - 기존 백엔드 `/auth/login`, `/auth/register` API 사용
   - expo-secure-store로 토큰 저장 (localStorage 대신)
   - AuthContext + useAuth 훅
   - 자동 로그인 (저장된 토큰으로 세션 복원)
   - 401 응답 시 자동 로그아웃 + 로그인 화면 이동

4. **API 클라이언트**
   - fetch 기반 래퍼 (기존 PWA 패턴 참고)
   - Authorization header 자동 주입
   - 에러 핸들링 (네트워크, 401, 500)

### 기존 백엔드 Auth API

```
POST /auth/register  — { name, email, password, phone }
POST /auth/login     — { email, password } → { access_token, user }
GET  /auth/me        — (Bearer token) → user profile
```

### 참고 파일

- 기존 PWA 인증: `frontend/src/infrastructure/api/index.ts`
- 기존 Auth Context: `frontend/src/presentation/contexts/AuthContext.tsx`
- 백엔드 Auth: `backend/src/auth/`

## 성공 기준

- [ ] `npx expo start`로 앱 실행 가능
- [ ] 탭 네비게이션 동작 (홈/알림/출퇴근/설정)
- [ ] 로그인/회원가입 화면 존재 + API 연동
- [ ] 토큰 저장 + 자동 로그인
- [ ] 비로그인 시 로그인 화면 리다이렉트
- [ ] TypeScript 에러 0개
