import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROUTE_SETUP_PATH } from './route-cta';

function readSource(relativePath: string): string {
  // `.href`를 넘긴다 — node:url 의 URL 타입과 DOM 의 URL 타입이 달라서
  // 객체를 그대로 넘기면 tsc 가 거절한다(`vitest.config.ts`도 같은 형태).
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url).href), 'utf8');
}

describe('ROUTE_SETUP_PATH', () => {
  it('경로를 만들 수 있는 화면을 가리킨다', () => {
    // 경로 생성 폼(`RouteFormModal`)을 여는 코드는 앱 전체에서
    // `app/(tabs)/commute.tsx` 한 곳뿐이다.
    expect(ROUTE_SETUP_PATH).toBe('/(tabs)/commute');
  });

  it('설정 탭을 가리키지 않는다', () => {
    // 설정 탭에는 경로 생성 수단이 없다 — 바로가기 목록에서 "경로 관리"를
    // 다시 찾아 눌러야 한다.
    expect(ROUTE_SETUP_PATH).not.toBe('/settings');
  });
});

describe('경로 등록을 권하는 CTA', () => {
  // RN 컴포넌트를 렌더할 수단이 없으므로(`vitest.config.ts` — 순수 로직만),
  // 도착지가 한 곳에서 나오는지를 소스에서 확인한다. 이 축의 결함은
  // "같은 상황의 두 CTA가 서로 다른 곳으로 보낸다"였다.
  const ctaSources = [
    ['홈 빈 상태 카드', '../components/home/EmptyRouteCard.tsx'],
    ['스마트 출발 빈 상태', '../../app/smart-departure.tsx'],
  ] as const;

  it.each(ctaSources)('%s는 공유 상수를 쓴다', (_label, path) => {
    expect(readSource(path)).toContain('ROUTE_SETUP_PATH');
  });

  it.each(ctaSources)('%s는 설정 탭으로 보내지 않는다', (_label, path) => {
    expect(readSource(path)).not.toContain("'/settings'");
  });
});
