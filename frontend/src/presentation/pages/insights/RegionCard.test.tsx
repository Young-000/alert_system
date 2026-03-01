import { render, screen, fireEvent } from '@testing-library/react';
import { RegionCard } from './RegionCard';
import type { RegionSummary } from '@infrastructure/api/commute-api.client';

vi.mock('@infrastructure/api');

function makeRegion(overrides: Partial<RegionSummary> = {}): RegionSummary {
  return {
    regionId: 'region-1',
    regionName: '강남/역삼 지역',
    avgDurationMinutes: 42.3,
    medianDurationMinutes: 40,
    userCount: 12,
    sessionCount: 156,
    weekTrend: -3.2,
    weekTrendDirection: 'improving',
    peakHour: 8,
    lastCalculatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('RegionCard', () => {
  it('지역 이름을 표시한다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
  });

  it('평균 소요시간을 반올림하여 표시한다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('42분')).toBeInTheDocument();
  });

  it('통근자 수를 표시한다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('12명')).toBeInTheDocument();
  });

  it('세션 수를 표시한다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('156회')).toBeInTheDocument();
  });

  it('개선 트렌드를 초록색으로 표시한다', () => {
    render(
      <RegionCard
        region={makeRegion({ weekTrendDirection: 'improving', weekTrend: -3.2 })}
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    );
    const badge = screen.getByText(/3.2% 개선/);
    expect(badge.closest('.insight-trend-badge')).toHaveClass('insight-trend--improving');
  });

  it('악화 트렌드를 빨간색으로 표시한다', () => {
    render(
      <RegionCard
        region={makeRegion({ weekTrendDirection: 'worsening', weekTrend: 5.1 })}
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    );
    const badge = screen.getByText(/5.1% 악화/);
    expect(badge.closest('.insight-trend-badge')).toHaveClass('insight-trend--worsening');
  });

  it('안정 트렌드를 표시한다', () => {
    render(
      <RegionCard
        region={makeRegion({ weekTrendDirection: 'stable', weekTrend: 0 })}
        isExpanded={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/변동 없음/)).toBeInTheDocument();
  });

  it('신뢰도를 높음으로 표시한다 (20+ 사용자)', () => {
    render(
      <RegionCard region={makeRegion({ userCount: 25 })} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('높음')).toBeInTheDocument();
  });

  it('신뢰도를 보통으로 표시한다 (10-19 사용자)', () => {
    render(
      <RegionCard region={makeRegion({ userCount: 12 })} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  it('신뢰도를 낮음으로 표시한다 (5-9 사용자)', () => {
    render(
      <RegionCard region={makeRegion({ userCount: 7 })} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('낮음')).toBeInTheDocument();
  });

  it('클릭하면 onToggle을 호출한다', () => {
    const onToggle = vi.fn();
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('확장 시 상세 정보를 표시한다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={true} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('40분')).toBeInTheDocument(); // median
    expect(screen.getByText('8시')).toBeInTheDocument(); // peak hour
  });

  it('축소 시 상세 정보를 숨긴다', () => {
    render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.queryByText('8시')).not.toBeInTheDocument();
  });

  it('aria-expanded를 올바르게 설정한다', () => {
    const { rerender } = render(
      <RegionCard region={makeRegion()} isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <RegionCard region={makeRegion()} isExpanded={true} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
