import { PushSubscription } from '@infrastructure/push/push-notification.service';

export interface IPushSubscriptionRepository {
  save(userId: string, subscription: PushSubscription): Promise<void>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  delete(userId: string, endpoint: string): Promise<void>;
}
