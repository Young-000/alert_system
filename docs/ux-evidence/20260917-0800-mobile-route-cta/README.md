# 모바일 홈 "경로 등록하기" 도착지 — 2026-09-17 08:00 라운드

## 무엇이 틀렸나

홈의 빈 상태 카드(`EmptyRouteCard`)가 "출근 경로를 등록해보세요 / **경로 등록하기**"를
띄우고 `/settings`로 보냈다. 설정 탭에는 경로를 만드는 수단이 없다 —
프로필 · 바로가기 · 자동 감지 · 스마트 출발 · 푸시 · 앱 정보 · 로그아웃뿐이고,
경로 생성 폼(`RouteFormModal`)을 여는 코드는 앱 전체에서 `app/(tabs)/commute.tsx`
한 곳이다. 사용자는 설정 탭에서 "경로 관리"를 다시 찾아 눌러야 했다.

## 실화면 캡처를 남기지 못한 이유

이 변경은 **React Native(Expo) 화면**이다. 이 환경에서는 시뮬레이터를 띄울 수 없다:

```
$ xcrun simctl list devices available
CoreSimulatorService connection became invalid. Simulator services will no longer be available.
WARN : Unable to discover any Simulator runtimes.
```

RN 컴포넌트를 렌더하는 테스트 수단도 아직 없다(`mobile/vitest.config.ts` — 순수 로직만,
"필요해지면 jest-expo를 붙인다"가 미결 결정으로 남아 있다). 그래서 **안 본 화면을
봤다고 쓰지 않는다.** 대신 이 라운드가 가진 증거는 아래 둘이다.

## 증거 1 — 리포 안의 정답지 두 개

같은 상황에서 어디로 보내야 하는지는 이 리포가 이미 두 번 답해 뒀다.

| 자리 | 문구 | 도착지 |
|---|---|---|
| `mobile/app/smart-departure.tsx:264` | "경로 설정하기" | `/(tabs)/commute` ✅ |
| `frontend/src/presentation/pages/home/CommuteSection.tsx:182-184` | "출근 경로를 등록해보세요" + "경로 등록하기" | `/routes` ✅ |
| `mobile/src/components/home/EmptyRouteCard.tsx:12` (수정 전) | "경로 등록하기" | `/settings` ❌ |

웹의 `/routes`에 해당하는 모바일 화면이 경로 탭이다
(`QuickLinksSection.tsx:41-45` — "경로 관리" → `/(tabs)/commute`).

## 증거 2 — Red → Green

```
Red    3 failed | 3 passed (6)
       ● 홈 빈 상태 카드는 공유 상수를 쓴다
       ● 스마트 출발 빈 상태는 공유 상수를 쓴다
       ● 홈 빈 상태 카드는 설정 탭으로 보내지 않는다
           expect(readSource(path)).not.toContain("'/settings'")

Green  6 passed (6)   ·   mobile 전체 87 passed / 11 files  (81/10 → 87/11)
```

테스트가 소스를 읽는 형태인 이유: 위와 같이 RN 렌더 수단이 없다. 이 축의 결함은
"같은 상황의 두 CTA가 서로 다른 곳으로 보낸다"였으므로, 도착지가 한 상수에서
나오는지를 검사하면 같은 갈림이 다시 생기는 것을 막는다.
