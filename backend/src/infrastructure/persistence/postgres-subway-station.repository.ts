import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SubwayStationEntity } from './typeorm/subway-station.entity';
import { SubwayStation } from '@domain/entities/subway-station.entity';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';

@Injectable()
export class PostgresSubwayStationRepository implements ISubwayStationRepository {
  private repository: Repository<SubwayStationEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SubwayStationEntity);
  }

  async findById(id: string): Promise<SubwayStation | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async searchByName(query: string, limit: number): Promise<SubwayStation[]> {
    const normalized = query.trim();
    if (!normalized) {
      return [];
    }

    const dbType = this.dataSource.options.type;
    const queryBuilder = this.repository.createQueryBuilder('station');

    // ILIKE는 PostgreSQL 전용 문법이다. 나머지 드라이버(sqlite/better-sqlite3/sqljs)는
    // 모두 이식 가능한 LOWER() + LIKE로 처리한다.
    // 화이트리스트가 아니라 postgres만 분기하는 이유: sqljs가 빠져 있어 e2e에서
    // `near "ILIKE": syntax error`로 검색이 통째로 500이 났었다.
    if (dbType === 'postgres') {
      queryBuilder.where('station.name ILIKE :name', {
        name: `%${normalized}%`,
      });
    } else {
      queryBuilder.where('LOWER(station.name) LIKE LOWER(:name)', {
        name: `%${normalized}%`,
      });
    }

    const entities = await queryBuilder
      .orderBy('station.name', 'ASC')
      .limit(limit)
      .getMany();

    return entities.map((entity) => this.toDomain(entity));
  }

  async saveMany(stations: SubwayStation[]): Promise<void> {
    if (stations.length === 0) {
      return;
    }
    const entities = stations.map((station) => this.toEntity(station));
    await this.repository.upsert(entities, ['name', 'line']);
  }

  async clear(): Promise<void> {
    await this.repository.clear();
  }

  private toDomain(entity: SubwayStationEntity): SubwayStation {
    return new SubwayStation(entity.name, entity.line, entity.code, entity.id);
  }

  private toEntity(station: SubwayStation): SubwayStationEntity {
    const entity = new SubwayStationEntity();
    if (station.id) {
      entity.id = station.id;
    }
    entity.name = station.name;
    entity.line = station.line;
    entity.code = station.code;
    return entity;
  }
}
