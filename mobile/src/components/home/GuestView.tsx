import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';

export function GuestView(): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>출퇴근 메이트</Text>
      <Text style={styles.description}>
        매일 아침, 날씨와 교통 정보를{'\n'}
        한눈에 확인하세요.
      </Text>

      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="로그인"
        >
          <Text style={styles.primaryButtonText}>로그인</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="회원가입"
        >
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </Pressable>
      </View>
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
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gray900,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
});
