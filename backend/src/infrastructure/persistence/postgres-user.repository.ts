import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './typeorm/user.entity';
import { User, UserLocation } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

export class PostgresUserRepository implements IUserRepository {
  private repository: Repository<UserEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity);
  }

  async save(user: User): Promise<void> {
    const entity = this.toEntity(user);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<User | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : undefined;
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.name = user.name;
    entity.location = user.location;
    return entity;
  }

  private toDomain(entity: UserEntity): User {
    return new User(
      entity.email,
      entity.name,
      entity.passwordHash,
      entity.location as UserLocation | undefined,
      entity.id,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
