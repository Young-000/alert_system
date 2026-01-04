import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/infrastructure/persistence/database.config';

dotenv.config();

async function applySchema() {
  const schemaPath = resolve(__dirname, '../database/schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();

  for (const statement of statements) {
    await dataSource.query(statement);
  }

  await dataSource.destroy();
  console.log('Schema applied:', statements.length, 'statements');
}

applySchema().catch((error) => {
  console.error('Failed to apply schema:', error);
  process.exit(1);
});
