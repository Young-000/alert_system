import type { RouteType } from '@infrastructure/api/commute-api.client';

export type SetupStep =
  | 'select-type'      // 출근/퇴근 선택
  | 'select-transport' // 교통수단 선택
  | 'select-station'   // 역/정류장 검색
  | 'ask-more'         // 더 거쳐가나요?
  | 'confirm';         // 최종 확인

export type LocalTransportMode = 'subway' | 'bus';

export interface SelectedStop {
  id: string;
  uniqueKey: string; // for drag-and-drop
  name: string;
  line: string;
  transportMode: LocalTransportMode;
  // 편집 로드 시 원본 체크포인트 id. 수정 저장에 실어 보내야
  // 서버가 행을 유지해 도착 기록(CASCADE)이 살아남는다.
  checkpointId?: string;
}

// Grouped station for line selection
export interface GroupedStation {
  name: string;
  lines: Array<{ line: string; id: string }>;
}

// Route validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Shared route data from URL
export interface SharedRouteData {
  name: string;
  routeType: RouteType;
  checkpoints: Array<{
    name: string;
    checkpointType: string;
    linkedStationId?: string;
    linkedBusStopId?: string;
    lineInfo?: string;
    transportMode?: string;
  }>;
}
