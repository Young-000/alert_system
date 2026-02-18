import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { getTimeContext } from '@/utils/route';

import type { BriefingData } from '@/types/home';

type BriefingCardProps = {
  briefing: BriefingData;
};

export function BriefingCard({
  briefing,
}: BriefingCardProps): React.JSX.Element {
  const context = getTimeContext();
  const backgroundColor =
    context === 'morning'
      ? colors.briefingMorning
      : context === 'evening'
        ? colors.briefingEvening
        : colors.briefingTomorrow;

  return (
    <View
      style={[styles.card, { backgroundColor }]}
      accessibilityRole="summary"
      accessibilityLabel={`${briefing.contextLabel}. ${briefing.main}. ${briefing.sub}`}
    >
      <Text style={styles.contextLabel}>{briefing.contextLabel}</Text>
      <Text style={styles.main}>{briefing.main}</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {briefing.sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 4,
  },
  main: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    color: colors.gray500,
  },
});
