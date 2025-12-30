import { DataSource, Repository } from 'typeorm';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { PushSubscription } from '@infrastructure/push/push-notification.service';

export class PostgresPushSubscriptionRepository implements IPushSubscriptionRepository {
  private repository: Repository<PushSubscriptionEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(PushSubscriptionEntity);
  }

  async save(userId: string, subscription: PushSubscription): Promise<void> {
    const entity = new PushSubscriptionEntity();
    entity.userId = userId;
    entity.endpoint = subscription.endpoint;
    entity.keys = subscription.keys;
    await this.repository.save(entity);
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const entities = await this.repository.find({ where: { userId } });
    return entities.map((entity) => ({
      endpoint: entity.endpoint,
      keys: entity.keys,
    }));
  }

  async delete(userId: string, endpoint: string): Promise<void> {
    await this.repository.delete({ userId, endpoint });
  }
}
