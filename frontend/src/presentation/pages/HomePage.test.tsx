import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('should render home page', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    const elements = screen.getAllByText('출퇴근 메이트');
    expect(elements.length).toBeGreaterThan(0);
  });
});
