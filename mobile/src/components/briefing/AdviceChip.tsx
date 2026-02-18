import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { AdviceSeverity } from '@/types/briefing';

// ─── Severity Color Map ─────────────────────────────

const SEVERITY_COLORS: Record<
  AdviceSeverity,
  { background: string; text: string }
> = {
  info: {
    background: colors.gray100,
    text: colors.gray700,
  },
  warning: {
    background: '#FEF3C7', // amber-100
    text: '#92400E', // amber-800
  },
  danger: {
    background: '#FEE2E2', // red-100
    text: '#991B1B', // red-800
  },
};

// ─── Props ──────────────────────────────────────────

type AdviceChipProps = {
  icon: string;
  message: string;
  severity: AdviceSeverity;
};

// ─── Component ──────────────────────────────────────

export function AdviceChip({
  icon,
  message,
  severity,
}: AdviceChipProps): React.JSX.Element {
  const colorScheme = SEVERITY_COLORS[severity];

  return (
    <View
      style={[styles.chip, { backgroundColor: colorScheme.background }]}
      accessibilityRole="text"
      accessibilityLabel={`${message}`}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        style={[styles.message, { color: colorScheme.text }]}
        numberOfLines={2}
      >
        {message}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
});
