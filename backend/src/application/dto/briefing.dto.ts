export type AdviceSeverity = 'info' | 'warning' | 'danger';

export type AdviceCategory =
  | 'clothing'
  | 'umbrella'
  | 'mask'
  | 'transit'
  | 'temperature'
  | 'wind';

export class BriefingAdviceDto {
  category: AdviceCategory;
  severity: AdviceSeverity;
  icon: string;
  message: string;
  detail?: string;
}

export class BriefingResponseDto {
  contextLabel: string;
  summary: string;
  advices: BriefingAdviceDto[];
  updatedAt: string;
}
