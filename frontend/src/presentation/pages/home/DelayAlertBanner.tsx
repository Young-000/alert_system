import { useState } from 'react';
import { useRouteDelayStatus } from '@infrastructure/query/use-delay-status-query';
import type {
  OverallDelayStatus,
  DelaySegmentResponse,
  SegmentDelayStatus,
} from '@infrastructure/api/commute-api.client';
import { AlternativeCard } from './AlternativeCard';
import '@presentation/styles/pages/delay-alert.css';

interface DelayAlertBannerProps {
  readonly routeId: string;
}

const STATUS_CONFIG: Record<OverallDelayStatus, {
  icon: string;
  title: string;
  show: boolean;
}> = {
  normal: { icon: '', title: '', show: false },
  minor_delay: { icon: '\u{26A0}\u{FE0F}', title: '경미한 지연', show: true },
  delayed: { icon: '\u{1F6A8}', title: '지연 발생', show: true },
  severe_delay: { icon: '\u{1F6D1}', title: '심각한 지연', show: true },
  unavailable: { icon: '\u{2139}\u{FE0F}', title: '운행 정보 없음', show: true },
};

const SEGMENT_STATUS_LABELS: Record<SegmentDelayStatus, string> = {
  normal: '정상',
  delayed: '지연',
  severe_delay: '심각',
  unavailable: '정보 없음',
};

function formatDelaySubtitle(totalDelayMinutes: number, status: OverallDelayStatus): string {
  if (status === 'unavailable') return '실시간 운행 정보를 확인할 수 없습니다';
  if (totalDelayMinutes <= 0) return '약간의 지연이 감지되었습니다';
  return `약 ${totalDelayMinutes}분 지연 예상`;
}

function getDelayedSegments(segments: readonly DelaySegmentResponse[]): DelaySegmentResponse[] {
  return segments.filter(s => s.status !== 'normal');
}

export function DelayAlertBanner({ routeId }: DelayAlertBannerProps): JSX.Element | null {
  const { data, isLoading } = useRouteDelayStatus(routeId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !data) return null;

  const config = STATUS_CONFIG[data.overallStatus];
  if (!config.show) return null;

  const delayedSegments = getDelayedSegments(data.segments);
  const hasAlternatives = data.alternatives.length > 0;
  const hasDetails = delayedSegments.length > 0 || hasAlternatives;

  return (
    <section
      className={`delay-banner delay-banner--${data.overallStatus}`}
      role="alert"
      aria-live="polite"
      data-testid="delay-alert-banner"
    >
      <div className="delay-banner-header">
        <span className="delay-banner-icon" aria-hidden="true">{config.icon}</span>
        <div className="delay-banner-content">
          <h3 className="delay-banner-title">{config.title}</h3>
          <p className="delay-banner-subtitle">
            {formatDelaySubtitle(data.totalDelayMinutes, data.overallStatus)}
          </p>
        </div>
        {hasDetails && (
          <button
            type="button"
            className="delay-banner-toggle"
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? '지연 상세 접기' : '지연 상세 펼치기'}
          >
            ▼
          </button>
        )}
      </div>

      {hasDetails && (
        <div
          className="delay-banner-details"
          data-expanded={expanded}
          aria-hidden={!expanded}
        >
          <div className="delay-banner-details-inner">
            {delayedSegments.length > 0 && (
              <>
                <p className="delay-section-label">영향 구간</p>
                <ul className="delay-segments" data-testid="delay-segments">
                  {delayedSegments.map(segment => (
                    <li className="delay-segment" key={segment.checkpointId}>
                      <div className="delay-segment-info">
                        <span className="delay-segment-name">{segment.checkpointName}</span>
                        {segment.lineInfo && (
                          <span className="delay-segment-line">{segment.lineInfo}</span>
                        )}
                      </div>
                      <span
                        className={`delay-segment-badge delay-segment-badge--${segment.status}`}
                      >
                        {SEGMENT_STATUS_LABELS[segment.status]}
                        {segment.delayMinutes > 0 ? ` +${segment.delayMinutes}분` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {hasAlternatives && (
              <>
                <p className="delay-section-label">대안 경로</p>
                {data.alternatives.map(alt => (
                  <AlternativeCard key={alt.id} alternative={alt} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
