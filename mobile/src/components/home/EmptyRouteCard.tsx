import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';

export function EmptyRouteCard(): React.JSX.Element {
  const router = useRouter();

  const handlePress = (): void => {
    // Navigate to routes/settings tab for route setup
    router.push('/settings');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>출근 경로를 등록해보세요</Text>
      <Text style={styles.description}>
        경로를 등록하면 실시간 교통 정보와{'\n'}
        출퇴근 기록이 자동으로 연결됩니다.
      </Text>
      <Pressable
        style={styles.button}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="경로 등록하기"
      >
        <Text style={styles.buttonText}>경로 등록하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
