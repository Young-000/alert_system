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
} as const;
