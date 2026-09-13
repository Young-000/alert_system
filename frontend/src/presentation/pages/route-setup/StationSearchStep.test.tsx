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

  it('검색어가 한 글자면 "검색 결과가 없습니다"라고 말하지 않는다', () => {
    // 서버는 두 글자 미만이면 조회 자체를 하지 않고 빈 배열을 준다
    // (search-subway-stations.use-case.ts:14). 그 빈 배열을 "그런 역이 없다"로
    // 옮기면, 아직 묻지도 않은 것을 없다고 단정하게 된다.
    renderStep({ searchQuery: '강' });

    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });

  it('검색어가 한 글자면 몇 글자부터 검색되는지 알려준다', () => {
    // dead-end 금지 — 지금 할 수 있는 일 하나를 남긴다.
    renderStep({ searchQuery: '강' });

    expect(screen.getByText('두 글자 이상 입력해주세요')).toBeInTheDocument();
  });

  it('공백을 빼면 두 글자가 안 되는 검색어도 마찬가지다', () => {
    // 붙여넣기로 들어온 앞뒤 공백. 서버는 trim 후에 길이를 센다.
    renderStep({ searchQuery: '강 ' });

    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });
});
