import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type NotificationSectionProps = {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  onToggle: (value: boolean) => void;
};

export function NotificationSection({
  isEnabled,
  isLoading,
  error,
  onToggle,
}: NotificationSectionProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>푸시 알림</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.icon}>📱</Text>
            <View style={styles.textContainer}>
              <Text style={styles.label}>알림 받기</Text>
              <Text style={styles.description}>
                {isEnabled
                  ? '날씨, 교통 알림을 푸시로 받습니다.'
                  : '알림을 끄면 카카오 알림톡으로만 발송됩니다.'}
              </Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={onToggle}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={isEnabled ? colors.primary : colors.gray400}
              accessibilityRole="switch"
              accessibilityLabel="푸시 알림 토글"
              accessibilityState={{ checked: isEnabled }}
            />
          )}
        </View>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 18,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
});
