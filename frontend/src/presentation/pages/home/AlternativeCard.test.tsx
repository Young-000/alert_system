import { render, screen } from '@testing-library/react';
import { AlternativeCard } from './AlternativeCard';
import type { AlternativeSuggestionResponse } from '@infrastructure/api/commute-api.client';

function makeAlternative(
  overrides: Partial<AlternativeSuggestionResponse> = {},
): AlternativeSuggestionResponse {
  return {
    id: 'alt-1',
    triggerSegment: 'cp-1',
    triggerReason: '2호선 지연',
    description: '신분당선으로 우회',
    steps: [
      { action: 'walk', from: '강남역', to: '신논현역', durationMinutes: 5 },
      { action: 'subway', from: '신논현역', to: '판교역', line: '신분당선', durationMinutes: 15 },
    ],
    totalDurationMinutes: 20,
    originalDurationMinutes: 30,
    savingsMinutes: 10,
    confidence: 'high',
    ...overrides,
  };
}

describe('AlternativeCard', () => {
  it('renders description and savings badge', () => {
    render(<AlternativeCard alternative={makeAlternative()} />);

    expect(screen.getByText('신분당선으로 우회')).toBeInTheDocument();
    expect(screen.getByTestId('savings-badge')).toHaveTextContent('10분 단축');
  });

  it('does not show savings badge when savingsMinutes is 0', () => {
    render(<AlternativeCard alternative={makeAlternative({ savingsMinutes: 0 })} />);

    expect(screen.queryByTestId('savings-badge')).not.toBeInTheDocument();
  });

  it('renders all steps with correct icons', () => {
    render(<AlternativeCard alternative={makeAlternative()} />);

    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(2);

    // First step: walk
    expect(screen.getByText(/강남역 → 신논현역/)).toBeInTheDocument();
    expect(screen.getByText('5분')).toBeInTheDocument();

    // Second step: subway with line info
    expect(screen.getByText(/신논현역 → 판교역 \(신분당선\)/)).toBeInTheDocument();
    expect(screen.getByText('15분')).toBeInTheDocument();
  });

  it('renders bus step correctly', () => {
    render(
      <AlternativeCard
        alternative={makeAlternative({
          steps: [
            { action: 'bus', from: '강남역 정류장', to: '판교역 정류장', line: '9003번', durationMinutes: 25 },
          ],
        })}
      />,
    );

    expect(screen.getByText(/강남역 정류장 → 판교역 정류장 \(9003번\)/)).toBeInTheDocument();
    expect(screen.getByText('25분')).toBeInTheDocument();
  });

  it('shows confidence indicator with high confidence', () => {
    render(<AlternativeCard alternative={makeAlternative({ confidence: 'high' })} />);

    const indicator = screen.getByTestId('confidence-indicator');
    expect(indicator).toHaveTextContent('신뢰도 높음');
    expect(indicator.querySelector('.alt-confidence-dot--high')).toBeInTheDocument();
  });

  it('shows confidence indicator with medium confidence', () => {
    render(<AlternativeCard alternative={makeAlternative({ confidence: 'medium' })} />);

    const indicator = screen.getByTestId('confidence-indicator');
    expect(indicator).toHaveTextContent('신뢰도 보통');
    expect(indicator.querySelector('.alt-confidence-dot--medium')).toBeInTheDocument();
  });

  it('shows confidence indicator with low confidence', () => {
    render(<AlternativeCard alternative={makeAlternative({ confidence: 'low' })} />);

    const indicator = screen.getByTestId('confidence-indicator');
    expect(indicator).toHaveTextContent('신뢰도 낮음');
    expect(indicator.querySelector('.alt-confidence-dot--low')).toBeInTheDocument();
  });

  it('shows total duration', () => {
    render(<AlternativeCard alternative={makeAlternative({ totalDurationMinutes: 20 })} />);

    expect(screen.getByText('총 20분')).toBeInTheDocument();
  });

  it('renders step without "to" field correctly', () => {
    render(
      <AlternativeCard
        alternative={makeAlternative({
          steps: [
            { action: 'walk', from: '현재 위치', durationMinutes: 3 },
          ],
        })}
      />,
    );

    expect(screen.getByText('현재 위치')).toBeInTheDocument();
    expect(screen.getByText('3분')).toBeInTheDocument();
  });
});
