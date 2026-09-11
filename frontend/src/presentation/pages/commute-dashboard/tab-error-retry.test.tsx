import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../test-utils';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import { AnalyticsTab } from './AnalyticsTab';
import { BehaviorTab } from './BehaviorTab';
import { RoutesTab } from './RoutesTab';

// 탭별 조회 실패는 페이지 상단 알림(loadError)에 걸리지 않는다.
// 그래서 실패한 탭 안에 다시 시도가 없으면 그 화면에서 할 수 있는 일이 없다.
// 되부르는 수단(retryLoad)은 이미 있으므로, 실패한 자리에서 닿기만 하면 된다.

const STATS: CommuteStatsResponse = {
  userId: 'u-1',
  totalSessions: 10,
  recentSessions: 3,
  overallAverageDuration: 40,
  overallAverageWaitTime: 5,
  overallAverageDelay: 2,
  waitTimePercentage: 12,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [],
  insights: [],
};

describe('대시보드 탭 — 조회 실패에 다시 시도를 남긴다', () => {
  it('분석 탭: 실패 문구 옆에 다시 시도가 있다', async () => {
    const onRetry = vi.fn();
    render(
      <AnalyticsTab routeAnalytics={[]} analyticsError="분석 데이터를 불러올 수 없습니다" onRetry={onRetry} />,
    );

    expect(screen.getByText('분석 데이터를 불러올 수 없습니다')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('행동 탭: 실패 문구 옆에 다시 시도가 있다', async () => {
    const onRetry = vi.fn();
    // 데이터가 없을 때의 EmptyState 가 <Link> 를 쓰므로 라우터가 필요하다.
    render(
      <TestProviders>
        <BehaviorTab
          behaviorAnalytics={null}
          behaviorPatterns={[]}
          behaviorError="패턴 분석에 실패했습니다"
          onRetry={onRetry}
        />
      </TestProviders>,
    );

    expect(screen.getByText('패턴 분석에 실패했습니다')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('경로 탭: 실패 문구 옆에 다시 시도가 있다', async () => {
    const onRetry = vi.fn();
    render(
      <RoutesTab
        stats={STATS}
        selectedRouteId={null}
        onSelectRoute={vi.fn()}
        routeComparison={null}
        comparisonError="비교 데이터를 불러올 수 없습니다"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('비교 데이터를 불러올 수 없습니다')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // 대조군 — 실패가 없으면 재시도 버튼이 끼어들지 않는다.
  it('실패가 없으면 다시 시도가 없다', () => {
    render(<AnalyticsTab routeAnalytics={[]} onRetry={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });
});
