import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { NotificationStatsDto } from '@/types/notification';

type NotificationStatsSummaryProps = {
  stats: NotificationStatsDto | null;
};

export function NotificationStatsSummary({
  stats,
}: NotificationStatsSummaryProps): React.JSX.Element | null {
  if (!stats) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.pill, styles.totalPill]}>
        <Text style={[styles.pillText, styles.totalText]}>총 {stats.total}</Text>
      </View>
      <View style={[styles.pill, styles.successPill]}>
        <Text style={[styles.pillText, styles.successText]}>성공 {stats.success}</Text>
      </View>
      <View style={[styles.pill, styles.failedPill]}>
        <Text style={[styles.pillText, styles.failedText]}>실패 {stats.failed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalPill: {
    backgroundColor: colors.gray100,
  },
  totalText: {
    color: colors.gray700,
  },
  successPill: {
    backgroundColor: colors.successLight,
  },
  successText: {
    color: colors.success,
  },
  failedPill: {
    backgroundColor: colors.dangerLight,
  },
  failedText: {
    color: colors.danger,
  },
});
