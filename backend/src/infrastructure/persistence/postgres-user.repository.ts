import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './typeorm/user.entity';
import { User, UserLocation } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  private repository: Repository<UserEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity);
  }

  async save(user: User): Promise<User> {
    const entity = this.toEntity(user);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<User | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByGoogleId(googleId: string): Promise<User | undefined> {
    const entity = await this.repository.findOne({ where: { googleId } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async updateGoogleId(userId: string, googleId: string): Promise<void> {
    await this.repository.update(userId, { googleId });
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.name = user.name;
    entity.phoneNumber = user.phoneNumber;
    entity.googleId = user.googleId;
    entity.location = user.location;
    return entity;
  }

  private toDomain(entity: UserEntity): User {
    return new User(
      entity.email,
      entity.name,
      entity.phoneNumber,
      entity.passwordHash,
      entity.location as UserLocation | undefined,
      entity.googleId,
      entity.id,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
