import { getActiveRoute } from './route-utils';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';

function buildRoute(overrides: Partial<RouteResponse> = {}): RouteResponse {
  return {
    id: 'route-1',
    userId: 'user-1',
    name: 'Test Route',
    routeType: 'morning',
    isPreferred: false,
    totalExpectedDuration: 60,
    totalTransferTime: 10,
    pureMovementTime: 50,
    checkpoints: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getActiveRoute', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for empty array', () => {
    expect(getActiveRoute([])).toBeNull();
  });

  it('returns the single route when only one exists', () => {
    const route = buildRoute();
    expect(getActiveRoute([route])).toBe(route);
  });

  it('returns preferred morning route in the morning', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 8, 0)); // 8 AM
    const morning = buildRoute({ id: 'morning', routeType: 'morning', isPreferred: true });
    const evening = buildRoute({ id: 'evening', routeType: 'evening', isPreferred: true });
    expect(getActiveRoute([evening, morning])).toBe(morning);
  });

  it('returns preferred evening route in the evening', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 18, 0)); // 6 PM
    const morning = buildRoute({ id: 'morning', routeType: 'morning', isPreferred: true });
    const evening = buildRoute({ id: 'evening', routeType: 'evening', isPreferred: true });
    expect(getActiveRoute([morning, evening])).toBe(evening);
  });

  it('returns morning type when forceType is "morning"', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 18, 0)); // evening time
    const morning = buildRoute({ id: 'morning', routeType: 'morning' });
    const evening = buildRoute({ id: 'evening', routeType: 'evening' });
    expect(getActiveRoute([morning, evening], 'morning')).toBe(morning);
  });

  it('returns evening type when forceType is "evening"', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 8, 0)); // morning time
    const morning = buildRoute({ id: 'morning', routeType: 'morning' });
    const evening = buildRoute({ id: 'evening', routeType: 'evening' });
    expect(getActiveRoute([morning, evening], 'evening')).toBe(evening);
  });

  it('auto mode selects morning route when hour < 14', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 10, 0));
    const morning = buildRoute({ id: 'morning', routeType: 'morning' });
    const evening = buildRoute({ id: 'evening', routeType: 'evening' });
    expect(getActiveRoute([morning, evening], 'auto')).toBe(morning);
  });

  it('auto mode selects evening route when hour >= 14', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 14, 0));
    const morning = buildRoute({ id: 'morning', routeType: 'morning' });
    const evening = buildRoute({ id: 'evening', routeType: 'evening' });
    expect(getActiveRoute([morning, evening], 'auto')).toBe(evening);
  });

  it('falls back to type match when no preferred route exists', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 8, 0));
    const morning = buildRoute({ id: 'morning', routeType: 'morning', isPreferred: false });
    const evening = buildRoute({ id: 'evening', routeType: 'evening', isPreferred: false });
    expect(getActiveRoute([evening, morning])).toBe(morning);
  });

  it('falls back to first route when no type matches', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 8, 0)); // morning
    const evening1 = buildRoute({ id: 'evening1', routeType: 'evening' });
    const evening2 = buildRoute({ id: 'evening2', routeType: 'evening' });
    expect(getActiveRoute([evening1, evening2])).toBe(evening1);
  });
});
