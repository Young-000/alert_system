/**
 * DB 컬럼 자체가 갖는 한계값. 도메인 감각으로 좁히지 않는다 —
 * 더 좁게 잡으면 저장 가능한 값을 400으로 되돌리게 된다.
 *
 * Postgres `INTEGER`는 int4(4바이트)다. 상한을 넘긴 값은 검증을 통과해도
 * INSERT 시점에 `integer out of range`로 끊겨 400이 아니라 500이 된다.
 */
export const INT4_MAX = 2147483647;
export const INT4_MIN = -2147483648;

/**
 * varchar 컬럼 폭. 초과 시 Postgres가 `value too long for type character varying(n)`으로
 * 끊어 400이 아니라 500이 된다 — SQLite는 폭을 강제하지 않아 테스트로는 보이지 않는다.
 *
 * 값은 DDL 폭과 **같게** 둔다. 도메인 감각으로 좁히면 저장 가능한 값을 400으로 되돌린다.
 */
/** `commute_records.weather_condition` · `commute_sessions.weather_condition` */
export const MAX_WEATHER_CONDITION_LENGTH = 50;
/** `checkpoint_records.notes` (`20260208_add_commute_tracking_tables.sql`) */
export const MAX_CHECKPOINT_NOTES_LENGTH = 255;
/** `alternative_mappings.from_station_name` · `to_station_name` */
export const MAX_STATION_NAME_LENGTH = 100;
/** `alternative_mappings.from_line` · `to_line` */
export const MAX_LINE_NAME_LENGTH = 50;
/** `live_activity_tokens.activity_id` */
export const MAX_ACTIVITY_ID_LENGTH = 255;
