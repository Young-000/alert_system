import { AlternativeMapping } from '@domain/entities/alternative-mapping.entity';

export interface IAlternativeMappingRepository {
  findAll(): Promise<AlternativeMapping[]>;
  findActive(): Promise<AlternativeMapping[]>;
  findByStationAndLine(stationName: string, line: string): Promise<AlternativeMapping[]>;
  findById(id: string): Promise<AlternativeMapping | undefined>;
  save(mapping: AlternativeMapping): Promise<AlternativeMapping>;
}

export const ALTERNATIVE_MAPPING_REPOSITORY = Symbol('IAlternativeMappingRepository');
