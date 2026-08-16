import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StationSearchStep } from './StationSearchStep';
import type { GroupedStation, SelectedStop, LocalTransportMode } from './types';

type Props = Parameters<typeof StationSearchStep>[0];

function renderStep(overrides: Partial<Props> = {}) {
  const onRetrySearch = vi.fn();
  const props: Props = {
    currentTransport: 'subway' as LocalTransportMode,
    selectedStops: [] as SelectedStop[],
    routeType: 'morning',
    searchQuery: '강남',
    isSearching: false,
    error: '',
    searchError: '',
    groupedSubwayResults: [] as GroupedStation[],
    busResults: [],
    onSearchChange: vi.fn(),
    onClearSearch: vi.fn(),
    onStationClick: vi.fn(),
    onBusStopSelect: vi.fn(),
    onRetrySearch,
    onStepChange: vi.fn(),
    ...overrides,
  };
  render(<StationSearchStep {...props} />);
  return { onRetrySearch };
}

describe('StationSearchStep (route-setup)', () => {
  it('검색이 실패하면 "검색 결과가 없습니다"를 함께 띄우지 않는다', () => {
    // 실패는 "없다"가 아니다. 둘이 같이 뜨면 화면이 서로 모순되는 말을 한다.
    renderStep({ searchError: '검색에 실패했습니다' });

    expect(screen.getByText('검색에 실패했습니다')).toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });

  it('검색이 실패하면 다시 시도할 수 있다', async () => {
    const user = userEvent.setup();
    const { onRetrySearch } = renderStep({ searchError: '검색에 실패했습니다' });

    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(onRetrySearch).toHaveBeenCalledTimes(1);
  });

  it('검색에 성공했고 결과가 0건이면 "검색 결과가 없습니다"를 그대로 띄운다', () => {
    // 대조군 — 진짜 빈 결과까지 에러로 바꾸지 않는다.
    renderStep({ searchError: '' });

    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });

  it('경로 저장 같은 페이지 오류는 검색 재시도 버튼을 띄우지 않는다', () => {
    // 검색과 무관한 오류에 "다시 시도"를 붙이면 엉뚱한 요청을 다시 보낸다.
    renderStep({ error: '경유지는 최소 2개 필요합니다.' });

    expect(screen.getByText('경유지는 최소 2개 필요합니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });
});
