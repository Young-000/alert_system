import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type ErrorRetryViewProps = {
  message: string;
  onRetry: () => void;
  /** 재시도가 진행 중이면 버튼을 잠그고 문구를 바꾼다. */
  isRetrying?: boolean;
};

/**
 * 조회 실패를 알리고, 그 자리에서 다음 행동을 준다.
 *
 * 에러 문구만 띄우고 끝내면 사용자가 할 수 있는 일이 없다(당김-새로고침이 있어도
 * 문구를 보고 그걸 떠올릴 이유가 없다). `(tabs)/commute.tsx`가 이미 같은 모양을
 * 쓰고 있고, 이 컴포넌트는 그 관용구를 화면 밖으로 꺼낸 것이다.
 */
export function ErrorRetryView({
  message,
  onRetry,
  isRetrying = false,
}: ErrorRetryViewProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={styles.retryButton}
        onPress={onRetry}
        disabled={isRetrying}
        accessibilityRole="button"
        accessibilityLabel="다시 불러오기"
        accessibilityState={{ disabled: isRetrying }}
      >
        <Text style={styles.retryText}>
          {isRetrying ? '불러오는 중…' : '다시 시도'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    // 터치 타겟 최소 44px
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
