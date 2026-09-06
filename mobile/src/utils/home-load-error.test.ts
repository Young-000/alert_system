import { describe, expect, it } from 'vitest';

import { resolveHomeLoadError } from './home-load-error';

const ok = { routes: 'ok', alerts: 'ok', stats: 'ok' } as const;

describe('resolveHomeLoadError', () => {
  it('전부 성공하면 알릴 것이 없다', () => {
    expect(resolveHomeLoadError(ok)).toBeNull();
  });

  it('셋 다 실패하면 통합 문구', () => {
    expect(
      resolveHomeLoadError({ routes: 'failed', alerts: 'failed', stats: 'failed' }),
    ).toBe('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
  });

  it('경로만 실패하면 경로 사유', () => {
    expect(resolveHomeLoadError({ ...ok, routes: 'failed' })).toBe(
      '경로 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  // 알림 조회가 실패하면 `nextAlert`가 null이 되어 다음 알림 카드가 통째로
  // 사라진다. 알림을 걸어둔 사용자에게는 알림이 없어진 것처럼 보인다 —
  // 실패를 빈 데이터로 표시하는 꼴이라 사유를 밝혀야 한다.
  it('알림만 실패해도 알린다', () => {
    expect(resolveHomeLoadError({ ...ok, alerts: 'failed' })).toBe(
      '알림 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  // 통계가 빠지면 브리핑에서 "약 N분 예상"이 조용히 사라진다.
  it('기록만 실패해도 알린다', () => {
    expect(resolveHomeLoadError({ ...ok, stats: 'failed' })).toBe(
      '기록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('둘이 실패하면 경로 사유를 먼저 보여준다', () => {
    expect(
      resolveHomeLoadError({ routes: 'failed', alerts: 'failed', stats: 'ok' }),
    ).toBe('경로 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
  });

  it('경로가 멀쩡하면 알림 사유가 기록 사유보다 앞선다', () => {
    expect(
      resolveHomeLoadError({ routes: 'ok', alerts: 'failed', stats: 'failed' }),
    ).toBe('알림 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
  });
});
