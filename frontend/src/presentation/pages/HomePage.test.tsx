import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('should render home page', () => {
    render(<HomePage />);
    expect(screen.getByText('Alert System')).toBeInTheDocument();
  });
});

