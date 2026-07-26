import { ColumnType } from 'typeorm';

/**
 * 타임존 포함 타임스탬프 컬럼 타입.
 *
 * 프로덕션 DB(Supabase Postgres)의 실제 컬럼은 `timestamp with time zone`이므로
 * 기본값은 `timestamptz`를 유지한다. 다만 E2E 테스트는 인메모리 sqljs를 사용하는데
 * sqljs 드라이버는 `timestamptz`를 지원하지 않아 DataSource 초기화 단계에서
 * DataTypeNotSupportedError로 죽는다. 테스트에서만 sqljs가 이해하는 `datetime`으로 낮춘다.
 *
 * NODE_ENV=test는 jest가 자동으로 설정하며 CI(backend job)에도 명시되어 있다.
 */
export const TIMESTAMPTZ: ColumnType = process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';
