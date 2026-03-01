export const queryKeys = {
  alerts: {
    all: ['alerts'] as const,
    byUser: (userId: string) => ['alerts', 'user', userId] as const,
  },
  routes: {
    all: ['routes'] as const,
    byUser: (userId: string) => ['routes', 'user', userId] as const,
  },
  weather: {
    all: ['weather'] as const,
    current: (lat: number, lng: number) => ['weather', 'current', lat, lng] as const,
  },
  airQuality: {
    all: ['airQuality'] as const,
    byLocation: (lat: number, lng: number) => ['airQuality', lat, lng] as const,
  },
  commuteStats: {
    all: ['commuteStats'] as const,
    byUser: (userId: string, days: number) => ['commuteStats', userId, days] as const,
  },
  transit: {
    all: ['transit'] as const,
    byRoute: (routeId: string) => ['transit', 'route', routeId] as const,
  },
  streak: {
    all: ['streak'] as const,
    byUser: (userId: string) => ['streak', 'user', userId] as const,
    milestones: (userId: string) => ['streak', 'milestones', userId] as const,
  },
  weeklyReport: {
    all: ['weeklyReport'] as const,
    byUser: (userId: string, weekOffset: number) =>
      ['weeklyReport', userId, weekOffset] as const,
  },
  places: {
    all: ['places'] as const,
  },
  smartDeparture: {
    all: ['smartDeparture'] as const,
    settings: ['smartDeparture', 'settings'] as const,
    today: ['smartDeparture', 'today'] as const,
  },
  missions: {
    all: ['missions'] as const,
    daily: ['missions', 'daily'] as const,
    dailyScore: ['missions', 'daily', 'score'] as const,
    weeklyStats: ['missions', 'stats', 'weekly'] as const,
    monthlyStats: ['missions', 'stats', 'monthly'] as const,
    streak: ['missions', 'streak'] as const,
  },
  analyticsSummary: {
    all: ['analyticsSummary'] as const,
    byUser: (userId: string) => ['analyticsSummary', userId] as const,
  },
  behavior: {
    all: ['behavior'] as const,
    prediction: (userId: string) => ['behavior', 'prediction', userId] as const,
    insights: (userId: string) => ['behavior', 'insights', userId] as const,
  },
  briefing: {
    all: ['briefing'] as const,
    byLocation: (lat: number, lng: number) => ['briefing', lat, lng] as const,
  },
  delayStatus: {
    all: ['delayStatus'] as const,
    byRoute: (routeId: string) => ['delayStatus', 'route', routeId] as const,
  },
  congestion: {
    all: ['congestion'] as const,
    segments: (timeSlot?: string) => ['congestion', 'segments', timeSlot ?? 'auto'] as const,
    byRoute: (routeId: string, timeSlot?: string) =>
      ['congestion', 'route', routeId, timeSlot ?? 'auto'] as const,
  },
  insights: {
    all: ['insights'] as const,
    regions: (sortBy?: string) => ['insights', 'regions', sortBy ?? 'default'] as const,
    regionDetail: (regionId: string) => ['insights', 'region', regionId] as const,
    regionTrends: (regionId: string) => ['insights', 'trends', regionId] as const,
    regionPeakHours: (regionId: string) => ['insights', 'peak-hours', regionId] as const,
    myComparison: ['insights', 'me', 'comparison'] as const,
  },
  community: {
    all: ['community'] as const,
    neighbors: (routeId?: string) => ['community', 'neighbors', routeId ?? 'default'] as const,
    tips: (checkpointKey: string, page?: number) =>
      ['community', 'tips', checkpointKey, page ?? 1] as const,
  },
} as const;
