import { DataSource, Repository } from 'typeorm';
import { SubwayStationEntity } from './typeorm/subway-station.entity';
import { SubwayStation } from '@domain/entities/subway-station.entity';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';

export class PostgresSubwayStationRepository implements ISubwayStationRepository {
  private repository: Repository<SubwayStationEntity>;

  constructor(private dataSource: DataSource) {
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

    const entities = await this.repository
      .createQueryBuilder('station')
      .where('station.name ILIKE :name', { name: `%${normalized}%` })
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
