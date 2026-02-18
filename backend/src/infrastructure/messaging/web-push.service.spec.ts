import { WebPushService, NoopWebPushService } from './web-push.service';
import * as webPush from 'web-push';

// web-push 모킹
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const mockSendNotification = webPush.sendNotification as jest.MockedFunction<typeof webPush.sendNotification>;

describe('WebPushService', () => {
  let service: WebPushService;
  let mockSubscriptionRepo: {
    find: jest.Mock;
    delete: jest.Mock;
  };
  const originalEnv = process.env;

  const createSubscription = (id: string, userId: string) => ({
    id,
    userId,
    endpoint: `https://push.example.com/${id}`,
    keys: JSON.stringify({ p256dh: 'test-p256dh', auth: 'test-auth' }),
    createdAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
    };

    mockSubscriptionRepo = {
      find: jest.fn(),
      delete: jest.fn(),
    };

    service = new WebPushService(mockSubscriptionRepo as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendToUser', () => {
    it('사용자의 모든 구독에 푸시를 발송한다', async () => {
      const sub1 = createSubscription('sub-1', 'user-1');
      const sub2 = createSubscription('sub-2', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub1, sub2]);
      mockSendNotification.mockResolvedValue({} as any);

      const sent = await service.sendToUser('user-1', '출근 알림', '오늘 날씨 맑음');

      expect(sent).toBe(2);
      expect(mockSubscriptionRepo.find).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('페이로드에 title, body, url, timestamp를 포함한다', async () => {
      const sub = createSubscription('sub-1', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub]);
      mockSendNotification.mockResolvedValue({} as any);

      await service.sendToUser('user-1', '알림 제목', '알림 내용', '/commute');

      const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string);
      expect(payload.title).toBe('알림 제목');
      expect(payload.body).toBe('알림 내용');
      expect(payload.url).toBe('/commute');
      expect(payload.timestamp).toBeDefined();
    });

    it('URL이 없으면 기본값 /를 사용한다', async () => {
      const sub = createSubscription('sub-1', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub]);
      mockSendNotification.mockResolvedValue({} as any);

      await service.sendToUser('user-1', '제목', '내용');

      const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string);
      expect(payload.url).toBe('/');
    });

    it('구독이 없으면 0을 반환한다', async () => {
      mockSubscriptionRepo.find.mockResolvedValue([]);

      const sent = await service.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('만료된 구독(410)은 삭제한다', async () => {
      const sub = createSubscription('sub-1', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub]);
      mockSendNotification.mockRejectedValue({ statusCode: 410 });

      const sent = await service.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
      expect(mockSubscriptionRepo.delete).toHaveBeenCalledWith('sub-1');
    });

    it('찾을 수 없는 구독(404)도 삭제한다', async () => {
      const sub = createSubscription('sub-1', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub]);
      mockSendNotification.mockRejectedValue({ statusCode: 404 });

      const sent = await service.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
      expect(mockSubscriptionRepo.delete).toHaveBeenCalledWith('sub-1');
    });

    it('다른 에러는 구독을 삭제하지 않고 건너뛴다', async () => {
      const sub = createSubscription('sub-1', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub]);
      mockSendNotification.mockRejectedValue({ statusCode: 500, message: 'Server error' });

      const sent = await service.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
      expect(mockSubscriptionRepo.delete).not.toHaveBeenCalled();
    });

    it('일부 구독 실패해도 나머지를 발송한다', async () => {
      const sub1 = createSubscription('sub-1', 'user-1');
      const sub2 = createSubscription('sub-2', 'user-1');
      mockSubscriptionRepo.find.mockResolvedValue([sub1, sub2]);
      mockSendNotification
        .mockRejectedValueOnce({ statusCode: 410 })  // first fails
        .mockResolvedValueOnce({} as any);            // second succeeds

      const sent = await service.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(1);
      expect(mockSubscriptionRepo.delete).toHaveBeenCalledWith('sub-1');
    });
  });

  describe('VAPID 설정', () => {
    it('VAPID 키가 없으면 비활성화 상태가 된다', async () => {
      process.env.VAPID_PUBLIC_KEY = '';
      process.env.VAPID_PRIVATE_KEY = '';

      const unconfiguredService = new WebPushService(mockSubscriptionRepo as any);

      const sent = await unconfiguredService.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
      expect(mockSubscriptionRepo.find).not.toHaveBeenCalled();
    });

    it('subscriptionRepo가 없으면 0을 반환한다', async () => {
      const serviceWithoutRepo = new WebPushService(undefined);

      const sent = await serviceWithoutRepo.sendToUser('user-1', '제목', '내용');

      expect(sent).toBe(0);
    });
  });
});

describe('NoopWebPushService', () => {
  it('항상 0을 반환한다', async () => {
    const service = new NoopWebPushService();

    const sent = await service.sendToUser();

    expect(sent).toBe(0);
  });
});
