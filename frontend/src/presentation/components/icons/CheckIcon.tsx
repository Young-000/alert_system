import type { IconProps } from './types';

const DEFAULT_SIZE = 24;

export function CheckIcon({
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
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
