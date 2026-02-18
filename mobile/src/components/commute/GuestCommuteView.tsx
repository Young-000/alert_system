import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';

export function GuestCommuteView(): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚇</Text>
      <Text style={styles.title}>로그인이 필요합니다</Text>
      <Text style={styles.description}>
        경로 관리와 알림 기록을 보려면{'\n'}먼저 로그인해주세요
      </Text>
      <Pressable
        style={styles.loginButton}
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="로그인하기"
      >
        <Text style={styles.loginButtonText}>로그인하기</Text>
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
    lineHeight: 22,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
