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
    // 여러 곳에 Alert System 텍스트가 있으므로 getAllByText 사용
    const elements = screen.getAllByText('Alert System');
    expect(elements.length).toBeGreaterThan(0);
  });
});
