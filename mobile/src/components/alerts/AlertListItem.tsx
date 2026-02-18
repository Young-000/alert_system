import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { formatAlertTime, formatAlertTypes, formatDaysShort, parseCronDays } from '@/utils/cron';

import type { Alert } from '@/types/alert';

type AlertListItemProps = {
  alert: Alert;
  onPress: () => void;
  onToggle: () => void;
};

export function AlertListItem({
  alert,
  onPress,
  onToggle,
}: AlertListItemProps): React.JSX.Element {
  const time = formatAlertTime(alert.schedule);
  const days = parseCronDays(alert.schedule);
  const daysLabel = formatDaysShort(days);
  const typesLabel = formatAlertTypes(alert.alertTypes);

  return (
    <Pressable
      style={[styles.card, !alert.enabled && styles.cardDisabled]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${alert.name} 알림, ${time}, ${daysLabel}`}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.time, !alert.enabled && styles.textDisabled]}
            numberOfLines={1}
          >
            {time}
          </Text>
          <Text
            style={[styles.name, !alert.enabled && styles.textDisabled]}
            numberOfLines={1}
          >
            {alert.name}
          </Text>
        </View>
        <Text
          style={[styles.meta, !alert.enabled && styles.metaDisabled]}
          numberOfLines={1}
        >
          {daysLabel} · {typesLabel}
        </Text>
      </View>

      <Switch
        value={alert.enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray300, true: colors.primary }}
        thumbColor={colors.white}
        accessibilityLabel={`${alert.name} 알림 ${alert.enabled ? '활성' : '비활성'}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  time: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  textDisabled: {
    color: colors.gray400,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
    flex: 1,
  },
  meta: {
    fontSize: 13,
    color: colors.gray500,
  },
  metaDisabled: {
    color: colors.gray400,
  },
});
