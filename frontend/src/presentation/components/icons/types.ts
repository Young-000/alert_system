export type IconProps = {
  /** Icon size in pixels. Defaults to 24. */
  readonly size?: number;
  /** Additional CSS class names applied to the SVG root element. */
  readonly className?: string;
  /** Accessible label. When provided, aria-hidden is removed and aria-label is set. */
  readonly ariaLabel?: string;
};
