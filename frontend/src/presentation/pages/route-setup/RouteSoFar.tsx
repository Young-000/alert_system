import type { SelectedStop } from './types';
import type { RouteType } from '@infrastructure/api/commute-api.client';

interface RouteSoFarProps {
  routeType: RouteType;
  selectedStops: SelectedStop[];
}

function getStopLabel(index: number, totalStops: number): string {
  if (totalStops === 1) return '승차';
  if (index === 0) return '승차';
  if (index === totalStops - 1) return '하차';
  return '환승';
}

export function RouteSoFar({ routeType, selectedStops }: RouteSoFarProps): JSX.Element {
  const isToWork = routeType === 'morning';
  const start = isToWork ? '집' : '회사';

  return (
    <div className="route-so-far">
      <span className="route-point-mini">{start}</span>
      {selectedStops.map((stop, index) => {
        const label = getStopLabel(index, selectedStops.length);
        return (
          <span key={stop.uniqueKey} className="route-segment">
            <span className="route-arrow-mini">→</span>
            <span className={`route-point-mini stop ${label === '환승' ? 'transfer' : ''}`}>
              <span className="stop-label-mini">{label}</span>
              {stop.name}
              {stop.line && <span className="line-info-mini">{stop.line}</span>}
            </span>
          </span>
        );
      })}
      <span className="route-arrow-mini">→</span>
      <span className="route-point-mini">?</span>
    </div>
  );
}
