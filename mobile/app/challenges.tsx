import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeCollectionView } from '@/components/challenge/BadgeCollectionView';
import { colors } from '@/constants/colors';
import { useBadges } from '@/hooks/useBadges';
import { useChallenges } from '@/hooks/useChallenges';

import type { Challenge, ChallengeTemplate, ChallengeDifficulty } from '@/types/challenge';

// ─── Difficulty helpers ─────────────────────────────

const DIFFICULTY_CONFIG: Record<
  ChallengeDifficulty,
  { label: string; color: string; bg: string }
> = {
  easy: { label: '쉬움', color: colors.success, bg: colors.successLight },
  medium: { label: '보통', color: colors.warning, bg: colors.warningLight },
  hard: { label: '어려움', color: colors.danger, bg: colors.dangerLight },
};

// ─── Sub-components ─────────────────────────────────

function DifficultyBadge({
  difficulty,
}: {
  difficulty: ChallengeDifficulty;
}): React.JSX.Element {
  const config = DIFFICULTY_CONFIG[difficulty];
  return (
    <View style={[subStyles.difficultyBadge, { backgroundColor: config.bg }]}>
      <Text style={[subStyles.difficultyText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

function ActiveChallengeItem({
  challenge,
  onAbandon,
}: {
  challenge: Challenge;
  onAbandon: (id: string) => void;
}): React.JSX.Element {
  const percent = Math.min(100, Math.max(0, challenge.progressPercent));

  return (
    <View style={subStyles.activeCard}>
      <View style={subStyles.activeHeader}>
        <View style={subStyles.activeTitleRow}>
          <Text style={subStyles.activeEmoji}>{challenge.template.badgeEmoji}</Text>
          <Text style={subStyles.activeName} numberOfLines={1}>
            {challenge.template.name}
          </Text>
        </View>
        <Text style={subStyles.activeDDay}>
          {challenge.daysRemaining <= 0
            ? 'D-Day'
            : `D-${challenge.daysRemaining}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={subStyles.progressRow}>
        <View style={subStyles.progressTrack}>
          <View
            style={[
              subStyles.progressFill,
              { width: `${percent}%` as `${number}%` },
            ]}
          />
        </View>
        <Text style={subStyles.progressLabel}>
          {challenge.currentProgress}/{challenge.targetProgress}
        </Text>
      </View>

      {/* Abandon button */}
      <Pressable
        style={subStyles.abandonButton}
        onPress={() => onAbandon(challenge.id)}
        accessibilityRole="button"
        accessibilityLabel={`${challenge.template.name} 도전 포기`}
        hitSlop={8}
      >
        <Text style={subStyles.abandonText}>포기</Text>
      </Pressable>
    </View>
  );
}

function TemplateItem({
  template,
  isJoining,
  onJoin,
}: {
  template: ChallengeTemplate;
  isJoining: boolean;
  onJoin: (id: string) => void;
}): React.JSX.Element {
  const statusLabel = template.isCompleted
    ? '완료'
    : template.isJoined
      ? '진행중'
      : '시작';

  const isDisabled = template.isJoined || template.isCompleted || isJoining;

  return (
    <View style={subStyles.templateCard}>
      <View style={subStyles.templateLeft}>
        <Text style={subStyles.templateEmoji}>{template.badgeEmoji}</Text>
        <View style={subStyles.templateInfo}>
          <View style={subStyles.templateNameRow}>
            <Text style={subStyles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <DifficultyBadge difficulty={template.difficulty} />
          </View>
          <Text style={subStyles.templateDescription} numberOfLines={1}>
            {template.description}
          </Text>
        </View>
      </View>

      <Pressable
        style={[
          subStyles.actionButton,
          template.isCompleted && subStyles.actionButtonCompleted,
          template.isJoined && subStyles.actionButtonInProgress,
          !template.isJoined && !template.isCompleted && subStyles.actionButtonStart,
        ]}
        onPress={() => {
          if (!isDisabled) {
            onJoin(template.id);
          }
        }}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${template.name} ${statusLabel}`}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text
            style={[
              subStyles.actionButtonText,
              template.isCompleted && subStyles.actionButtonTextCompleted,
              template.isJoined && subStyles.actionButtonTextInProgress,
            ]}
          >
            {statusLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function EmptyTemplates(): React.JSX.Element {
  return (
    <View style={subStyles.emptyContainer}>
      <Text style={subStyles.emptyIcon}>📋</Text>
      <Text style={subStyles.emptyText}>아직 등록된 도전이 없어요</Text>
    </View>
  );
}

const subStyles = StyleSheet.create({
  // Difficulty badge
  difficultyBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Active challenge item
  activeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  activeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  activeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  activeDDay: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray500,
    minWidth: 28,
    textAlign: 'right',
  },
  abandonButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  abandonText: {
    fontSize: 12,
    color: colors.gray400,
  },
  // Template item
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  templateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  templateEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  templateInfo: {
    flex: 1,
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    flexShrink: 1,
  },
  templateDescription: {
    fontSize: 12,
    color: colors.gray500,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 56,
    alignItems: 'center',
  },
  actionButtonStart: {
    backgroundColor: colors.primary,
  },
  actionButtonInProgress: {
    backgroundColor: colors.primaryLight,
  },
  actionButtonCompleted: {
    backgroundColor: colors.successLight,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  actionButtonTextInProgress: {
    color: colors.primary,
  },
  actionButtonTextCompleted: {
    color: colors.success,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray500,
  },
});

// ─── Main Screen ────────────────────────────────────

export default function ChallengesScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    templates,
    categories,
    activeChallenges,
    isLoading,
    isRefreshing,
    error,
    refresh,
    joinChallenge,
    abandonChallenge,
  } = useChallenges();

  // 배지 조회 실패를 받지 않으면 badges가 빈 배열로 남아 배지 6개가 전부 잠금(0/6)으로
  // 그려진다 — 이미 배지를 딴 사용자에게 "하나도 없다"고 말하는 거짓 화면이고,
  // 화면 어디에도 못 불러왔다는 흔적이 없다.
  const {
    badges,
    totalBadges,
    earnedCount,
    isLoading: isBadgesLoading,
    error: badgesError,
    refresh: refreshBadges,
  } = useBadges();

  const [joiningId, setJoiningId] = useState<string | null>(null);

  // 두 조회 중 하나라도 실패하면 배너로 알린다. 재시도는 두 조회를 함께 다시 태운다.
  const loadError = error ?? badgesError;

  const handleRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([refresh(), refreshBadges()]);
  }, [refresh, refreshBadges]);

  const handleJoin = useCallback(
    async (templateId: string): Promise<void> => {
      if (joiningId) return; // Prevent double-tap
      setJoiningId(templateId);

      try {
        const result = await joinChallenge(templateId);
        if (result.joined) {
          void refreshBadges();
        } else {
          // 사유는 서버가 정한다 — 참가 상한과 중복 참가는 문구가 다르다.
          RNAlert.alert('알림', result.message);
        }
      } finally {
        setJoiningId(null);
      }
    },
    [joiningId, joinChallenge, refreshBadges],
  );

  const handleAbandon = useCallback(
    (challengeId: string): void => {
      const target = activeChallenges.find((c) => c.id === challengeId);
      const name = target?.template.name ?? '이 도전';

      RNAlert.alert(
        '도전 포기',
        `"${name}"을 정말 포기하시겠습니까? 진행률이 초기화됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '포기',
            style: 'destructive',
            onPress: async () => {
              const result = await abandonChallenge(challengeId);
              if (!result.abandoned) {
                RNAlert.alert('도전을 포기하지 못했어요', result.message);
              }
            },
          },
        ],
      );
    },
    [activeChallenges, abandonChallenge],
  );

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: { key: string; label: string; emoji: string; items: ChallengeTemplate[] }[] = [];

    for (const cat of categories) {
      const items = templates.filter((t) => t.category === cat.key);
      if (items.length > 0) {
        groups.push({
          key: cat.key,
          label: cat.label,
          emoji: cat.emoji,
          items,
        });
      }
    }
    return groups;
  }, [templates, categories]);

  // ── Loading state ──
  if (isLoading || isBadgesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </Pressable>
          <Text style={styles.title}>도전 목록</Text>
        </View>

        {/* Error notice — 읽고 끝나지 않도록 다음 행동을 같이 둔다. */}
        {loadError ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void handleRefresh()}
              disabled={isRefreshing}
              accessibilityRole="button"
              accessibilityLabel="다시 불러오기"
            >
              <Text style={styles.retryText}>
                {isRefreshing ? '불러오는 중…' : '다시 시도'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Badge Collection ──
            못 불러온 배지를 "미획득"으로 그리면 안 된다. 잠금 아이콘과 0/6은
            "아직 못 땄다"는 뜻이라, 조회 실패를 그대로 두면 화면이 거짓말을 한다.
            (챌린지만 실패한 경우에는 배지를 계속 보여준다 — 그건 받아온 값이다) */}
        {badgesError ? null : (
          <BadgeCollectionView
            badges={badges}
            totalBadges={totalBadges}
            earnedCount={earnedCount}
          />
        )}

        {/* ── My Active Challenges ── */}
        {activeChallenges.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>내 도전</Text>
            {activeChallenges.map((challenge) => (
              <ActiveChallengeItem
                key={challenge.id}
                challenge={challenge}
                onAbandon={handleAbandon}
              />
            ))}
          </View>
        ) : null}

        {/* ── Template Categories ──
            목록이 비는 이유는 둘이다: 정말 없거나, 못 불러왔거나.
            후자에 "등록된 도전이 없어요"를 띄우면 위 에러 배너와 정면으로 어긋난다. */}
        {groupedTemplates.length === 0 ? (
          error ? null : <EmptyTemplates />
        ) : (
          groupedTemplates.map((group) => (
            <View key={group.key} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {group.emoji} {group.label}
              </Text>
              {group.items.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isJoining={joiningId === template.id}
                  onJoin={handleJoin}
                />
              ))}
            </View>
          ))
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray700,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  errorNotice: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 10,
  },
  bottomSpacer: {
    height: 20,
  },
});
