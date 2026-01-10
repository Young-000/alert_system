import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { PushSubscription } from '@domain/entities/push-subscription.entity';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';

@Injectable()
export class PostgresPushSubscriptionRepository implements IPushSubscriptionRepository {
  private repository: Repository<PushSubscriptionEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.repository = dataSource.getRepository(PushSubscriptionEntity);
  }

  async save(subscription: PushSubscription): Promise<void> {
    await this.repository.upsert(
      {
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      ['endpoint']
    );
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const entities = await this.repository.find({ where: { userId } });
    return entities.map(
      (entity) => new PushSubscription(entity.userId, entity.endpoint, entity.keys, entity.id)
    );
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.repository.delete({ endpoint });
  }
}
