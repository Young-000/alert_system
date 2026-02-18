import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';

type LinkRowProps = {
  icon: string;
  label: string;
  onPress: () => void;
};

function LinkRow({ icon, label, onPress }: LinkRowProps): React.JSX.Element {
  return (
    <Pressable
      style={styles.linkRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.linkIcon}>{icon}</Text>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.chevron}>{'>'}</Text>
    </Pressable>
  );
}

export function QuickLinksSection(): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>바로가기</Text>
      <View style={styles.card}>
        <LinkRow
          icon="🔔"
          label="알림 설정"
          onPress={() => router.navigate('/(tabs)/alerts')}
        />
        <View style={styles.separator} />
        <LinkRow
          icon="🚇"
          label="경로 관리"
          onPress={() => router.navigate('/(tabs)/commute')}
        />
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
  },
  chevron: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
});
