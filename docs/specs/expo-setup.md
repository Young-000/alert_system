# P1-1: Expo 프로젝트 셋업 + 네비게이션 + JWT 인증

> Cycle 24 | Branch: `feature/expo-setup` | 작성일: 2026-02-19

---

## JTBD

**When** 매일 아침 출근 준비를 하면서 날씨, 미세먼지, 교통 정보를 확인하고 싶을 때,
**I want to** 네이티브 앱에서 로그인하고 탭 내비게이션으로 핵심 화면에 빠르게 접근하고 싶다,
**So I can** PWA가 제공하지 못하는 잠금화면 위젯, 푸시 알림, Geofence 등의 네이티브 기능을 활용해 출퇴근을 최적화할 수 있다.

---

## Problem

- **Who:** 대중교통으로 출퇴근하는 수도권 직장인 (기존 PWA 사용자 포함)
- **Pain:** PWA는 iOS 위젯, 백그라운드 위치 추적, 네이티브 푸시 알림을 지원하지 않는다. 매일 사용하는 출퇴근 앱인데 브라우저를 열어야 하는 불편함이 있다.
- **Current workaround:** PWA로 브라우저에서 접속, Solapi 알림톡으로 카카오톡 메시지 수신
- **Success metric:** Expo 앱이 실행되고, 로그인 후 탭 내비게이션으로 4개 화면(홈/알림/출퇴근/설정)을 이동할 수 있다. 기존 백엔드 API와 JWT 인증이 정상 동작한다.

---

## Solution

### Overview

기존 `frontend/`(React PWA)와 `backend/`(NestJS) 옆에 `mobile/` 디렉토리를 신규 생성하여 React Native + Expo 프로젝트를 구축한다. 기존 백엔드의 50+ REST API를 그대로 재사용하며, PWA의 `localStorage` 기반 토큰 저장을 `expo-secure-store` 기반으로 교체한다.

이 사이클(P1-1)은 Phase 1의 첫 번째 단계로, 앱의 뼈대(프로젝트 구조, 네비게이션, 인증)를 잡는 것이 목표다. 화면 UI는 최소한의 플레이스홀더만 구현하고, 실제 기능 연동은 다음 사이클(P1-2)에서 진행한다.

### User Flow

```
[앱 시작] → [Splash Screen] → [토큰 확인]
                                   │
                          ┌────────┴────────┐
                          │                 │
                    [토큰 있음]         [토큰 없음]
                          │                 │
                    [GET /users/:id]   [로그인 화면]
                          │                 │
                    ┌─────┴─────┐     ┌─────┴─────┐
                    │           │     │           │
              [성공: 홈]  [401: 로그인]  [로그인]  [회원가입]
                                      │           │
                                [POST /auth/login] [POST /auth/register]
                                      │           │
                                [토큰 저장 → 홈 화면]
```

### Scope (MoSCoW)

**Must have:**
- Expo 프로젝트 초기화 (`mobile/` 디렉토리, TypeScript)
- expo-router 기반 파일 시스템 라우팅
- 인증 화면 (로그인 / 회원가입)
- JWT 인증 플로우 (로그인 → 토큰 저장 → 자동 로그인 → 로그아웃)
- expo-secure-store 토큰 저장
- 탭 네비게이션 (홈 / 알림 / 출퇴근 / 설정) — 플레이스홀더 UI
- API 클라이언트 (fetch 래퍼 + Bearer 토큰 자동 주입 + 401 처리)
- AuthContext + useAuth 훅
- TypeScript 에러 0개

**Should have:**
- 401 응답 시 자동 로그아웃 + 로그인 화면 이동
- 로딩 상태 (앱 시작 시 토큰 검증 중 스플래시)
- 입력 폼 유효성 검사 (이메일 형식, 비밀번호 길이)
- 네트워크 에러 처리 + 사용자 피드백

**Could have:**
- 키보드 회피 뷰 (KeyboardAvoidingView)
- 비밀번호 보기/숨기기 토글
- 로그인/회원가입 화면 전환 애니메이션

**Won't have (this cycle):**
- 실제 홈/알림/출퇴근/설정 화면 구현 (다음 사이클 P1-2)
- 푸시 알림 (P1-3)
- 위젯 (P1-4)
- Google OAuth (모바일 전용 설정 필요, 추후 결정)
- 비밀번호 찾기/재설정
- 회원 탈퇴

---

## 기술 요구사항

### 1. Expo 프로젝트 셋업

```bash
# 프로젝트 생성
npx create-expo-app@latest mobile --template blank-typescript

# 필수 의존성
npx expo install expo-router expo-secure-store expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens
```

**`mobile/` 루트 설정:**

| 파일 | 설명 |
|------|------|
| `app.json` | Expo 설정 (scheme, plugins, orientation 등) |
| `tsconfig.json` | TypeScript strict 모드, path aliases |
| `babel.config.js` | expo-router 플러그인 |
| `.env` | `EXPO_PUBLIC_API_BASE_URL=https://d1qgl3ij2xig8k.cloudfront.net` |

**app.json 필수 설정:**

```json
{
  "expo": {
    "name": "출퇴근 메이트",
    "slug": "commute-mate",
    "scheme": "commute-mate",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": ["expo-router", "expo-secure-store"],
    "experiments": {
      "typedRoutes": true
    },
    "ios": {
      "bundleIdentifier": "com.commutemate.app",
      "supportsTablet": false
    },
    "android": {
      "package": "com.commutemate.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

### 2. 디렉토리 구조

```
mobile/
  app/                           # expo-router 파일 시스템 라우팅
    _layout.tsx                  # Root Layout — AuthProvider 래핑 + 인증 분기
    (auth)/
      _layout.tsx                # Auth 그룹 레이아웃 (Stack)
      login.tsx                  # 로그인 화면
      register.tsx               # 회원가입 화면
    (tabs)/
      _layout.tsx                # 탭 네비게이션 레이아웃
      index.tsx                  # 홈 (출근 브리핑) — 플레이스홀더
      alerts.tsx                 # 알림 설정 — 플레이스홀더
      commute.tsx                # 출퇴근 트래킹 — 플레이스홀더
      settings.tsx               # 설정 — 플레이스홀더
  src/
    contexts/
      AuthContext.tsx             # 인증 컨텍스트 + Provider
    hooks/
      useAuth.ts                 # useAuth 훅 (컨텍스트 소비자)
    services/
      api-client.ts              # fetch 래퍼 (토큰 주입, 에러 핸들링)
      auth.service.ts            # 인증 API 호출 (login, register)
      token.service.ts           # expo-secure-store 토큰 관리
    types/
      auth.ts                    # 인증 관련 타입 정의
    constants/
      config.ts                  # API_BASE_URL 등 환경 설정
  assets/
    icon.png                     # 앱 아이콘 (1024x1024)
    splash.png                   # 스플래시 이미지 (1284x2778)
    adaptive-icon.png            # Android 어댑티브 아이콘
  app.json
  babel.config.js
  tsconfig.json
  package.json
  .env
  .gitignore
```

### 3. 네비게이션 구조

**Root Layout (`app/_layout.tsx`):**
- `AuthProvider`로 전체 앱 래핑
- 인증 상태에 따라 `(auth)` 또는 `(tabs)` 그룹으로 분기
- 앱 시작 시 저장된 토큰 확인 중 스플래시/로딩 표시

```tsx
// app/_layout.tsx — 핵심 로직
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />; // 토큰 검증 중
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}
```

**Auth Group (`app/(auth)/_layout.tsx`):**
- Stack 네비게이션 (로그인 <-> 회원가입)

```tsx
// app/(auth)/_layout.tsx
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

**Tab Group (`app/(tabs)/_layout.tsx`):**
- Bottom Tab 네비게이션 (4개 탭)

```tsx
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: '홈', tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: '알림', tabBarIcon: ({ color }) => <BellIcon color={color} /> }}
      />
      <Tabs.Screen
        name="commute"
        options={{ title: '출퇴근', tabBarIcon: ({ color }) => <MapIcon color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: ({ color }) => <SettingsIcon color={color} /> }}
      />
    </Tabs>
  );
}
```

---

## API Contract (기존 백엔드 재사용)

### 1. 회원가입

```
POST /auth/register
```

**Request Body:**

```typescript
{
  email: string;        // 필수, 이메일 형식
  password: string;     // 필수, 6~72자
  name: string;         // 필수, 최대 50자
  phoneNumber: string;  // 필수, 01012345678 형식 (하이픈 없이)
}
```

**Response (201 Created):**

```typescript
{
  user: {
    id: string;          // UUID
    email: string;
    name: string;
    phoneNumber: string;
  };
  accessToken: string;   // JWT
}
```

**Error Responses:**

| Status | Body | 설명 |
|--------|------|------|
| 400 | `{ message: ["유효한 이메일 주소를 입력해주세요."] }` | 유효성 검사 실패 |
| 409 | `{ message: "이미 존재하는 이메일입니다." }` | 이메일 중복 |
| 429 | `{ message: "Too Many Requests" }` | Rate limit (1분에 3회) |

### 2. 로그인

```
POST /auth/login
```

**Request Body:**

```typescript
{
  email: string;     // 필수, 이메일 형식, 최대 254자
  password: string;  // 필수, 최대 72자
}
```

**Response (200 OK):**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    phoneNumber: string;
  };
  accessToken: string;  // JWT
}
```

**Error Responses:**

| Status | Body | 설명 |
|--------|------|------|
| 400 | `{ message: ["유효한 이메일 주소를 입력해주세요."] }` | 유효성 검사 실패 |
| 401 | `{ message: "이메일 또는 비밀번호가 올바르지 않습니다." }` | 인증 실패 |
| 429 | `{ message: "Too Many Requests" }` | Rate limit (1분에 5회) |

### 3. 사용자 정보 조회

```
GET /users/:id
Authorization: Bearer {accessToken}
```

**Response (200 OK):**

```typescript
{
  id: string;
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Error Responses:**

| Status | Body | 설명 |
|--------|------|------|
| 401 | `{ message: "인증이 필요합니다." }` | 토큰 없음/만료 |
| 403 | `{ message: "다른 사용자의 정보를 조회할 수 없습니다." }` | 타인 정보 접근 |

### JWT 토큰 구조

```typescript
// JWT Payload (서버에서 생성)
{
  sub: string;    // user.id (UUID)
  email: string;  // user.email
  iat: number;    // 발급 시간
  exp: number;    // 만료 시간
}
```

- 토큰은 `Authorization: Bearer {token}` 헤더로 전송
- 서버는 `ExtractJwt.fromAuthHeaderAsBearerToken()`으로 추출
- 만료 시 401 Unauthorized 반환

---

## 인증 플로우 상세

### Token Storage (expo-secure-store)

```typescript
// src/services/token.service.ts

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  USER_NAME: 'userName',
  PHONE_NUMBER: 'phoneNumber',
} as const;

export const tokenService = {
  /** 로그인 성공 시 토큰 + 사용자 정보 저장 */
  async saveAuthData(data: {
    accessToken: string;
    userId: string;
    email: string;
    name: string;
    phoneNumber: string;
  }): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, data.accessToken);
    await SecureStore.setItemAsync(KEYS.USER_ID, data.userId);
    await SecureStore.setItemAsync(KEYS.USER_EMAIL, data.email);
    await SecureStore.setItemAsync(KEYS.USER_NAME, data.name);
    await SecureStore.setItemAsync(KEYS.PHONE_NUMBER, data.phoneNumber);
  },

  /** 저장된 토큰 가져오기 */
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  /** 저장된 사용자 정보 가져오기 */
  async getUserData(): Promise<{
    userId: string;
    email: string;
    name: string;
    phoneNumber: string;
  } | null> {
    const userId = await SecureStore.getItemAsync(KEYS.USER_ID);
    if (!userId) return null;
    return {
      userId,
      email: (await SecureStore.getItemAsync(KEYS.USER_EMAIL)) ?? '',
      name: (await SecureStore.getItemAsync(KEYS.USER_NAME)) ?? '',
      phoneNumber: (await SecureStore.getItemAsync(KEYS.PHONE_NUMBER)) ?? '',
    };
  },

  /** 로그아웃 시 모든 데이터 삭제 */
  async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key))
    );
  },
};
```

### AuthContext

```typescript
// src/contexts/AuthContext.tsx

type AuthState = {
  user: {
    id: string;
    email: string;
    name: string;
    phoneNumber: string;
  } | null;
  isLoggedIn: boolean;
  isLoading: boolean;   // 앱 시작 시 토큰 검증 중
};

type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthContextType = AuthState & AuthActions;
```

### 인증 플로우 시퀀스

**1. 앱 시작 (자동 로그인)**

```
1. AuthProvider 마운트
2. isLoading = true (스플래시 표시)
3. tokenService.getAccessToken() 호출
4. 토큰 있음 → GET /users/:id 로 검증
   4a. 성공 → user 상태 설정, isLoggedIn = true
   4b. 401 → tokenService.clearAll(), isLoggedIn = false
5. 토큰 없음 → isLoggedIn = false
6. isLoading = false (네비게이션 분기)
```

**2. 로그인**

```
1. 사용자가 이메일/비밀번호 입력
2. 클라이언트 유효성 검사 (이메일 형식, 비밀번호 비어있지 않은지)
3. POST /auth/login 호출
4. 성공 → tokenService.saveAuthData() → user 상태 설정 → isLoggedIn = true
5. 실패 → 에러 메시지 표시
   - 401: "이메일 또는 비밀번호가 올바르지 않습니다."
   - 429: "잠시 후 다시 시도해주세요."
   - 네트워크 에러: "서버에 연결할 수 없습니다."
```

**3. 회원가입**

```
1. 사용자가 이름/이메일/비밀번호/전화번호 입력
2. 클라이언트 유효성 검사:
   - 이름: 비어있지 않을 것
   - 이메일: 이메일 형식
   - 비밀번호: 6자 이상
   - 전화번호: 01012345678 형식 (숫자만, 10~11자리)
3. POST /auth/register 호출
4. 성공 → tokenService.saveAuthData() → user 상태 설정 → isLoggedIn = true
5. 실패 → 에러 메시지 표시
   - 400: 서버 유효성 메시지 그대로 표시
   - 409: "이미 가입된 이메일입니다."
   - 429: "잠시 후 다시 시도해주세요."
```

**4. 로그아웃**

```
1. 설정 화면에서 "로그아웃" 버튼 클릭
2. tokenService.clearAll() 호출
3. user = null, isLoggedIn = false
4. 네비게이션이 자동으로 (auth) 그룹으로 분기
```

**5. 401 자동 로그아웃**

```
1. 임의의 API 호출 시 401 Unauthorized 응답
2. apiClient가 /auth/ 엔드포인트가 아닌 경우 감지
3. tokenService.clearAll() 호출
4. AuthContext의 logout() 트리거
5. 네비게이션이 자동으로 로그인 화면으로 이동
```

### API Client

```typescript
// src/services/api-client.ts

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;
  private onUnauthorized: (() => void) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /** 401 발생 시 콜백 등록 (AuthProvider에서 설정) */
  setOnUnauthorized(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await tokenService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private handleAuthError(url: string, status: number): void {
    const isAuthEndpoint = url.startsWith('/auth/');
    if (status === 401 && !isAuthEndpoint && this.onUnauthorized) {
      this.onUnauthorized();
    }
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: await this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        this.handleAuthError(url, response.status);
        throw new ApiError(response.status, body);
      }

      const text = await response.text();
      return text ? (JSON.parse(text) as T) : (undefined as T);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // get, post, put, patch, delete 메서드 — PWA api-client.ts와 동일 패턴
  // withRetry는 네트워크 에러/타임아웃만 재시도 (HTTP 에러는 즉시 throw)
}
```

**PWA `ApiClient`와의 차이점:**

| 항목 | PWA (`frontend/`) | Mobile (`mobile/`) |
|------|------|------|
| 토큰 저장 | `localStorage.getItem('accessToken')` | `SecureStore.getItemAsync('accessToken')` |
| 헤더 구성 | 동기 (`getHeaders()`) | **비동기** (`async getHeaders()`) |
| 401 처리 | `window.location.href = '/login'` | 콜백 패턴 (`onUnauthorized`) |
| Base URL | `import.meta.env.VITE_API_BASE_URL` | `process.env.EXPO_PUBLIC_API_BASE_URL` |
| 재시도 | 동일 (네트워크 에러 2회 재시도) | 동일 |

---

## 화면별 상세

### 1. 로그인 화면 (`app/(auth)/login.tsx`)

**UI 요소:**

| 요소 | 타입 | 설명 |
|------|------|------|
| 앱 로고/제목 | Image + Text | "출퇴근 메이트" |
| 이메일 입력 | TextInput | `keyboardType="email-address"`, `autoCapitalize="none"` |
| 비밀번호 입력 | TextInput | `secureTextEntry={true}` |
| 로그인 버튼 | Pressable | 로딩 중 disabled + ActivityIndicator |
| 에러 메시지 | Text | 빨간색, 폼 상단에 표시 |
| 회원가입 링크 | Link | "계정이 없으신가요? 회원가입" → `/(auth)/register` |

**상태 관리:**

```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```

**이벤트:**

- `handleLogin`: 유효성 검사 → `auth.login(email, password)` → 에러 처리
- 이메일 비어있음 → "이메일을 입력해주세요."
- 비밀번호 비어있음 → "비밀번호를 입력해주세요."
- 로그인 성공 시 → AuthContext가 상태 변경 → 자동으로 `(tabs)` 그룹으로 전환 (명시적 navigate 불필요)

### 2. 회원가입 화면 (`app/(auth)/register.tsx`)

**UI 요소:**

| 요소 | 타입 | 설명 |
|------|------|------|
| 제목 | Text | "회원가입" |
| 이름 입력 | TextInput | `autoCapitalize="words"` |
| 이메일 입력 | TextInput | `keyboardType="email-address"`, `autoCapitalize="none"` |
| 비밀번호 입력 | TextInput | `secureTextEntry={true}` |
| 전화번호 입력 | TextInput | `keyboardType="phone-pad"`, placeholder "01012345678" |
| 회원가입 버튼 | Pressable | 로딩 중 disabled + ActivityIndicator |
| 에러 메시지 | Text | 빨간색, 폼 상단에 표시 |
| 로그인 링크 | Link | "이미 계정이 있으신가요? 로그인" → `/(auth)/login` |

**클라이언트 유효성 검사:**

```typescript
function validateRegisterForm(data: RegisterFormData): string | null {
  if (!data.name.trim()) return '이름을 입력해주세요.';
  if (!data.email.trim()) return '이메일을 입력해주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return '유효한 이메일 형식이 아닙니다.';
  if (data.password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
  if (!/^01[0-9]{8,9}$/.test(data.phoneNumber)) return '유효한 휴대폰 번호를 입력해주세요. (예: 01012345678)';
  return null; // 유효
}
```

### 3. 탭 네비게이션 (플레이스홀더 화면들)

**홈 탭 (`app/(tabs)/index.tsx`):**

```tsx
export default function HomeScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView>
      <Text>{user?.name}님, 좋은 아침이에요!</Text>
      <Text>출근 브리핑이 여기에 표시됩니다.</Text>
      {/* P1-2에서 실제 구현 */}
    </SafeAreaView>
  );
}
```

**알림 탭 (`app/(tabs)/alerts.tsx`):**

```tsx
export default function AlertsScreen() {
  return (
    <SafeAreaView>
      <Text>알림 설정</Text>
      <Text>알림 목록이 여기에 표시됩니다.</Text>
    </SafeAreaView>
  );
}
```

**출퇴근 탭 (`app/(tabs)/commute.tsx`):**

```tsx
export default function CommuteScreen() {
  return (
    <SafeAreaView>
      <Text>출퇴근 트래킹</Text>
      <Text>출퇴근 기록이 여기에 표시됩니다.</Text>
    </SafeAreaView>
  );
}
```

**설정 탭 (`app/(tabs)/settings.tsx`):**

```tsx
export default function SettingsScreen() {
  const { user, logout } = useAuth();
  return (
    <SafeAreaView>
      <Text>{user?.name}</Text>
      <Text>{user?.email}</Text>
      <Pressable onPress={logout}>
        <Text>로그아웃</Text>
      </Pressable>
    </SafeAreaView>
  );
}
```

---

## 타입 정의

```typescript
// src/types/auth.ts

/** 로그인 요청 */
export type LoginDto = {
  email: string;
  password: string;
};

/** 회원가입 요청 */
export type RegisterDto = {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
};

/** 인증 응답 (로그인/회원가입 공통) */
export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

/** 인증된 사용자 정보 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
};

/** 사용자 프로필 응답 (GET /users/:id) */
export type UserProfile = {
  id: string;
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
};
```

---

## 에지 케이스 & 에러 핸들링

### 네트워크 관련

| 시나리오 | 처리 |
|----------|------|
| 오프라인 상태에서 로그인 시도 | "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요." |
| API 타임아웃 (30초) | "요청 시간이 초과되었습니다. 다시 시도해주세요." |
| 서버 500 에러 | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |
| Rate limit (429) | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." |

### 인증 관련

| 시나리오 | 처리 |
|----------|------|
| 저장된 토큰이 만료됨 | 앱 시작 시 GET /users/:id → 401 → 토큰 삭제 → 로그인 화면 |
| 앱 사용 중 토큰 만료 | API 호출 → 401 → 토큰 삭제 → 로그인 화면 자동 이동 |
| SecureStore 접근 불가 (시뮬레이터 제한) | try-catch로 감싸고, 실패 시 로그인 화면으로 폴백 |
| 동시에 여러 API가 401 반환 | 첫 번째 401만 logout 트리거 (중복 방지 플래그) |

### 입력 관련

| 시나리오 | 처리 |
|----------|------|
| 이메일에 공백 포함 | `trim()` 처리 후 검증 |
| 전화번호에 하이픈 입력 | 하이픈 자동 제거 후 검증 |
| 비밀번호 72자 초과 | 클라이언트에서 maxLength 제한 |
| 빈 폼 제출 | 각 필드별 에러 메시지 표시 |
| 키보드가 입력 필드를 가림 | `KeyboardAvoidingView` + `ScrollView` 조합 |

### 앱 생명주기

| 시나리오 | 처리 |
|----------|------|
| 앱 백그라운드 → 포그라운드 | 저장된 토큰 재검증 불필요 (토큰 만료는 API 호출 시 처리) |
| 앱 강제 종료 후 재시작 | SecureStore에 토큰이 유지됨 → 자동 로그인 |
| 메모리 부족으로 앱 종료 | SecureStore 데이터는 안전 (OS 레벨 암호화 저장) |

---

## Acceptance Criteria

### 프로젝트 셋업

- [ ] Given `mobile/` 디렉토리, When `cd mobile && npx expo start` 실행, Then 앱이 에러 없이 시작되고 시뮬레이터/Expo Go에서 렌더링된다
- [ ] Given `mobile/` 프로젝트, When `npx tsc --noEmit` 실행, Then TypeScript 에러가 0개이다
- [ ] Given `mobile/package.json`, When 의존성 확인, Then `expo-router`, `expo-secure-store`, `expo-constants`가 설치되어 있다

### 네비게이션

- [ ] Given 비로그인 상태, When 앱을 시작, Then 로그인 화면(`/(auth)/login`)이 표시된다
- [ ] Given 로그인 완료 상태, When 앱이 표시되면, Then 하단 탭 네비게이션(홈/알림/출퇴근/설정)이 보인다
- [ ] Given 탭 네비게이션, When 각 탭을 탭, Then 해당 화면으로 전환된다 (4개 탭 모두)
- [ ] Given 로그인 화면, When "회원가입" 링크를 탭, Then 회원가입 화면으로 이동한다
- [ ] Given 회원가입 화면, When "로그인" 링크를 탭, Then 로그인 화면으로 이동한다

### 로그인

- [ ] Given 로그인 화면에서 유효한 이메일/비밀번호 입력, When 로그인 버튼 탭, Then API `/auth/login` 호출 후 탭 화면으로 이동한다
- [ ] Given 로그인 화면에서 잘못된 비밀번호 입력, When 로그인 버튼 탭, Then "이메일 또는 비밀번호가 올바르지 않습니다." 에러 메시지가 표시된다
- [ ] Given 로그인 화면에서 빈 이메일, When 로그인 버튼 탭, Then "이메일을 입력해주세요." 에러 메시지가 표시된다
- [ ] Given 로그인 진행 중, When API 응답 대기, Then 로그인 버튼이 disabled + 로딩 인디케이터가 표시된다

### 회원가입

- [ ] Given 회원가입 화면에서 모든 필드를 유효하게 입력, When 회원가입 버튼 탭, Then API `/auth/register` 호출 후 탭 화면으로 이동한다
- [ ] Given 회원가입 시 이미 존재하는 이메일 입력, When 회원가입 버튼 탭, Then "이미 가입된 이메일입니다." 에러 메시지가 표시된다
- [ ] Given 회원가입 시 비밀번호 5자 입력, When 회원가입 버튼 탭, Then "비밀번호는 6자 이상이어야 합니다." 에러 메시지가 표시된다
- [ ] Given 회원가입 시 잘못된 전화번호 형식, When 회원가입 버튼 탭, Then "유효한 휴대폰 번호를 입력해주세요." 에러 메시지가 표시된다

### 토큰 저장 & 자동 로그인

- [ ] Given 로그인 성공 후, When `SecureStore.getItemAsync('accessToken')` 호출, Then JWT 토큰이 반환된다
- [ ] Given 토큰이 SecureStore에 저장된 상태, When 앱을 재시작, Then 로그인 화면을 거치지 않고 바로 탭 화면이 표시된다
- [ ] Given 만료된 토큰이 저장된 상태, When 앱을 시작, Then 토큰 검증 실패 → 토큰 삭제 → 로그인 화면이 표시된다

### 로그아웃

- [ ] Given 설정 탭에서 로그아웃 버튼, When 탭, Then SecureStore의 모든 인증 데이터가 삭제되고 로그인 화면으로 이동한다

### 401 자동 처리

- [ ] Given 로그인 상태에서 임의의 API 호출 시 401 응답, When API 클라이언트가 감지, Then 자동으로 토큰 삭제 + 로그인 화면으로 이동한다
- [ ] Given `/auth/login` 호출 시 401 응답, When API 클라이언트가 감지, Then 자동 로그아웃하지 않고 에러를 그대로 반환한다 (인증 엔드포인트 예외)

---

## Task Breakdown

| # | Task | 복잡도 | 의존성 | 예상 시간 |
|---|------|--------|--------|-----------|
| 1 | Expo 프로젝트 초기화 (`create-expo-app` + 의존성 설치) | S | 없음 | 15분 |
| 2 | `app.json`, `tsconfig.json`, `babel.config.js` 설정 | S | 1 | 15분 |
| 3 | 환경 변수 설정 (`.env`, `src/constants/config.ts`) | S | 1 | 10분 |
| 4 | 타입 정의 (`src/types/auth.ts`) | S | 없음 | 10분 |
| 5 | `tokenService` 구현 (`src/services/token.service.ts`) | S | 1 | 15분 |
| 6 | `ApiClient` 구현 (`src/services/api-client.ts`) | M | 5 | 30분 |
| 7 | `authService` 구현 (`src/services/auth.service.ts`) | S | 6 | 15분 |
| 8 | `AuthContext` + `useAuth` 훅 구현 | M | 5, 7 | 30분 |
| 9 | Root Layout (`app/_layout.tsx`) — 인증 분기 로직 | M | 8 | 20분 |
| 10 | Auth Layout + 로그인 화면 (`app/(auth)/`) | M | 8 | 30분 |
| 11 | 회원가입 화면 (`app/(auth)/register.tsx`) | M | 8 | 30분 |
| 12 | Tab Layout (`app/(tabs)/_layout.tsx`) | S | 9 | 15분 |
| 13 | 플레이스홀더 탭 화면 4개 (홈/알림/출퇴근/설정) | S | 12 | 20분 |
| 14 | 설정 화면 로그아웃 버튼 연동 | S | 8, 13 | 10분 |
| 15 | `.gitignore` + 프로젝트 정리 | S | 1 | 5분 |
| 16 | 전체 TypeScript 검사 + 수동 테스트 | M | 전체 | 20분 |

**총 예상 시간: ~4.5시간**

---

## Open Questions

1. **앱 아이콘/스플래시:** 이 사이클에서는 기본 Expo 아이콘을 사용한다. 디자인이 필요하면 별도 사이클로 분리.
2. **Expo SDK 버전:** 최신 안정 버전(SDK 52)을 사용한다. 특별한 이유가 없으면 SDK를 고정.
3. **Monorepo 설정:** `mobile/`과 `frontend/`이 타입을 공유할 필요는 없다. 각각 독립 프로젝트로 유지. 추후 필요시 `packages/shared-types` 도입 검토.
4. **CI/CD:** 이 사이클에서는 CI 설정을 하지 않는다. EAS Build + Submit은 Phase 1 마지막(P1-5)에서 한번에 설정.

---

## Out of Scope

| 항목 | 이유 |
|------|------|
| 실제 홈/알림/출퇴근/설정 화면 기능 | P1-2 사이클에서 구현 |
| FCM/APNs 푸시 알림 | P1-3 사이클 |
| iOS/Android 위젯 | P1-4 사이클 |
| Google OAuth (모바일) | 모바일 전용 OAuth 설정이 필요하며, 이메일/비밀번호 인증이 우선 |
| 비밀번호 찾기/재설정 | 핵심 플로우가 아님, Could-have로 백로그 관리 |
| 자동 테스트 (Jest/Detox) | 이 사이클에서는 수동 테스트로 충분, 추후 E2E 사이클에서 도입 |
| 다크 모드 | PRD에 라이트 모드만 명시 |
| 앱 아이콘/스플래시 디자인 | Phase 1 마지막 사이클(P1-5)에서 처리 |
| EAS Build / 앱스토어 배포 | Phase 1 마지막 사이클(P1-5)에서 처리 |

---

*작성: PM Agent | 기반 문서: `docs/cycle-brief-expo-setup.md`, `docs/PRD.md`*
