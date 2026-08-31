/**
 * DB 컬럼 자체가 갖는 한계값. 도메인 감각으로 좁히지 않는다 —
 * 더 좁게 잡으면 저장 가능한 값을 400으로 되돌리게 된다.
 *
 * Postgres `INTEGER`는 int4(4바이트)다. 상한을 넘긴 값은 검증을 통과해도
 * INSERT 시점에 `integer out of range`로 끊겨 400이 아니라 500이 된다.
 */
export const INT4_MAX = 2147483647;
export const INT4_MIN = -2147483648;
