import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webPush from 'web-push';
import { PushSubscriptionEntity } from '../persistence/typeorm/push-subscription.entity';

export const WEB_PUSH_SERVICE = Symbol('WEB_PUSH_SERVICE');

export interface IWebPushService {
  sendToUser(userId: string, title: string, body: string, url?: string): Promise<number>;
}

@Injectable()
export class WebPushService implements IWebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly isConfigured: boolean;

  constructor(
    @Optional()
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptionRepo?: Repository<PushSubscriptionEntity>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';

    if (publicKey && privateKey) {
      webPush.setVapidDetails(
        'mailto:alert@commute-mate.app',
        publicKey,
        privateKey,
      );
      this.isConfigured = true;
      this.logger.log('Web Push configured');
    } else {
      this.isConfigured = false;
      this.logger.warn('VAPID keys not configured - web push disabled');
    }
  }

  async sendToUser(userId: string, title: string, body: string, url?: string): Promise<number> {
    if (!this.isConfigured || !this.subscriptionRepo) return 0;

    const subscriptions = await this.subscriptionRepo.find({ where: { userId } });
    if (subscriptions.length === 0) return 0;

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent++;
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await this.subscriptionRepo.delete(sub.id);
          this.logger.debug(`Removed expired subscription ${sub.id}`);
        } else {
          this.logger.warn(`Push send failed: ${error}`);
        }
      }
    }

    return sent;
  }
}

@Injectable()
export class NoopWebPushService implements IWebPushService {
  async sendToUser(): Promise<number> {
    return 0;
  }
}
