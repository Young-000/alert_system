import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { NotificationStatsDto } from '@/types/notification';

type NotificationStatsSummaryProps = {
  stats: NotificationStatsDto | null;
  /**
   * 조회 실패 사유. 성공이면 null.
   *
   * `stats`가 없으면 이 컴포넌트는 아무것도 그리지 않는다 — 그래서 실패를
   * 받지 못하면 **못 불러온 화면과 발송 0건인 화면이 똑같아진다.** 옵셔널로
   * 두면 배선을 빠뜨려도 조용히 통과해 같은 자리로 되돌아오므로 필수로 둔다.
   */
  error: string | null;
  onRetry: () => void;
};

export function NotificationStatsSummary({
  stats,
  error,
  onRetry,
}: NotificationStatsSummaryProps): React.JSX.Element | null {
  if (error) {
    return (
      <View style={styles.errorRow}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.errorRetry}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="발송 통계 다시 불러오기"
        >
          <Text style={styles.errorRetryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray600,
  },
  errorRetry: {
    // 터치 타겟 44px (체크리스트 6-6)
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  errorRetryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
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
