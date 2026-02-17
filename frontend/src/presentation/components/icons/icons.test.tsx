import { render } from '@testing-library/react';
import {
  ChevronIcon,
  CheckIcon,
  MapPinIcon,
  SearchIcon,
  PlusIcon,
  CloseIcon,
  WarningIcon,
} from './index';

const ICONS = [
  { name: 'ChevronIcon', Component: ChevronIcon, defaultSize: 16 },
  { name: 'CheckIcon', Component: CheckIcon, defaultSize: 24 },
  { name: 'MapPinIcon', Component: MapPinIcon, defaultSize: 24 },
  { name: 'SearchIcon', Component: SearchIcon, defaultSize: 24 },
  { name: 'PlusIcon', Component: PlusIcon, defaultSize: 24 },
  { name: 'CloseIcon', Component: CloseIcon, defaultSize: 24 },
  { name: 'WarningIcon', Component: WarningIcon, defaultSize: 24 },
] as const;

describe.each(ICONS)('$name', ({ Component, defaultSize }) => {
  it('기본 크기로 렌더링된다', () => {
    const { container } = render(<Component />);
    const svg = container.querySelector('svg')!;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe(String(defaultSize));
    expect(svg.getAttribute('height')).toBe(String(defaultSize));
  });

  it('커스텀 크기로 렌더링된다', () => {
    const { container } = render(<Component size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('기본적으로 aria-hidden="true"가 적용된다', () => {
    const { container } = render(<Component />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('ariaLabel이 있으면 aria-label이 설정되고 aria-hidden이 제거된다', () => {
    const { container } = render(<Component ariaLabel="테스트 아이콘" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toBe('테스트 아이콘');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('className prop이 SVG에 적용된다', () => {
    const { container } = render(<Component className="my-custom-class" />);
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('my-custom-class')).toBe(true);
  });

  it('stroke와 fill 기본 속성이 올바르다', () => {
    const { container } = render(<Component />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});

describe('ChevronIcon collapsible usage', () => {
  it('collapsible-chevron 클래스가 적용된다', () => {
    const { container } = render(
      <ChevronIcon size={16} className="collapsible-chevron" />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('collapsible-chevron')).toBe(true);
  });

  it('expanded 상태에서 collapsible-chevron--expanded 클래스가 적용된다', () => {
    const { container } = render(
      <ChevronIcon
        size={16}
        className="collapsible-chevron collapsible-chevron--expanded"
      />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('collapsible-chevron--expanded')).toBe(true);
  });
});
