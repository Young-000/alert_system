import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type EmptyPlaceViewProps = {
  onAddPlace: () => void;
};

export function EmptyPlaceView({ onAddPlace }: EmptyPlaceViewProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.title}>등록된 장소가 없어요</Text>
      <Text style={styles.description}>
        집과 회사를 등록하면{'\n'}출퇴근을 자동으로 감지해요
      </Text>
      <Pressable
        style={styles.button}
        onPress={onAddPlace}
        accessibilityRole="button"
        accessibilityLabel="장소 등록하기"
      >
        <Text style={styles.buttonText}>장소 등록하기</Text>
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
