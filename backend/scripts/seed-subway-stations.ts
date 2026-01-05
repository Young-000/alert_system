import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { buildDataSourceOptions } from '../src/infrastructure/persistence/database.config';
import { PostgresSubwayStationRepository } from '../src/infrastructure/persistence/postgres-subway-station.repository';
import { SubwayStation } from '../src/domain/entities/subway-station.entity';

dotenv.config();

interface SeoulApiStation {
  STATION_CD: string;
  STATION_NM: string;
  LINE_NUM: string;
  FR_CODE: string;
}

interface SeoulApiResponse {
  SearchSTNBySubwayLineInfo: {
    list_total_count: number;
    RESULT: { CODE: string; MESSAGE: string };
    row: SeoulApiStation[];
  };
}

async function fetchStationsFromApi(): Promise<SubwayStation[]> {
  const apiKey = process.env.SUBWAY_API_KEY;
  if (!apiKey) {
    throw new Error('SUBWAY_API_KEY is not set in .env');
  }

  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/SearchSTNBySubwayLineInfo/1/1000/`;
  console.log('Fetching stations from Seoul Open Data API...');

  const response = await axios.get<SeoulApiResponse>(url);
  const data = response.data.SearchSTNBySubwayLineInfo;

  if (data.RESULT.CODE !== 'INFO-000') {
    throw new Error(`API Error: ${data.RESULT.MESSAGE}`);
  }

  console.log(`Found ${data.list_total_count} stations`);

  // Remove duplicates (same station name + line)
  const seen = new Set<string>();
  const stations: SubwayStation[] = [];

  for (const row of data.row) {
    const key = `${row.STATION_NM}-${row.LINE_NUM}`;
    if (!seen.has(key)) {
      seen.add(key);
      stations.push(
        new SubwayStation(row.STATION_NM, row.LINE_NUM, row.STATION_CD),
      );
    }
  }

  return stations;
}

async function seed() {
  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();

  const repository = new PostgresSubwayStationRepository(dataSource);

  // Fetch stations from API
  const stations = await fetchStationsFromApi();

  // Upsert stations (no clear needed due to FK constraints)
  await repository.saveMany(stations);

  await dataSource.destroy();
  console.log(`Seeded ${stations.length} subway stations from API`);
}

seed().catch((error) => {
  console.error('Failed to seed subway stations:', error);
  process.exit(1);
});
