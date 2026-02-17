import type { IconProps } from './types';

const DEFAULT_SIZE = 16;

export function ChevronIcon({
  size = DEFAULT_SIZE,
  className = '',
  ariaLabel,
}: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
