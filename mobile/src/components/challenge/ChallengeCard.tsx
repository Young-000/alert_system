import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { Challenge } from '@/types/challenge';

type ChallengeCardProps = {
  challenges: Challenge[];
  /** 조회 실패 사유. 있으면 진행 중인 도전을 아는 척하지 않는다. */
  error: string | null;
  onPress: () => void;
};

function formatDaysRemaining(days: number): string {
  if (days <= 0) return 'D-Day';
  return `D-${days}`;
}

function ProgressBar({ percent }: { percent: number }): React.JSX.Element {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <View style={progressStyles.track}>
      <View
        style={[
          progressStyles.fill,
          { width: `${clampedPercent}%` as `${number}%` },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
});

function EmptyState({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="도전 목록으로 이동"
    >
      <View style={styles.emptyContent}>
        <Text style={styles.emptyEmoji}>🏆</Text>
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyTitle}>출퇴근 도전을 시작해보세요!</Text>
          <Text style={styles.emptyDescription}>
            매일의 출퇴근이 더 재미있어져요
          </Text>
        </View>
        <Text style={styles.emptyArrow}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

/**
 * 조회 실패. 여기서 바로 재시도하지는 않고 도전 목록으로 보낸다 —
 * 그 화면에 이미 재시도 배너가 있어서, 카드마다 재시도를 늘리지 않고도 길이 이어진다.
 */
function ErrorState({
  message,
  onPress,
}: {
  message: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${message}. 도전 목록으로 이동`}
    >
      <View style={styles.emptyContent}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyTitle}>{message}</Text>
          <Text style={styles.emptyDescription}>탭하면 다시 시도할 수 있어요</Text>
        </View>
        <Text style={styles.emptyArrow}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

function ActiveState({
  challenges,
  onPress,
}: {
  challenges: Challenge[];
  onPress: () => void;
}): React.JSX.Element {
  const first = challenges[0];
  if (!first) return <EmptyState onPress={onPress} />;

  const otherCount = challenges.length - 1;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${first.template.name} 도전, ${first.currentProgress}/${first.targetProgress} 진행 중`}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{first.template.badgeEmoji}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {first.template.name}
          </Text>
        </View>
        <Text style={styles.dDay}>{formatDaysRemaining(first.daysRemaining)}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarWrapper}>
          <ProgressBar percent={first.progressPercent} />
        </View>
        <Text style={styles.progressText}>
          {first.currentProgress}/{first.targetProgress}
        </Text>
      </View>

      {/* Close-to-completion message */}
      {first.isCloseToCompletion ? (
        <Text style={styles.encourageText}>
          {first.targetProgress - first.currentProgress === 1
            ? `1회만 더 달성하면 ${first.template.badgeEmoji} 배지 획득!`
            : `${first.targetProgress - first.currentProgress}회만 더 달성하면 ${first.template.badgeEmoji} 배지 획득!`}
        </Text>
      ) : null}

      {/* Other challenges indicator */}
      {otherCount > 0 ? (
        <Text style={styles.otherText}>
          + {otherCount}개 더 진행 중
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ChallengeCard({
  challenges,
  error,
  onPress,
}: ChallengeCardProps): React.JSX.Element {
  // 목록이 비는 이유는 둘이다: 정말 없거나, 못 불러왔거나.
  // 후자에 "도전을 시작해보세요"를 띄우면 이미 도전 중인 사용자에게 거짓말이 된다.
  if (error) {
    return <ErrorState message={error} onPress={onPress} />;
  }

  if (challenges.length === 0) {
    return <EmptyState onPress={onPress} />;
  }

  return <ActiveState challenges={challenges} onPress={onPress} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  // ── Empty state ──
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.gray500,
  },
  emptyArrow: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray400,
    marginLeft: 8,
  },
  // ── Active state ──
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  emoji: {
    fontSize: 18,
    marginRight: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  dDay: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarWrapper: {
    flex: 1,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
    minWidth: 32,
    textAlign: 'right',
  },
  encourageText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
    marginTop: 8,
  },
  otherText: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: 'right',
    marginTop: 6,
  },
});
