import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type EmptyAlertViewProps = {
  onAdd: () => void;
};

export function EmptyAlertView({ onAdd }: EmptyAlertViewProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔔</Text>
      <Text style={styles.title}>알림이 없어요</Text>
      <Text style={styles.description}>출퇴근 알림을 추가해보세요</Text>
      <Pressable
        style={styles.addButton}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="새 알림 추가"
      >
        <Text style={styles.addButtonText}>+ 새 알림 추가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
