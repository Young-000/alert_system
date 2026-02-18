import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type EmptySmartDepartureViewProps = {
  onSetup: () => void;
};

export function EmptySmartDepartureView({
  onSetup,
}: EmptySmartDepartureViewProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚀</Text>
      <Text style={styles.title}>스마트 출발 설정이 없어요</Text>
      <Text style={styles.description}>
        스마트 출발을 설정하면{'\n'}최적 출발 시각을 알려드려요
      </Text>
      <Pressable
        style={styles.button}
        onPress={onSetup}
        accessibilityRole="button"
        accessibilityLabel="스마트 출발 설정하기"
      >
        <Text style={styles.buttonText}>설정하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
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
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
