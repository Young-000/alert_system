import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommuteMode } from '@/hooks/useCommuteMode';

type ModeBadgeProps = {
  mode: CommuteMode;
  isManualOverride: boolean;
  onToggle: () => void;
};

const MODE_CONFIG: Record<CommuteMode, { emoji: string; label: string; color: string; bgColor: string }> = {
  commute: {
    emoji: '\u{1F305}',
    label: '\uCD9C\uADFC \uBAA8\uB4DC',
    color: '#EA580C',
    bgColor: '#FFF7ED',
  },
  return: {
    emoji: '\u{1F306}',
    label: '\uD1F4\uADFC \uBAA8\uB4DC',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  night: {
    emoji: '\u{1F319}',
    label: '\uB0B4\uC77C \uCD9C\uADFC \uB300\uAE30',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
};

export function ModeBadge({ mode, isManualOverride, onToggle }: ModeBadgeProps): React.JSX.Element {
  const config = MODE_CONFIG[mode];

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.badge, { backgroundColor: config.bgColor }]}
      accessibilityRole="button"
      accessibilityLabel={`${config.label} - \uD0ED\uD558\uC5EC \uC804\uD658`}
    >
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      {isManualOverride ? (
        <View style={styles.manualDot} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  manualDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
    marginLeft: 2,
  },
});
