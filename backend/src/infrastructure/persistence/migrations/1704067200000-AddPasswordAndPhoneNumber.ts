import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordAndPhoneNumber1704067200000 implements MigrationInterface {
  name = 'AddPasswordAndPhoneNumber1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "password" VARCHAR(255)
    `);

    // Add phoneNumber column to users table (if not exists)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20)
    `);

    // Create index on phoneNumber for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_phoneNumber"
      ON "users" ("phoneNumber")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phoneNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password"`);
  }
}
