import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PushSubscriptionEntity } from '../persistence/typeorm/push-subscription.entity';

export const EXPO_PUSH_SERVICE = Symbol('EXPO_PUSH_SERVICE');

export interface IExpoPushService {
  sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<number>;
}

@Injectable()
export class ExpoPushService implements IExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor(
    @Optional()
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptionRepo?: Repository<PushSubscriptionEntity>,
  ) {
    this.expo = new Expo();
    this.logger.log('Expo Push Service initialized');
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<number> {
    if (!this.subscriptionRepo) return 0;

    const subscriptions = await this.subscriptionRepo.find({
      where: { userId, platform: 'expo' },
    });

    if (subscriptions.length === 0) return 0;

    const messages: ExpoPushMessage[] = [];
    for (const sub of subscriptions) {
      if (!Expo.isExpoPushToken(sub.endpoint)) {
        this.logger.warn(`Invalid Expo push token: ${String(sub.endpoint).substring(0, 12)}***, removing`);
        await this.subscriptionRepo.delete(sub.id);
        continue;
      }

      messages.push({
        to: sub.endpoint,
        sound: 'default',
        title,
        body,
        data: data || {},
      });
    }

    if (messages.length === 0) return 0;

    const chunks = this.expo.chunkPushNotifications(messages);
    let sent = 0;

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] =
          await this.expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'ok') {
            sent++;
          } else if (ticket.status === 'error') {
            if (ticket.details?.error === 'DeviceNotRegistered') {
              const token = (chunk[i] as ExpoPushMessage).to as string;
              await this.removeExpiredToken(token);
            } else {
              this.logger.warn(
                `Expo push error: ${ticket.details?.error} - ${ticket.message}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Expo push chunk send failed: ${error}`);
      }
    }

    if (sent > 0) {
      this.logger.debug(`Sent ${sent} Expo push notification(s) to user ${userId}`);
    }

    return sent;
  }

  private async removeExpiredToken(token: string): Promise<void> {
    if (!this.subscriptionRepo) return;
    try {
      await this.subscriptionRepo.delete({ endpoint: token, platform: 'expo' });
      this.logger.debug(`Removed expired Expo token: ${token.substring(0, 12)}***`);
    } catch (error) {
      this.logger.warn(`Failed to remove expired token: ${error}`);
    }
  }
}

@Injectable()
export class NoopExpoPushService implements IExpoPushService {
  async sendToUser(): Promise<number> {
    return 0;
  }
}
