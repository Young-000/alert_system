# /commute 진입 실패 시 도착지 — 2026-09-17 auto-review

트래킹을 시작할 수 없는 상태로 `/commute` 에 들어왔을 때 어디로 보내는지를 바꿨다.
`navigate('/', …)` → `navigate('/routes', …)` (`CommuteTrackingPage.tsx` 두 분기).

## 캡처 방법

`vite preview --host 127.0.0.1 --port 4317` + Playwright(390×844, DPR 2).
`localStorage.userId` 를 심어 로그인 상태를 만들고, API 는 전부 스텁으로 응답했다
(경로 1건 · 통계/기록 0건 · 진행 중 세션 없음).

## 화면

| 파일 | 무엇 |
|---|---|
| `01-dashboard-empty-cta.png` | 통근 통계 빈 상태. 이 CTA("트래킹 시작하기")가 `/commute` 로 보낸다 |
| `02-after-cta-click.png` | **수정 후** — 그 CTA 를 실제로 눌렀을 때. 경로 화면 + ▶(시작)·+새 경로 |
| `02-commute-fallback.png` | **수정 후** — `/commute` 직접 진입(경로 미지정)도 같은 곳으로 |

## 수정 전 동작 — URL 로그가 증거

같은 스크립트를 한 줄만 되돌린 빌드에서 돌린 결과다.

```
수정 전:  url after CTA click: http://127.0.0.1:4317/
수정 후:  url after CTA click: http://127.0.0.1:4317/routes
```

> 수정 전 화면 이미지는 남기지 않았다. 스텁이 모든 엔드포인트에 `[]` 를 돌려주는 탓에
> 홈이 ErrorBoundary 로 떨어졌는데, 그건 **캡처 환경의 산물이지 제품 상태가 아니다.**
> 여기서 증거로 쓸 수 있는 것은 도착지(URL)뿐이라 그것만 적는다.
