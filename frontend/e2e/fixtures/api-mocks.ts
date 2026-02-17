import type { Page, Route } from '@playwright/test';

// ─── Mock Data ───────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  phoneNumber: '01012345678',
  location: { lat: 37.5665, lng: 126.978 },
};

export const MOCK_TOKEN = 'mock-jwt-token-for-e2e';

export const MOCK_WEATHER = {
  location: 'Seoul',
  temperature: 15,
  condition: 'Clear',
  conditionKr: '맑음',
  conditionEmoji: '',
  humidity: 45,
  windSpeed: 3.2,
  feelsLike: 13,
  forecast: {
    maxTemp: 18,
    minTemp: 8,
    hourlyForecasts: [],
  },
};

export const MOCK_AIR_QUALITY = {
  pm10: 35,
  pm25: 18,
  grade: 1,
  station: 'mock-station',
};

export const MOCK_ROUTES = [
  {
    id: 'route-1',
    userId: 'test-user-id',
    name: '출근 경로',
    routeType: 'morning',
    isPreferred: true,
    totalExpectedDuration: 35,
    totalTransferTime: 0,
    pureMovementTime: 30,
    checkpoints: [
      {
        id: 'cp-1',
        name: '집',
        sequenceOrder: 1,
        checkpointType: 'home',
        expectedWaitTime: 0,
        expectedDurationToNext: 10,
        transportMode: 'walk',
        totalExpectedTime: 0,
        isTransferRelated: false,
      },
      {
        id: 'cp-2',
        name: '강남역',
        sequenceOrder: 2,
        checkpointType: 'subway',
        linkedStationId: 'station-1',
        lineInfo: '2호선',
        expectedWaitTime: 5,
        expectedDurationToNext: 20,
        transportMode: 'subway',
        totalExpectedTime: 15,
        isTransferRelated: false,
      },
      {
        id: 'cp-3',
        name: '회사',
        sequenceOrder: 3,
        checkpointType: 'work',
        expectedWaitTime: 0,
        totalExpectedTime: 35,
        isTransferRelated: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'route-2',
    userId: 'test-user-id',
    name: '퇴근 경로',
    routeType: 'evening',
    isPreferred: false,
    totalExpectedDuration: 35,
    totalTransferTime: 0,
    pureMovementTime: 30,
    checkpoints: [
      {
        id: 'cp-4',
        name: '회사',
        sequenceOrder: 1,
        checkpointType: 'work',
        expectedWaitTime: 0,
        expectedDurationToNext: 20,
        transportMode: 'subway',
        totalExpectedTime: 0,
        isTransferRelated: false,
      },
      {
        id: 'cp-5',
        name: '강남역',
        sequenceOrder: 2,
        checkpointType: 'subway',
        linkedStationId: 'station-1',
        lineInfo: '2호선',
        expectedWaitTime: 5,
        expectedDurationToNext: 10,
        transportMode: 'walk',
        totalExpectedTime: 25,
        isTransferRelated: false,
      },
      {
        id: 'cp-6',
        name: '집',
        sequenceOrder: 3,
        checkpointType: 'home',
        expectedWaitTime: 0,
        totalExpectedTime: 35,
        isTransferRelated: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export const MOCK_ALERTS = [
  {
    id: 'alert-1',
    userId: 'test-user-id',
    name: '아침 날씨 알림',
    schedule: '0 7 * * *',
    alertTypes: ['weather', 'airQuality'],
    enabled: true,
    routeId: 'route-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'alert-2',
    userId: 'test-user-id',
    name: '교통 알림',
    schedule: '30 7 * * *',
    alertTypes: ['subway'],
    subwayStationId: 'station-1',
    enabled: false,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

export const MOCK_COMMUTE_STATS = {
  userId: 'test-user-id',
  totalSessions: 20,
  recentSessions: 5,
  overallAverageDuration: 32,
  overallAverageWaitTime: 5,
  overallAverageDelay: 2,
  waitTimePercentage: 15,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [],
  insights: [],
};

export const MOCK_STREAK = {
  userId: 'test-user-id',
  currentStreak: 5,
  bestStreak: 12,
  lastRecordDate: '2026-02-17',
  streakStartDate: '2026-02-13',
  weeklyGoal: 5,
  weeklyCount: 3,
  weekStartDate: '2026-02-10',
  milestonesAchieved: [],
  latestMilestone: null,
  nextMilestone: null,
  streakStatus: 'active',
  excludeWeekends: true,
  reminderEnabled: false,
  todayRecorded: false,
};

export const MOCK_WEEKLY_REPORT = {
  weekStartDate: '2026-02-10',
  weekEndDate: '2026-02-16',
  weekLabel: '2월 2주차',
  totalSessions: 5,
  totalRecordedDays: 5,
  averageDuration: 33,
  minDuration: 28,
  maxDuration: 38,
  dailyStats: [],
  bestDay: null,
  worstDay: null,
  previousWeekAverage: null,
  changeFromPrevious: null,
  changePercentage: null,
  trend: null,
  insights: [],
  streakWeeklyCount: 3,
  streakWeeklyGoal: 5,
};

export const MOCK_NOTIFICATION_LOGS = {
  items: [
    {
      id: 'log-1',
      alertId: 'alert-1',
      alertName: '아침 날씨 알림',
      alertTypes: ['weather', 'airQuality'],
      status: 'success',
      summary: '서울 15도, 맑음',
      sentAt: '2026-02-17T07:00:00Z',
    },
  ],
  total: 1,
};

export const MOCK_NOTIFICATION_STATS = {
  total: 45,
  success: 43,
  fallback: 1,
  failed: 1,
  successRate: 95.5,
};

export const MOCK_SESSION_IN_PROGRESS = {
  id: 'session-1',
  userId: 'test-user-id',
  routeId: 'route-1',
  status: 'in_progress',
  startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  checkpointRecords: [],
};

// ─── Mock Helpers ────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Parameters<Route['fulfill']>[0] {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

/**
 * Intercept all API routes with mock responses.
 * Uses a catch-all approach: intercept all requests to the API base URL.
 *
 * Actual API endpoints (from the API clients):
 * - /auth/login, /auth/register, /auth/google/status
 * - /alerts/user/{userId}, /alerts, /alerts/{id}, /alerts/{id}/toggle
 * - /routes/user/{userId}, /routes/{id}
 * - /commute/start, /commute/in-progress/{userId}, /commute/streak/{userId}
 * - /commute/stats/{userId}, /commute/weekly-report/{userId}
 * - /weather/current
 * - /air-quality/**
 * - /subway/stations/search, /subway/arrivals/**
 * - /bus/stops/search, /bus/arrivals/**
 * - /notifications/history, /notifications/stats
 * - /behavior/**, /analytics/**
 */
export async function mockApiRoutes(page: Page): Promise<void> {
  // Catch-all: intercept ANY request to the API backend and return appropriate mocks
  // The dev backend runs on localhost:3001 (from VITE_API_BASE_URL or env)
  await page.route(/localhost:(3000|3001)/, (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = new URL(url).pathname;

    // ─── Auth ─────────────────────────────────────────
    if (path === '/auth/login' && method === 'POST') {
      return route.fulfill(jsonResponse({
        accessToken: MOCK_TOKEN,
        userId: MOCK_USER.id,
        user: MOCK_USER,
      }));
    }
    if (path === '/auth/register' && method === 'POST') {
      return route.fulfill(jsonResponse({
        accessToken: MOCK_TOKEN,
        userId: MOCK_USER.id,
        user: MOCK_USER,
      }, 201));
    }
    if (path === '/auth/google/status') {
      return route.fulfill(jsonResponse({ enabled: false }));
    }

    // ─── Health ───────────────────────────────────────
    if (path === '/health') {
      return route.fulfill(jsonResponse({ status: 'ok' }));
    }

    // ─── Alerts ───────────────────────────────────────
    if (path.match(/^\/alerts\/user\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_ALERTS));
    }
    if (path.match(/^\/alerts\/[^/]+\/toggle$/) && method === 'PATCH') {
      return route.fulfill(jsonResponse({ ...MOCK_ALERTS[0], enabled: !MOCK_ALERTS[0].enabled }));
    }
    if (path === '/alerts' && method === 'POST') {
      return route.fulfill(jsonResponse({ id: `alert-new-${Date.now()}`, ...MOCK_ALERTS[0] }, 201));
    }
    if (path === '/alerts' && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_ALERTS));
    }
    if (path.match(/^\/alerts\/[^/]+$/) && method === 'DELETE') {
      return route.fulfill(jsonResponse({ success: true }));
    }
    if (path.match(/^\/alerts\/[^/]+$/) && (method === 'PUT' || method === 'PATCH')) {
      return route.fulfill(jsonResponse(MOCK_ALERTS[0]));
    }
    if (path.match(/^\/alerts\/[^/]+$/) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_ALERTS[0]));
    }

    // ─── Routes ───────────────────────────────────────
    if (path.match(/^\/routes\/user\/[^/]+\/recommend/) && method === 'GET') {
      return route.fulfill(jsonResponse(null, 404));
    }
    if (path.match(/^\/routes\/user\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_ROUTES));
    }
    if (path === '/routes' && method === 'POST') {
      return route.fulfill(jsonResponse(MOCK_ROUTES[0], 201));
    }
    if (path.match(/^\/routes\/[^/]+$/) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_ROUTES[0]));
    }
    if (path.match(/^\/routes\/[^/]+$/) && method === 'DELETE') {
      return route.fulfill(jsonResponse({ success: true }));
    }
    if (path.match(/^\/routes\/[^/]+$/) && (method === 'PUT' || method === 'PATCH')) {
      return route.fulfill(jsonResponse(MOCK_ROUTES[0]));
    }

    // ─── Commute ──────────────────────────────────────
    if (path.match(/^\/commute\/in-progress\//) && method === 'GET') {
      return route.fulfill(jsonResponse({ session: null }));
    }
    if (path === '/commute/start' && method === 'POST') {
      return route.fulfill(jsonResponse(MOCK_SESSION_IN_PROGRESS, 201));
    }
    if (path.match(/^\/commute\/stats\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_COMMUTE_STATS));
    }
    if (path.match(/^\/commute\/streak\/[^/]+\/settings/) && method === 'PATCH') {
      return route.fulfill(jsonResponse({ success: true }));
    }
    if (path.match(/^\/commute\/streak\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_STREAK));
    }
    if (path.match(/^\/commute\/weekly-report\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_WEEKLY_REPORT));
    }
    if (path.match(/^\/commute\/history\//) && method === 'GET') {
      return route.fulfill(jsonResponse({ sessions: [], total: 0 }));
    }
    if (path.match(/^\/commute\/session\//) && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_SESSION_IN_PROGRESS));
    }
    if (path.match(/^\/commute\/cancel\//) && method === 'POST') {
      return route.fulfill(jsonResponse({ success: true }));
    }
    if (path === '/commute/complete' && method === 'POST') {
      return route.fulfill(jsonResponse({ ...MOCK_SESSION_IN_PROGRESS, status: 'completed' }));
    }
    if (path === '/commute/checkpoint' && method === 'POST') {
      return route.fulfill(jsonResponse(MOCK_SESSION_IN_PROGRESS));
    }

    // ─── Weather ──────────────────────────────────────
    if (path.startsWith('/weather/')) {
      return route.fulfill(jsonResponse(MOCK_WEATHER));
    }

    // ─── Air Quality ──────────────────────────────────
    if (path.startsWith('/air-quality/')) {
      return route.fulfill(jsonResponse(MOCK_AIR_QUALITY));
    }

    // ─── Subway ───────────────────────────────────────
    if (path.startsWith('/subway/')) {
      if (path.includes('search')) {
        return route.fulfill(jsonResponse([
          { id: 'station-1', name: '강남역', line: '2호선' },
        ]));
      }
      return route.fulfill(jsonResponse([]));
    }

    // ─── Bus ──────────────────────────────────────────
    if (path.startsWith('/bus/')) {
      if (path.includes('search')) {
        return route.fulfill(jsonResponse([
          { id: 'bus-stop-1', name: '강남역', arsId: '22001' },
        ]));
      }
      return route.fulfill(jsonResponse([]));
    }

    // ─── Notifications ───────────────────────────────
    if (path === '/notifications/history') {
      return route.fulfill(jsonResponse(MOCK_NOTIFICATION_LOGS));
    }
    if (path === '/notifications/stats') {
      return route.fulfill(jsonResponse(MOCK_NOTIFICATION_STATS));
    }
    if (path.startsWith('/notifications/')) {
      return route.fulfill(jsonResponse([]));
    }

    // ─── Users ────────────────────────────────────────
    if (path.startsWith('/users/') && method === 'GET') {
      return route.fulfill(jsonResponse(MOCK_USER));
    }

    // ─── Behavior / Analytics ─────────────────────────
    if (path.startsWith('/behavior/')) {
      return route.fulfill(jsonResponse(null, 404));
    }
    if (path.startsWith('/analytics/')) {
      return route.fulfill(jsonResponse([]));
    }

    // ─── Push subscriptions ───────────────────────────
    if (path.startsWith('/push-subscriptions/')) {
      return route.fulfill(jsonResponse({ subscribed: false }));
    }

    // ─── Milestones ───────────────────────────────────
    if (path.match(/^\/commute\/milestones\//)) {
      return route.fulfill(jsonResponse({ milestones: [], total: 0 }));
    }

    // ─── Fallback: return empty JSON ─────────────────
    return route.fulfill(jsonResponse({}));
  });
}

/**
 * Set up localStorage to simulate an authenticated user.
 */
export async function mockAuthenticatedUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('userId', 'test-user-id');
    localStorage.setItem('accessToken', 'mock-jwt-token-for-e2e');
    localStorage.setItem('userName', 'Test User');
    localStorage.setItem('phoneNumber', '01012345678');
  });
}

/**
 * Ensure localStorage has no auth data (guest/unauthenticated).
 */
export async function mockUnauthenticatedUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('phoneNumber');
  });
}

/**
 * Override a specific API route with a custom response.
 * Must be called AFTER mockApiRoutes to take priority.
 */
export async function mockApiRoute(
  page: Page,
  urlPattern: string | RegExp,
  response: unknown,
  status = 200,
): Promise<void> {
  await page.route(urlPattern, (route) =>
    route.fulfill(jsonResponse(response, status)),
  );
}

/**
 * Override the alerts endpoint for a specific user to return a custom response.
 */
export async function mockAlertsResponse(
  page: Page,
  alerts: unknown[],
): Promise<void> {
  await page.route(/\/alerts\/user\//, (route) =>
    route.fulfill(jsonResponse(alerts)),
  );
}
