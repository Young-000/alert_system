import { render } from '@testing-library/react';
import { MorningBriefing } from './MorningBriefing';
import type { WeatherData } from '@infrastructure/api';

vi.mock('@infrastructure/api');

const mockWeather: WeatherData = {
  location: 'Seoul',
  temperature: 5,
  condition: 'Clear',
  humidity: 40,
  windSpeed: 3,
  conditionKr: '맑음',
  conditionEmoji: '',
};

const mockStats = {
  userId: 'test-user-id',
  totalSessions: 10,
  recentSessions: 3,
  overallAverageDuration: 42,
  overallAverageWaitTime: 5,
  overallAverageDelay: 2,
  waitTimePercentage: 12,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [],
  insights: [],
};

const defaultProps = {
  weather: mockWeather,
  airQuality: { label: '좋음', className: 'good' },
  commuteStats: mockStats,
  transitInfos: [],
  routeName: '강남 출근길',
};

describe('MorningBriefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render briefing when route name is provided', () => {
    render(<MorningBriefing {...defaultProps} />);
    // The component renders a section with aria-label
    const section = document.querySelector('.morning-briefing');
    expect(section).toBeInTheDocument();
  });

  it('should return null when routeName is empty', () => {
    const { container } = render(<MorningBriefing {...defaultProps} routeName="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should show context label', () => {
    render(<MorningBriefing {...defaultProps} />);
    // The context label depends on current hour
    const label = document.querySelector('.morning-briefing-label');
    expect(label).toBeInTheDocument();
  });

  it('should show weather info in briefing main text', () => {
    render(<MorningBriefing {...defaultProps} />);
    const mainText = document.querySelector('.morning-briefing-main');
    expect(mainText).toBeInTheDocument();
    // Weather data includes temperature
    expect(mainText?.textContent).toContain('5');
  });

  it('should show sub text with route info', () => {
    render(<MorningBriefing {...defaultProps} />);
    const subText = document.querySelector('.morning-briefing-sub');
    expect(subText).toBeInTheDocument();
  });

  it('should render without weather data', () => {
    render(<MorningBriefing {...defaultProps} weather={null} />);
    const section = document.querySelector('.morning-briefing');
    expect(section).toBeInTheDocument();
  });

  it('should render without commute stats', () => {
    render(<MorningBriefing {...defaultProps} commuteStats={null} />);
    const section = document.querySelector('.morning-briefing');
    expect(section).toBeInTheDocument();
  });

  it('should have proper aria-label for accessibility', () => {
    render(<MorningBriefing {...defaultProps} />);
    const section = document.querySelector('.morning-briefing');
    expect(section).toHaveAttribute('aria-label');
  });
});
