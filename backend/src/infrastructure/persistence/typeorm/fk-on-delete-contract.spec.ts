import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import './entities';

/**
 * 회귀 방지: 엔티티가 선언한 FK의 `onDelete`와 DDL의 `ON DELETE`가 달랐다.
 *
 * 앞선 라운드들은 varchar 폭 · CHECK · NOT NULL · UNIQUE 로 엔티티↔DDL을 대조했다.
 * **FK의 삭제 동작**은 그 축에 없었다. 실측하니 40개 중 하나가 어긋나 있었다:
 *
 * | 컬럼 | 엔티티 | DDL |
 * |---|---|---|
 * | `notification_rules.user_id` | `onDelete: 'SET NULL'` | `ON DELETE CASCADE` |
 *
 * 이 축은 테스트가 구조적으로 못 본다. 테스트 DB는 `synchronize: true`로
 * **엔티티에서** 스키마를 만들기 때문에, 엔티티가 무엇을 선언하든 테스트 안에서는
 * 그것이 곧 사실이 된다. 프로덕션 스키마는 `database/migrations/*.sql`이 만들었으므로
 * **DDL이 정본**이다.
 *
 * 어긋난 쪽(SET NULL)이 왜 위험한가: `notification_rules`는 `user_id IS NULL`을
 * "시스템 규칙"으로 쓰고(`user_id UUID REFERENCES ...` 는 nullable이고
 * `is_system_rule` 기본값이 true다), 규칙 조회 두 곳은 사용자로 거르지 않는다
 * (`notification-rule.repository.ts` `findEnabledRules` · `findByCategories`).
 * 즉 SET NULL 이 실제로 적용되면 **탈퇴한 사용자의 개인 규칙이 user_id NULL 로 남아
 * 전체 사용자에게 적용되는 규칙이 된다.** 선언과 DB가 갈린 채로 두면
 * `synchronize` 나 `migration:generate` 가 그 선언대로 FK를 다시 만들어 버린다.
 *
 * 그래서 한 컬럼만 고치지 않고 **FK 전수를 DDL과 대조하는 계약**으로 둔다.
 */

const DDL_DIR = path.join(__dirname, '../../../../database');

type OnDeleteAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

/** DDL 안의 `(테이블, 컬럼) → ON DELETE 동작`. 생략되면 Postgres 기본값 NO ACTION. */
function readDdlForeignKeys(): Map<string, OnDeleteAction> {
  const files = [
    path.join(DDL_DIR, 'schema.sql'),
    ...fs
      .readdirSync(path.join(DDL_DIR, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(DDL_DIR, 'migrations', f)),
  ];

  const found = new Map<string, OnDeleteAction>();

  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    const createTable = /CREATE TABLE(?: IF NOT EXISTS)?\s+([\w."]+)\s*\(([\s\S]*?)\n\);/gi;

    let table: RegExpExecArray | null;
    while ((table = createTable.exec(sql)) !== null) {
      const tableName = table[1].replace(/"/g, '').split('.').pop() as string;

      for (const line of table[2].split('\n')) {
        if (!/REFERENCES/i.test(line)) continue;

        const column = line.trim().split(/\s+/)[0];
        // 컬럼 정의가 아니라 테이블 수준 제약이면 열 이름 자리에 키워드가 온다.
        if (/^(CONSTRAINT|FOREIGN|PRIMARY|UNIQUE|CHECK|REFERENCES)$/i.test(column)) {
          continue;
        }

        const action = /ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)/i.exec(line);
        found.set(
          `${tableName}.${column}`,
          (action ? action[1].toUpperCase() : 'NO ACTION') as OnDeleteAction,
        );
      }
    }
  }

  return found;
}

/** 엔티티가 선언한 `(테이블, 조인 컬럼) → onDelete`. 생략이면 NO ACTION(= Postgres 기본). */
function readEntityForeignKeys(): Map<string, OnDeleteAction> {
  const storage = getMetadataArgsStorage();
  const tableOf = new Map<unknown, string>(
    storage.tables
      .filter((t) => typeof t.name === 'string')
      .map((t) => [t.target, t.name as string]),
  );

  const declared = new Map<string, OnDeleteAction>();

  for (const joinColumn of storage.joinColumns) {
    if (!joinColumn.name) continue;

    const relation = storage.relations.find(
      (r) =>
        r.target === joinColumn.target &&
        r.propertyName === joinColumn.propertyName,
    );
    if (!relation) continue;

    const tableName = tableOf.get(joinColumn.target);
    if (!tableName) continue;

    declared.set(
      `${tableName}.${joinColumn.name}`,
      (relation.options?.onDelete ?? 'NO ACTION') as OnDeleteAction,
    );
  }

  return declared;
}

describe('FK ON DELETE 계약 (엔티티 ↔ DDL)', () => {
  const ddl = readDdlForeignKeys();
  const entities = readEntityForeignKeys();

  it('[대조군] 양쪽 모두에서 FK를 읽어낸다', () => {
    expect(ddl.size).toBeGreaterThan(30);
    expect(entities.size).toBeGreaterThan(30);
  });

  it('엔티티가 선언한 삭제 동작이 DDL과 모두 일치한다', () => {
    const mismatches: string[] = [];

    for (const [column, declared] of entities) {
      const actual = ddl.get(column);
      if (actual === undefined) continue; // DDL 부재는 별도 축(엔티티↔테이블 대조)이 본다
      if (actual !== declared) {
        mismatches.push(`${column}: 엔티티=${declared} · DDL=${actual}`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('notification_rules.user_id 는 CASCADE 다 — user_id NULL 은 시스템 규칙 자리다', () => {
    expect(ddl.get('notification_rules.user_id')).toBe('CASCADE');
    expect(entities.get('notification_rules.user_id')).toBe('CASCADE');
  });
});
