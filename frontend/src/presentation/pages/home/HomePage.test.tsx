import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('should render home page', () => {
    render(
      <TestProviders>
        <HomePage />
      </TestProviders>
    );
    const elements = screen.getAllByText('출퇴근 메이트');
    expect(elements.length).toBeGreaterThan(0);
  });
});
