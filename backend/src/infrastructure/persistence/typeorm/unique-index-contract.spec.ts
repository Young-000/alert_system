import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import './entities';

/**
 * 회귀 방지: 엔티티가 선언한 **UNIQUE 인덱스**가 DDL에 없었다.
 *
 * 직전 라운드들이 엔티티↔DDL을 varchar 폭 · CHECK · NOT NULL · UNIQUE 제약 · 컬럼 존재 ·
 * 테이블 존재 · FK `ON DELETE` · `SET NULL` 컬럼의 NULL 허용 · DEFAULT 로 대조했다.
 * **인덱스**는 그 목록에 없었고, 실측하니 unique 인덱스 두 개가 DDL에 없었다:
 *
 * | 엔티티 선언 | DDL | 결과 |
 * |---|---|---|
 * | `subway_stations(name, line)` UNIQUE | 없음 (`name` 단일 비-unique 인덱스뿐) | **지하철역 시딩이 프로덕션에서 통째로 실패** |
 * | `commute_sessions(user_id, status) WHERE status='in_progress'` UNIQUE | 없음 | 동시 요청 시 진행중 세션이 둘 생길 수 있음 |
 *
 * 앞의 것은 성능 문제가 아니라 **쿼리가 에러로 끝나는** 문제다.
 * `PostgresSubwayStationRepository.saveMany`가 `repository.upsert(entities, ['name','line'])`,
 * 즉 `INSERT ... ON CONFLICT (name, line) DO UPDATE`를 만드는데, Postgres는 conflict target에
 * **정확히 대응하는 unique 인덱스**를 요구한다. 없으면 42P10
 * (`there is no unique or exclusion constraint matching the ON CONFLICT specification`)이다.
 * 역 목록을 채우는 경로는 `npm run seed:subway` 하나뿐이라, 이 실패는 곧 역 검색·경로 설정·
 * 지하철 알림이 쓸 데이터가 없다는 뜻이 된다.
 *
 * 이 축은 **테스트가 구조적으로 못 본다.** 테스트 DB는 `synchronize: true`라 엔티티 선언대로
 * 인덱스를 만들어 주므로, 테스트 안에서는 `ON CONFLICT (name, line)`이 언제나 성공한다.
 * 프로덕션 스키마는 `database/*.sql`이 만들었으므로 **DDL이 정본**이다.
 *
 * unique 인덱스만 계약으로 묶고 일반 인덱스는 넣지 않는다. 일반 인덱스의 부재는 느려질 뿐이지만
 * (예: `push_subscriptions(user_id)`는 DDL의 복합 인덱스 `(user_id, platform)`가 선두 컬럼으로
 * 커버한다), unique 인덱스의 부재는 **동작이 달라진다** — upsert가 실패하고 불변식이 안 지켜진다.
 */

const DDL_DIR = path.join(__dirname, '../../../../database');
const REPOSITORY_SRC = path.join(
  __dirname,
  '../postgres-subway-station.repository.ts',
);

/** `테이블(컬럼,컬럼)` 형태의 키. 컬럼 순서까지 같아야 같은 인덱스다. */
function key(table: string, columns: string[]): string {
  return `${table}(${columns.join(',')})`;
}

/**
 * `WHERE ...` 조건을 비교 가능한 형태로 만든다. 없으면 undefined.
 * 부분 unique 인덱스와 전체 unique 인덱스는 **서로 다른 제약**이라 조건까지 같아야 한다 —
 * 예컨대 `commute_sessions(user_id, status)` 에 조건 없는 unique 를 걸면
 * 한 사용자가 완료된 세션을 두 개 가질 수 없게 되어 정상 사용이 막힌다.
 */
function normalizeWhere(clause?: string): string | undefined {
  const where = /WHERE\s+([^;]+)/i.exec(clause ?? '');
  return where ? where[1].trim().replace(/\s+/g, ' ').replace(/"/g, '') : undefined;
}

function ddlFiles(): string[] {
  return [
    path.join(DDL_DIR, 'schema.sql'),
    ...fs
      .readdirSync(path.join(DDL_DIR, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(DDL_DIR, 'migrations', f)),
  ];
}

/**
 * DDL이 만드는 UNIQUE 제약 전부. 세 가지 표기가 모두 쓰이고 있어 셋 다 읽는다:
 *   1) `CREATE UNIQUE INDEX ... ON t (a, b)`
 *   2) 컬럼 정의 안의 `email VARCHAR(255) UNIQUE`
 *   3) 테이블 수준 `CONSTRAINT x UNIQUE (a, b)`
 * 하나라도 빠뜨리면 있는 제약을 "없다"고 읽어 없는 결함을 만든다.
 */
function readDdlUniqueConstraints(): Map<string, string | undefined> {
  const found = new Map<string, string | undefined>();

  for (const file of ddlFiles()) {
    const sql = fs.readFileSync(file, 'utf8');

    const createUniqueIndex =
      /CREATE\s+UNIQUE\s+INDEX(?:\s+CONCURRENTLY)?(?:\s+IF\s+NOT\s+EXISTS)?\s+[\w."]+\s+ON\s+([\w."]+)\s*\(([^)]*)\)([^;]*)/gi;
    let index: RegExpExecArray | null;
    while ((index = createUniqueIndex.exec(sql)) !== null) {
      const table = index[1].replace(/"/g, '').split('.').pop() as string;
      const columns = index[2]
        .split(',')
        .map((c) => c.trim().replace(/"/g, '').split(/\s+/)[0]);
      found.set(key(table, columns), normalizeWhere(index[3]));
    }

    const createTable =
      /CREATE TABLE(?: IF NOT EXISTS)?\s+([\w."]+)\s*\(([\s\S]*?)\n\);/gi;
    let table: RegExpExecArray | null;
    while ((table = createTable.exec(sql)) !== null) {
      const tableName = table[1].replace(/"/g, '').split('.').pop() as string;

      for (const line of table[2].split('\n')) {
        const constraint = /UNIQUE\s*\(([^)]*)\)/i.exec(line);
        if (constraint) {
          found.set(
            key(
              tableName,
              constraint[1].split(',').map((c) => c.trim().replace(/"/g, '')),
            ),
            undefined,
          );
          continue;
        }
        // 컬럼 정의 안의 UNIQUE (`email VARCHAR(255) UNIQUE NOT NULL`)
        if (!/\bUNIQUE\b/i.test(line)) continue;
        const column = line.trim().split(/\s+/)[0].replace(/"/g, '');
        if (/^(CONSTRAINT|FOREIGN|PRIMARY|UNIQUE|CHECK|REFERENCES)$/i.test(column)) {
          continue;
        }
        found.set(key(tableName, [column]), undefined);
      }
    }
  }

  return found;
}

/** 엔티티가 `@Index(..., { unique: true })` / `@Column({ unique: true })`로 선언한 UNIQUE. */
function readEntityUniqueIndexes(): Map<string, { where?: string }> {
  const storage = getMetadataArgsStorage();
  const tableOf = new Map<unknown, string>(
    storage.tables
      .filter((t) => typeof t.name === 'string')
      .map((t) => [t.target, t.name as string]),
  );

  // 속성명 → 실제 컬럼명. 관계 속성은 @JoinColumn 의 이름이 컬럼명이다.
  const columnOf = (target: unknown, property: string): string => {
    const join = storage.joinColumns.find(
      (j) => j.target === target && j.propertyName === property,
    );
    if (join?.name) return join.name;

    const column = storage.columns.find(
      (c) => c.target === target && c.propertyName === property,
    );
    return (column?.options?.name as string) || property;
  };

  const declared = new Map<string, { where?: string }>();

  for (const index of storage.indices) {
    if (!index.unique) continue;
    const table = tableOf.get(index.target);
    if (!table) continue;
    const properties = Array.isArray(index.columns)
      ? (index.columns as string[])
      : [];
    if (properties.length === 0) continue; // 함수형 인덱스는 이 축 밖이다
    declared.set(
      key(
        table,
        properties.map((p) => columnOf(index.target, p)),
      ),
      { where: index.where },
    );
  }

  for (const column of storage.columns) {
    if (!column.options?.unique) continue;
    const table = tableOf.get(column.target);
    if (!table) continue;
    declared.set(key(table, [columnOf(column.target, column.propertyName)]), {});
  }

  return declared;
}

describe('UNIQUE 인덱스 계약 (엔티티 ↔ DDL)', () => {
  const ddl = readDdlUniqueConstraints();
  const entities = readEntityUniqueIndexes();

  it('[대조군] 양쪽 모두에서 UNIQUE 선언을 읽어낸다', () => {
    // 파서가 조용히 0건을 읽어도 "불일치 없음"으로 통과하는 것이 이런 계약 테스트의
    // 전형적인 무력화 방식이다.
    expect(ddl.size).toBeGreaterThan(15);
    expect(entities.size).toBeGreaterThan(8);
  });

  it('엔티티가 선언한 UNIQUE 인덱스가 DDL에도 모두 있다 (부분 인덱스는 조건까지)', () => {
    const mismatches: string[] = [];

    for (const [column, declared] of entities) {
      if (!ddl.has(column)) {
        mismatches.push(`${column}: DDL 에 없음`);
        continue;
      }
      const actual = ddl.get(column);
      const expected = normalizeWhere(declared.where && `WHERE ${declared.where}`);
      if (actual !== expected) {
        mismatches.push(
          `${column}: 엔티티 조건=${expected ?? '(없음)'} · DDL 조건=${actual ?? '(없음)'}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('subway_stations(name, line) — upsert 의 ON CONFLICT 대상이므로 DDL 에 있어야 한다', () => {
    // 이 인덱스가 없으면 upsert 가 42P10 으로 실패한다. 계약의 반대쪽(소스)이
    // 여전히 같은 conflict target 을 쓰는지도 함께 고정한다.
    expect(fs.readFileSync(REPOSITORY_SRC, 'utf8')).toContain(
      "upsert(entities, ['name', 'line'])",
    );
    expect(ddl.has('subway_stations(name,line)')).toBe(true);
  });

  it("commute_sessions(user_id, status) — '진행중 세션은 하나' 불변식의 DB 쪽 방어선", () => {
    // use-case 는 read-then-write 로 막는다(`manage-commute-session.use-case.ts` startSession).
    // 동시 요청에는 그 검사만으로 부족하고, 부분 unique 인덱스가 마지막 방어선이다.
    expect(entities.get('commute_sessions(user_id,status)')?.where).toBe(
      "status = 'in_progress'",
    );
    expect(ddl.has('commute_sessions(user_id,status)')).toBe(true);
    expect(ddl.get('commute_sessions(user_id,status)')).toBe(
      "status = 'in_progress'",
    );
  });
});
