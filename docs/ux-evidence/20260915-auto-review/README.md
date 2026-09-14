# 2026-09-15 자동 E2E 리뷰 — 실화면 증거

빌드 산출물(`vite preview`)을 Playwright로 열어 촬영. 뷰포트 390×844.

| 파일 | 무엇을 보여주나 |
|---|---|
| `auth-error-before.png` | 수정 전. 실패 아이콘의 `stroke`가 미정의 `var(--danger)`라 계산값이 `none` — **아이콘이 아예 그려지지 않는다.** 자리만 비어 있다 |
| `auth-error-after.png` | `var(--error)`로 바꾼 뒤. 계산값 `rgb(200,30,30)` — 빨간 ⊗가 보인다. 다만 `.stack`이 flex column이라 아이콘만 왼쪽에 붙는다 |
| `auth-error-fixed-centered.png` | `.auth-status { align-items: center }` 적용 후 최종 상태 |
| `login-no-regression.png` | `.auth-card`를 공유하는 로그인 화면. 전폭 폼 레이아웃 정상 (범위를 콜백 전용 클래스로 좁힌 근거) |
| `notfound-no-regression.png` | 404 화면 정상 |

재현:
```bash
cd frontend && npm run build && npx vite preview --port 4318 --host 127.0.0.1
# 브라우저에서 /auth/callback?error=access_denied&error_description=test
```
