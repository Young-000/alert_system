import { describe, it, expect } from 'vitest';
import { resolvePreferredFlag } from './route-payload';

describe('resolvePreferredFlag', () => {
  describe('새 경로를 만들 때', () => {
    it('첫 경로는 대표로 지정한다', () => {
      expect(resolvePreferredFlag({ isEditing: false, existingRouteCount: 0 })).toBe(true);
    });

    it('이미 경로가 있으면 대표로 올리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: false, existingRouteCount: 2 })).toBe(false);
    });
  });

  describe('기존 경로를 수정할 때', () => {
    // 서버는 isPreferred를 안 보내면 기존 값을 보존한다(dto.isPreferred ?? existing).
    // false를 실어 보내면 사용자가 지정한 대표가 소리 없이 풀린다.
    it('대표 여부를 건드리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: true, existingRouteCount: 2 })).toBeUndefined();
    });

    it('경로가 하나뿐이어도 건드리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: true, existingRouteCount: 1 })).toBeUndefined();
    });
  });
});
