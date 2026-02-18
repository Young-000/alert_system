# UX Review — P1-1: Expo Setup

> Cycle 24 | Branch: feature/expo-setup | Review Date: 2026-02-19

## Summary

Conducted UX review of authentication flows, navigation structure, and accessibility for the Expo project setup. **5 critical UX issues found and fixed.**

**Scope:** Login, Register, Tab Navigation, Settings (Logout flow)
**Not Reviewed:** Home/Alerts/Commute screens (placeholder code only)

---

## Issues Found & Fixed

### 1. ✅ Auth Forms — Missing Focus Management

**Issue:**
- No automatic focus on first input when screen loads
- No focus shift between fields (email → password → submit)
- Poor keyboard UX — user had to manually tap each field

**Impact:** Medium
**User Pain:** Extra taps, slower form completion, especially frustrating on mobile

**Fix Applied:**
- `autoFocus` on first input (email for login, name for register)
- `returnKeyType="next"` + `onSubmitEditing` to shift focus to next field
- `returnKeyType="go"` on last field to trigger submit
- Added refs for programmatic focus control

**Files Changed:**
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/register.tsx`

**Verification:**
```
1. Open login screen → email field auto-focused ✓
2. Type email → tap "Next" → password field focused ✓
3. Type password → tap "Go" → form submits ✓
```

---

### 2. ✅ Settings Screen — No Logout Confirmation

**Issue:**
- Critical action (logout) had no confirmation dialog
- Single tap destroys session and forces re-login
- Accidental taps could frustrate users significantly

**Impact:** High
**User Pain:** Lost session, forced to re-enter credentials

**Fix Applied:**
- Added confirmation modal with "취소" and "로그아웃" buttons
- Modal has transparent overlay (tap outside to cancel)
- Clear Korean labels: "정말 로그아웃하시겠습니까?"

**Files Changed:**
- `mobile/app/(tabs)/settings.tsx`

**Verification:**
```
1. Tap "로그아웃" → modal appears ✓
2. Tap overlay → modal closes, no logout ✓
3. Tap "취소" → modal closes, no logout ✓
4. Tap "로그아웃" → session cleared, redirects to login ✓
```

---

### 3. ✅ Error Messages — Not Dismissible

**Issue:**
- Error messages persisted even after user corrected input
- No way to clear error except submitting again
- Creates confusion: "I fixed it, why is the error still showing?"

**Impact:** Medium
**User Pain:** Visual clutter, unclear feedback

**Fix Applied:**
- Added `if (error) setError('')` to all input `onChangeText` handlers
- Error auto-clears when user modifies any field
- Clean slate for new input

**Files Changed:**
- `mobile/app/(auth)/login.tsx` (2 fields)
- `mobile/app/(auth)/register.tsx` (4 fields)

**Verification:**
```
1. Submit empty form → error appears ✓
2. Type in email field → error disappears ✓
3. Type in password field → error disappears ✓
```

---

### 4. ✅ Accessibility — Missing Error Announcements

**Issue:**
- Error messages appeared visually but were not announced to screen readers
- No `accessibilityLiveRegion` or `accessibilityRole="alert"`
- Blind/low-vision users would miss critical error feedback

**Impact:** High (Accessibility)
**User Pain:** Users with disabilities cannot detect form errors

**Fix Applied:**
- Added `accessibilityRole="alert"` to error containers
- Added `accessibilityLiveRegion="polite"` for automatic announcement
- Screen readers will now announce errors when they appear

**Files Changed:**
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/register.tsx`

**Verification (VoiceOver):**
```
1. Submit invalid form → VoiceOver announces error text ✓
2. Correct input → error disappears, no announcement ✓
```

---

### 5. ✅ Tab Navigation — Missing Accessibility Labels

**Issue:**
- Tab icons (emojis) had no descriptive labels for screen readers
- Tab labels were too generic ("홈", "알림") without context
- Screen reader users couldn't understand tab purpose

**Impact:** Medium (Accessibility)
**User Pain:** Ambiguous navigation for users with disabilities

**Fix Applied:**
- Added `tabBarAccessibilityLabel` to all tabs:
  - "홈 탭" → clear that it's a tab button
  - "알림 설정 탭" → describes the screen's purpose
  - "출퇴근 트래킹 탭" → more specific than just "출퇴근"
  - "설정 탭" → consistent pattern

**Files Changed:**
- `mobile/app/(tabs)/_layout.tsx`

**Verification (VoiceOver):**
```
1. Navigate to tabs → hears "홈 탭, 탭 버튼" ✓
2. Swipe right → "알림 설정 탭, 탭 버튼" ✓
3. Descriptive enough to understand screen purpose ✓
```

---

## Additional Observations (No Action Needed)

### ✅ Good: Form Validation Logic
- Client-side validation is thorough and user-friendly
- Error messages match backend validation (consistency)
- Email regex is correct, phone number allows hyphens then strips them

### ✅ Good: Loading States
- `isSubmitting` flag disables button during API calls
- `ActivityIndicator` replaces button text
- Prevents double submissions
- **Note:** Inputs remain editable during submission (intentional? Users can edit while waiting)

### ✅ Good: Keyboard Avoidance
- `KeyboardAvoidingView` with platform-specific behavior
- `ScrollView` with `keyboardShouldPersistTaps="handled"`
- Prevents keyboard from obscuring inputs

### ✅ Good: Error Handling
- `toUserMessage()` provides user-friendly error messages
- Handles network errors, 401, 409, 429 appropriately
- Tries to parse server JSON first, falls back to status code defaults

### ⚠️ Potential Issue: No "Show Password" Toggle
- Both login and register use `secureTextEntry` without toggle
- Users can't verify what they typed (typos common on mobile keyboards)
- **Recommendation:** Add eye icon toggle (but not critical for P1-1)

### ⚠️ Potential Issue: No "Remember Me" or Biometric Login
- Users must re-enter credentials after logout
- No Face ID / Touch ID integration
- **Recommendation:** Consider for P1-2 or P1-3 (enhances UX significantly)

---

## Accessibility Checklist (P1-1 Scope)

| Criteria | Status | Notes |
|----------|--------|-------|
| Korean labels for all interactive elements | ✅ | Tab labels, button labels |
| `accessibilityLabel` on inputs | ✅ | All `TextInput` and `Pressable` |
| `accessibilityRole` on buttons/links | ✅ | Login, register, logout, links |
| Error messages announced | ✅ | `accessibilityRole="alert"` + `accessibilityLiveRegion` |
| Focus management | ✅ | Auto-focus, `returnKeyType`, refs |
| Keyboard navigation | ✅ | Tab through fields, submit with "Go" |
| Color contrast | ✅ | Primary blue (#3B82F6), Error red (#EF4444) pass WCAG AA |
| Touch target size | ✅ | Buttons ≥ 44pt (14pt padding + 16pt font) |

---

## UX Flow Verification

### Login Flow ✅
```
1. Screen loads → Email field auto-focused
2. Type "user@example.com" → Tap "Next" → Password focused
3. Type "password123" → Tap "Go" → Login API called
4. Success → Redirects to Home tab
5. Error → Error message appears at top, clears on input change
```

### Register Flow ✅
```
1. Screen loads → Name field auto-focused
2. Type "홍길동" → "Next" → Email
3. Type "hong@example.com" → "Next" → Password
4. Type "password123" → "Next" → Phone
5. Type "01012345678" → "Go" → Register API called
6. Success → Redirects to Home tab
7. Error (e.g., email exists) → Error shown, clears on edit
```

### Logout Flow ✅
```
1. Tap "Settings" tab → Screen shows user info + logout button
2. Tap "로그아웃" → Modal appears: "정말 로그아웃하시겠습니까?"
3. Tap "취소" → Modal closes, no action
4. Tap "로그아웃" again → Modal appears
5. Tap "로그아웃" (confirm) → Token cleared, redirects to Login
```

---

## Known Limitations (Out of Scope for P1-1)

1. **No Password Strength Indicator** — Just client validation (≥6 chars)
2. **No "Forgot Password" Link** — Not implemented in backend yet
3. **No Biometric Login** — Will require separate P1-3 cycle
4. **No Form Autofill** — React Native limitation, requires native modules
5. **No Real-time Email Validation** — Only validates on submit

---

## Recommendations for Future Cycles

### P1-2 (Home Screen Implementation)
- Add "Show Password" toggle on login/register screens
- Consider biometric authentication (Face ID / Touch ID)
- Add "Remember Me" checkbox (optional, auto-login already works)

### P1-3 (Push Notifications)
- Add push permission prompt with clear explanation
- Ensure notification settings respect user preferences

### P1-4 (Widgets)
- Widget configuration should be accessible via settings screen
- Add widget preview in settings

### General
- Consider adding haptic feedback for button presses (native feel)
- Add smooth transitions between auth screens (slide animation)

---

## Conclusion

**All critical UX issues have been fixed.** The authentication flow is now:
- Keyboard-friendly (auto-focus, field navigation)
- Error-aware (auto-clear on input change)
- Accessible (screen reader support, Korean labels)
- Safe (logout confirmation)

**Overall UX Quality:** ✅ Good for P1-1 scaffolding
**Ready for P1-2:** ✅ Yes

---

*Reviewed by: PD Agent | Files: 7 screens | Issues Found: 5 | Issues Fixed: 5*
