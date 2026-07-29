/**
 * Schema drift check (read-only).
 *
 * TypeORM 엔티티 정의와 실제 DB 스키마의 차이를 "실행하지 않고" 출력한다.
 * synchronize를 켜지 않고 schemaBuilder.log()만 호출하므로 DB는 변경되지 않는다.
 *
 * 사용: npx ts-node -r dotenv/config -r tsconfig-paths/register scripts/check-schema-drift.ts
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions } from '../src/infrastructure/persistence/database.config';

async function main(): Promise<void> {
  const config = buildDataSourceOptions() as DataSourceOptions;
  const dataSource = new DataSource({ ...config, synchronize: false });

  await dataSource.initialize();

  const drift = await dataSource.driver.createSchemaBuilder().log();

  if (drift.upQueries.length === 0) {
    console.log('SCHEMA DRIFT: none — 엔티티 정의와 DB 스키마 일치');
  } else {
    console.log(`SCHEMA DRIFT: ${drift.upQueries.length} queries`);
    drift.upQueries.forEach((q) => console.log(`  ${q.query}`));
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('drift check failed:', error);
  process.exit(1);
});
