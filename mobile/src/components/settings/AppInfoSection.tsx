import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { colors } from '@/constants/colors';

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function AppInfoSection(): React.JSX.Element {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildDate =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.buildDate as
      | string
      | undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>앱 정보</Text>
      <View style={styles.card}>
        <InfoRow label="버전" value={version} />
        <View style={styles.separator} />
        <InfoRow label="빌드" value={buildDate ?? '-'} />
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
  },
  infoValue: {
    fontSize: 14,
    color: colors.gray500,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
});
