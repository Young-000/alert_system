import { SubwayStation } from '@domain/entities/subway-station.entity';

export interface ISubwayStationRepository {
  findById(id: string): Promise<SubwayStation | undefined>;
  searchByName(query: string, limit: number): Promise<SubwayStation[]>;
  saveMany(stations: SubwayStation[]): Promise<void>;
}
