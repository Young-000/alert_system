import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { NotificationLog } from '@/types/notification';

type NotificationItemProps = {
  item: NotificationLog;
};

const ALERT_TYPE_ICONS: Record<string, string> = {
  weather: '\u{1F324}\u{FE0F}', // sun behind cloud
  airQuality: '\u{1F637}', // face with mask
  bus: '\u{1F68C}', // bus
  subway: '\u{1F687}', // metro
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  success: { label: '성공', color: colors.success, bg: colors.successLight },
  fallback: { label: '대체', color: colors.warning, bg: colors.warningLight },
  failed: { label: '실패', color: colors.danger, bg: colors.dangerLight },
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return `${hours}:${minutes}`;
  }

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function NotificationItem({ item }: NotificationItemProps): React.JSX.Element {
  const statusInfo = STATUS_CONFIG[item.status] ?? {
    label: item.status,
    color: colors.gray500,
    bg: colors.gray100,
  };

  const typeIcons = item.alertTypes
    .map((type) => ALERT_TYPE_ICONS[type])
    .filter(Boolean)
    .join(' ');

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${formatTime(item.sentAt)} ${item.alertName} ${statusInfo.label}`}
    >
      {/* Time */}
      <Text style={styles.time}>{formatTime(item.sentAt)}</Text>

      {/* Alert info */}
      <View style={styles.infoSection}>
        <Text style={styles.alertName} numberOfLines={1}>
          {item.alertName}
        </Text>
        {typeIcons ? <Text style={styles.typeIcons}>{typeIcons}</Text> : null}
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
    width: 52,
    marginRight: 10,
  },
  infoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  typeIcons: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
