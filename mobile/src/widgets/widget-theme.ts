/**
 * Android widget theme constants.
 * Matches the iOS widget color scheme for visual parity.
 */

// ─── Background & Text ──────────────────────────────

export const WIDGET_COLORS = {
  background: '#FFFFFF',
  backgroundDark: '#1F2937',
  primaryText: '#111827',
  primaryTextDark: '#F9FAFB',
  secondaryText: '#6B7280',
  secondaryTextDark: '#9CA3AF',
  divider: '#E5E7EB',
  dividerDark: '#374151',
} as const;

// ─── AQI Status Colors ──────────────────────────────

export type AqiStatusLevel = 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';

type HexColor = `#${string}`;

type AqiColorSet = {
  readonly background: HexColor;
  readonly text: HexColor;
  readonly label: string;
};

export const AQI_COLORS: Record<AqiStatusLevel, AqiColorSet> = {
  good: {
    background: '#10B981',
    text: '#065F46',
    label: '좋음',
  },
  moderate: {
    background: '#F59E0B',
    text: '#92400E',
    label: '보통',
  },
  unhealthy: {
    background: '#EF4444',
    text: '#991B1B',
    label: '나쁨',
  },
  veryUnhealthy: {
    background: '#7C3AED',
    text: '#4C1D95',
    label: '매우나쁨',
  },
} as const;

// ─── Font Sizes ──────────────────────────────────────

export const FONT_SIZES = {
  small: {
    primary: 14,
    secondary: 12,
    emoji: 16,
  },
  medium: {
    primary: 14,
    secondary: 12,
    emoji: 18,
    label: 11,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────

export const WIDGET_PADDING = {
  small: 12,
  medium: 12,
} as const;

// ─── Border Radius ───────────────────────────────────

export const WIDGET_RADIUS = 16;

// ─── AQI Badge Dimensions ────────────────────────────

export const AQI_BADGE = {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
  fontSize: 11,
} as const;

// ─── Helper: Get AQI color set by status level ───────

export function getAqiColors(statusLevel: string): AqiColorSet {
  if (statusLevel in AQI_COLORS) {
    return AQI_COLORS[statusLevel as AqiStatusLevel];
  }
  // Default to 'good' for unknown status levels
  return AQI_COLORS.good;
}

// ─── Helper: Get AQI label from status string ────────

export function getAqiLabel(status: string): string {
  const statusMap: Record<string, string> = {
    good: '좋음',
    moderate: '보통',
    unhealthy: '나쁨',
    veryUnhealthy: '매우나쁨',
  };
  return statusMap[status] ?? status;
}
