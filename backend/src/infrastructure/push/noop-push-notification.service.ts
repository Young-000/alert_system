import { IPushNotificationService, PushSubscription } from './push-notification.service';

export class NoopPushNotificationService implements IPushNotificationService {
  async sendNotification(_subscription: PushSubscription, _payload: string): Promise<void> {
    return;
  }
}
