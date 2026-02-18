import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type NextAlertCardProps = {
  time: string;
  label: string;
};

export function NextAlertCard({
  time,
  label,
}: NextAlertCardProps): React.JSX.Element {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.row}>
        <Text style={styles.icon}>🔔</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>다음 알림</Text>
          <Text style={styles.detail}>
            {time} · {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 2,
  },
  detail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray900,
  },
});
