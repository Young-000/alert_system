import { Inject } from '@nestjs/common';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { SubwayStation } from '@domain/entities/subway-station.entity';

export class SearchSubwayStationsUseCase {
  constructor(
    @Inject('ISubwayStationRepository')
    private subwayStationRepository: ISubwayStationRepository
  ) {}

  async execute(query: string, limit = 20): Promise<SubwayStation[]> {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return [];
    }
    return this.subwayStationRepository.searchByName(normalized, limit);
  }
}
