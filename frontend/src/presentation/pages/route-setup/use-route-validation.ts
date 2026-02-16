import { useCallback, useMemo } from 'react';
import type { SelectedStop, ValidationResult } from './types';

export function useRouteValidation(selectedStops: SelectedStop[]): {
  validation: ValidationResult;
  validateRoute: (stops: SelectedStop[]) => ValidationResult;
} {
  const validateRoute = useCallback((stops: SelectedStop[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (stops.length === 0) {
      errors.push('최소 하나의 정류장을 선택해주세요');
      return { isValid: false, errors, warnings };
    }

    // 1. 중복 역 검사 (같은 이름 + 같은 호선)
    const seen = new Set<string>();
    for (const stop of stops) {
      const key = `${stop.name}-${stop.line}-${stop.transportMode}`;
      if (seen.has(key)) {
        errors.push(`"${stop.name} ${stop.line || ''}" ${stop.transportMode === 'subway' ? '역' : '정류장'}이 중복되었습니다`);
      }
      seen.add(key);
    }

    // 2. 연속 구간 검증
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const curr = stops[i];

      // 2a. 지하철 → 지하철
      if (prev.transportMode === 'subway' && curr.transportMode === 'subway') {
        if (prev.line === curr.line && prev.name === curr.name) {
          errors.push(`${prev.name}역 ${prev.line}이 연속으로 중복되었습니다.`);
        } else if (prev.line === curr.line && prev.line !== '') {
          warnings.push(
            `${prev.name}과 ${curr.name}은 같은 ${curr.line}입니다. 중간역이라면 생략해도 됩니다.`
          );
        } else if (prev.line !== curr.line && prev.name !== curr.name) {
          errors.push(
            `${prev.name}역(${prev.line})에서 ${curr.name}역(${curr.line})으로 직접 이동할 수 없습니다. 환승역을 추가해주세요.`
          );
        }
      }

      // 2b. 버스 → 버스
      if (prev.transportMode === 'bus' && curr.transportMode === 'bus') {
        if (prev.name !== curr.name) {
          warnings.push(
            `${prev.name} → ${curr.name} 버스 환승이 가능한지 확인해주세요.`
          );
        }
      }

      // 2c. 버스 ↔ 지하철: 혼합 환승
      if (prev.transportMode !== curr.transportMode) {
        const fromType = prev.transportMode === 'subway' ? '지하철' : '버스';
        const toType = curr.transportMode === 'subway' ? '지하철' : '버스';
        warnings.push(
          `${prev.name}에서 ${fromType}→${toType} 환승이 있습니다. 환승 시간을 고려해주세요.`
        );
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }, []);

  const validation = useMemo(
    () => validateRoute(selectedStops),
    [selectedStops, validateRoute],
  );

  return { validation, validateRoute };
}
