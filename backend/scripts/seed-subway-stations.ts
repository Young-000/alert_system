import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/infrastructure/persistence/database.config';
import { PostgresSubwayStationRepository } from '../src/infrastructure/persistence/postgres-subway-station.repository';
import { subwayStationsSeed } from '../src/infrastructure/persistence/seed/subway-stations.data';

dotenv.config();

async function seed() {
  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();

  const repository = new PostgresSubwayStationRepository(dataSource);
  await repository.saveMany(subwayStationsSeed);

  await dataSource.destroy();
  console.log('Seeded subway stations:', subwayStationsSeed.length);
}

seed().catch((error) => {
  console.error('Failed to seed subway stations:', error);
  process.exit(1);
});
