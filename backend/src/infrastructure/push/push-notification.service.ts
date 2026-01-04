import * as webpush from 'web-push';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IPushNotificationService {
  sendNotification(subscription: PushSubscription, payload: string): Promise<void>;
}

export class PushNotificationService implements IPushNotificationService {
  constructor(private publicKey: string, private privateKey: string, private subject: string) {
    webpush.setVapidDetails(this.subject, publicKey, privateKey);
  }

  async sendNotification(subscription: PushSubscription, payload: string): Promise<void> {
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (error) {
      throw new Error(`Failed to send push notification: ${error}`);
    }
  }
}
