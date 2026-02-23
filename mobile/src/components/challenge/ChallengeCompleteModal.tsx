import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type ChallengeCompleteModalProps = {
  visible: boolean;
  badgeEmoji: string;
  badgeName: string;
  challengeName: string;
  onClose: () => void;
  onViewBadges: () => void;
};

export function ChallengeCompleteModal({
  visible,
  badgeEmoji,
  badgeName,
  challengeName,
  onClose,
  onViewBadges,
}: ChallengeCompleteModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Celebration title */}
          <Text style={styles.celebrationTitle}>
            {'\uD83C\uDF89'} 축하합니다! {'\uD83C\uDF89'}
          </Text>

          {/* Large badge emoji */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeEmoji}>{badgeEmoji}</Text>
          </View>

          {/* Badge name */}
          <Text style={styles.badgeName}>{badgeName} 배지</Text>

          {/* Challenge completion text */}
          <Text style={styles.challengeText}>{challengeName} 달성!</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={styles.primaryButton}
              onPress={onViewBadges}
              accessibilityRole="button"
              accessibilityLabel="배지 보러 가기"
            >
              <Text style={styles.primaryButtonText}>배지 보러 가기</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Text style={styles.secondaryButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 20,
    textAlign: 'center',
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeEmoji: {
    fontSize: 44,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 4,
  },
  challengeText: {
    fontSize: 15,
    color: colors.gray500,
    marginBottom: 28,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray600,
  },
});
