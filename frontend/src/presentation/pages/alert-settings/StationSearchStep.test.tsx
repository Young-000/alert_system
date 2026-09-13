import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StationSearchStep } from './StationSearchStep';
import type { TransportItem, GroupedStation } from './types';

type Props = Parameters<typeof StationSearchStep>[0];

function renderStep(overrides: Partial<Props> = {}) {
  const onRetrySearch = vi.fn();
  const props: Props = {
    transportTypes: ['subway'],
    searchQuery: '강남',
    searchResults: [] as TransportItem[],
    selectedTransports: [] as TransportItem[],
    isSearching: false,
    searchError: null,
    groupedStations: [] as GroupedStation[],
    selectedStation: null,
    savedRoutes: [],
    onSearchChange: vi.fn(),
    onToggleTransport: vi.fn(),
    onSelectStation: vi.fn(),
    onRetrySearch,
    ...overrides,
  };
  render(<StationSearchStep {...props} />);
  return { onRetrySearch };
}

describe('StationSearchStep (alert-settings)', () => {
  it('공백을 빼면 두 글자가 안 되는 검색어에 "검색 결과가 없습니다"라고 하지 않는다', () => {
    // 훅은 trim 후 두 글자 미만이면 검색을 아예 하지 않는다
    // (use-transport-search.ts:47). 그런데 이 화면은 공백을 세고 있어서,
    // 묻지도 않은 것을 없다고 단정하는 창이 열린다.
    renderStep({ searchQuery: '강 ' });

    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });

  it('검색이 실제로 돌았고 결과가 0건이면 "검색 결과가 없습니다"를 그대로 띄운다', () => {
    // 대조군 — 진짜 빈 결과까지 숨기지 않는다.
    renderStep({ searchQuery: '강남' });

    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
  });

  it('검색이 실패하면 "결과 없음" 대신 실패를 말하고 다시 시도할 수 있다', async () => {
    const user = userEvent.setup();
    const { onRetrySearch } = renderStep({
      searchQuery: '강남',
      searchError: '검색에 실패했어요. 잠시 후 다시 시도해주세요.',
    });

    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(onRetrySearch).toHaveBeenCalledTimes(1);
  });

  it('검색 중에는 결과 없음을 말하지 않는다', () => {
    renderStep({ searchQuery: '강남', isSearching: true });

    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });

  it('두 글자가 안 되면 몇 글자부터 검색되는지 알려준다', () => {
    // 문구를 지우기만 하면 빈 화면이 남는다. dead-end 금지.
    renderStep({ searchQuery: '강 ' });

    expect(screen.getByText('두 글자 이상 입력해주세요')).toBeInTheDocument();
  });

  it('아직 아무것도 입력하지 않았으면 안내를 띄우지 않는다', () => {
    renderStep({ searchQuery: '' });

    expect(screen.queryByText('두 글자 이상 입력해주세요')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
  });
});
