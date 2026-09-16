/**
 * "경로를 등록하세요"라고 권하는 CTA가 보낼 화면을 한 곳에서 정한다.
 *
 * 경로 생성 폼(`RouteFormModal`)을 여는 코드는 앱 전체에서 `app/(tabs)/commute.tsx`
 * 한 곳뿐이다(`handleOpenCreate`). 설정 탭에는 생성 수단이 **없다** —
 * 프로필 카드 · 바로가기 · 자동 감지 · 스마트 출발 · 푸시 · 앱 정보 · 로그아웃이고,
 * 경로는 바로가기의 "경로 관리"를 다시 찾아 눌러야 나온다.
 *
 * 그런데 홈의 빈 상태 카드는 `/settings`로 보내고 있었다
 * (`components/home/EmptyRouteCard.tsx` — 주석도 "routes/settings tab"이라고
 * 갈피를 못 잡았다). 같은 상황의 다른 CTA는 이미 제대로 가 있어서, 한 앱 안에서
 * 같은 요구가 두 곳으로 갈렸다:
 *
 *   app/smart-departure.tsx  "경로 설정하기"  → /(tabs)/commute   ← 맞음
 *   components/home/...      "경로 등록하기"  → /settings         ← 틀림
 *
 * 웹도 같은 카드를 같은 문구로 쓰면서 생성이 있는 화면으로 보낸다
 * (`frontend/.../home/CommuteSection.tsx:182-184` — "출근 경로를 등록해보세요" +
 * `<Link to="/routes">`). 웹의 `/routes`에 해당하는 모바일 화면이 경로 탭이다
 * (`components/settings/QuickLinksSection.tsx:41-45` — "경로 관리" → `/(tabs)/commute`).
 *
 * 도착지를 상수로 묶어 두 CTA가 다시 갈리지 않게 한다.
 */
export const ROUTE_SETUP_PATH = '/(tabs)/commute';
