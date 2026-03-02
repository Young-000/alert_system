import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertSection } from './AlertSection';

function renderComponent(nextAlert: { time: string; label: string } | null = null): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AlertSection nextAlert={nextAlert} />
    </MemoryRouter>
  );
}

describe('AlertSection', () => {
  // --- With next alert ---

  it('should show scheduled alert info when nextAlert is provided', () => {
    renderComponent({ time: '08:00', label: '날씨 + 미세먼지' });

    expect(screen.getByText('예정된 알림')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('날씨 + 미세먼지')).toBeInTheDocument();
  });

  it('should link to alerts page when next alert is shown', () => {
    renderComponent({ time: '08:00', label: '날씨' });

    const link = screen.getByText('예정된 알림').closest('a');
    expect(link).toHaveAttribute('href', '/alerts');
  });

  // --- Without next alert ---

  it('should show alert setup CTA when no next alert', () => {
    renderComponent(null);

    expect(screen.getByText('알림을 설정하면 출발 전 날씨와 교통 정보를 알려드려요')).toBeInTheDocument();
  });

  it('should link to alerts page in CTA', () => {
    renderComponent(null);

    const link = screen.getByText('알림을 설정하면 출발 전 날씨와 교통 정보를 알려드려요').closest('a');
    expect(link).toHaveAttribute('href', '/alerts');
  });

  // --- Accessibility ---

  it('should have section with aria-label', () => {
    renderComponent(null);
    expect(screen.getByRole('region', { name: '알림' })).toBeInTheDocument();
  });
});
