# Round 4 - 09 User Flow E2E Test Report

**Date**: 2026-02-13
**URL**: https://frontend-xi-two-52.vercel.app
**Viewport**: 375x812 (iPhone), default desktop
**Auth State**: Unauthenticated (no localStorage token)

---

## Test Scenarios & Results

### 1. Homepage (Guest Landing) - PASS
- [x] Page loads correctly with title "출퇴근 메이트"
- [x] Hero section displays: headline, subtitle, CTA button
- [x] 3 feature cards render (경로 등록, 자동 알림, 기록 & 분석)
- [x] "시작하기" header button links to /login
- [x] "무료로 시작하기" CTA links to /login
- [x] Skip link ("본문으로 건너뛰기") present
- [x] Footer displays "출퇴근 메이트"
- [x] Bottom navigation renders with 4 items (홈, 경로, 알림, 설정)

### 2. Bottom Navigation Active States - PASS
- [x] `/` -> 홈 active
- [x] `/routes` -> 경로 active
- [x] `/alerts` -> 알림 active
- [x] `/settings` -> 설정 active

### 3. Auth Guard (Unauthenticated) - PASS
| Page | Expected Behavior | Result |
|------|-------------------|--------|
| `/routes` | Login prompt displayed | PASS |
| `/alerts` | Login prompt + notice banner | PASS |
| `/settings` | Login prompt displayed | PASS |
| `/commute` | Redirect to /login | PASS |
| `/onboarding` | Redirect to /login | PASS |
| `/notifications` | Login prompt displayed | PASS |

### 4. Login Page - PASS
- [x] Form renders with email + password fields
- [x] "서버 연결 중..." disabled state shown during health check
- [x] Button becomes "로그인" when server is healthy
- [x] Invalid credentials: error message "이메일 또는 비밀번호가 일치하지 않습니다." displayed correctly
- [x] Error message styled with red border-left
- [x] "회원가입" toggle switches to signup form
- [x] "홈" link in header navigates to /

### 5. Signup Page - PASS
- [x] Form renders with 4 fields: 이메일, 이름, 전화번호, 비밀번호
- [x] Phone field shows helper text "알림톡 발송에 사용됩니다"
- [x] Password toggle (eye icon) present
- [x] "로그인" toggle switches back to login form

### 6. Routes Page (Unauthenticated) - PASS
- [x] Shows login-required empty state with lock icon
- [x] "뒤로 가기" button navigates to home
- [x] "로그인" button links to /login

### 7. Alerts Page (Unauthenticated) - PASS
- [x] Page title "알림" displayed
- [x] Notice banner: "로그인 후 알림을 설정할 수 있어요."
- [x] Login link in notice navigates to /login
- [x] Footer displays correctly
- [x] Wizard form hidden with `display: none`

### 8. Settings Page (Unauthenticated) - PASS
- [x] Shows lock icon + "로그인이 필요해요" message
- [x] "로그인" button links to /login

### 9. 404 Page - PASS
- [x] `/this-does-not-exist` shows 404 page
- [x] "404" large text + "페이지를 찾을 수 없습니다" message
- [x] "홈으로" and "알림 설정" buttons present
- [x] URL does not redirect (stays on the 404 URL)

### 10. Console Errors - PASS
- [x] No JavaScript errors on homepage
- [x] Expected 401 error on login with wrong credentials (API response, not a bug)

---

## Minor Observations (Non-blocking)

### A. Homepage Feature Cards Overlap with Bottom Nav (Cosmetic)
The 3rd feature card ("기록 & 분석") is partially behind the bottom nav on initial viewport (375x812). User can scroll to see all cards. Bottom padding is set to 90px, bottom nav is ~85px tall. The overlap is because the cards themselves extend below the fold. This is standard scrollable behavior, not a bug.

### B. Alerts Wizard `aria-hidden` Not Rendered
The wizard container at line 800 of `AlertSettingsPage.tsx` has a ternary for `aria-hidden` but the attribute is not rendered in the DOM even when the condition evaluates to `true`. The `display: none` inline style already prevents screen reader access, so this is not a functional issue. No fix needed.

### C. Login Page Server Health Check Delay
On first visit, the login button shows "서버 연결 중..." for several seconds while the backend health check completes. This is expected behavior for the ECS Fargate backend and is properly communicated to the user.

---

## Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Page Load | 9 | 9 | 0 |
| Navigation | 6 | 6 | 0 |
| Auth Guard | 6 | 6 | 0 |
| Form Validation | 4 | 4 | 0 |
| Error Handling | 2 | 2 | 0 |
| 404 Handling | 1 | 1 | 0 |
| **Total** | **28** | **28** | **0** |

**Fixes applied**: 0
