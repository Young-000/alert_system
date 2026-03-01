// ========== GET /community/neighbors ==========

export type NeighborDataStatus = 'sufficient' | 'insufficient' | 'no_route';

export interface NeighborStatsDto {
  routeId: string | null;
  neighborCount: number;
  avgDurationMinutes: number | null;
  myAvgDurationMinutes: number | null;
  diffMinutes: number | null;
  dataStatus: NeighborDataStatus;
}

// ========== GET /community/tips ==========

export interface TipDto {
  id: string;
  content: string;
  helpfulCount: number;
  createdAt: string;
  isHelpfulByMe: boolean;
  isReportedByMe: boolean;
}

export interface TipsListResponseDto {
  tips: TipDto[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// ========== POST /community/tips ==========

export interface CreateTipRequestDto {
  checkpointKey: string;
  content: string;
}

export interface CreateTipResponseDto {
  id: string;
  content: string;
  createdAt: string;
}

// ========== POST /community/tips/:id/report ==========

export interface ReportTipResponseDto {
  message: string;
}

// ========== POST /community/tips/:id/helpful ==========

export interface HelpfulTipResponseDto {
  message: string;
  helpfulCount: number;
  isHelpfulByMe: boolean;
}
