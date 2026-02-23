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
import { ApiError } from '@/services/api-client';

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

  const {
    badges,
    totalBadges,
    earnedCount,
    isLoading: isBadgesLoading,
    refresh: refreshBadges,
  } = useBadges();

  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([refresh(), refreshBadges()]);
  }, [refresh, refreshBadges]);

  const handleJoin = useCallback(
    async (templateId: string): Promise<void> => {
      if (joiningId) return; // Prevent double-tap
      setJoiningId(templateId);

      try {
        const success = await joinChallenge(templateId);
        if (success) {
          void refreshBadges();
        } else {
          RNAlert.alert('오류', '도전 참가에 실패했습니다.');
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            RNAlert.alert('알림', '이미 진행 중인 동일 도전이 있습니다');
          } else if (err.status === 400) {
            RNAlert.alert('알림', '동시 진행 가능한 도전은 최대 3개입니다');
          } else {
            RNAlert.alert('오류', '도전 참가에 실패했습니다.');
          }
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
              const success = await abandonChallenge(challengeId);
              if (!success) {
                RNAlert.alert('오류', '도전 포기에 실패했습니다.');
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

        {/* Error notice */}
        {error ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Badge Collection ── */}
        <BadgeCollectionView
          badges={badges}
          totalBadges={totalBadges}
          earnedCount={earnedCount}
        />

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

        {/* ── Template Categories ── */}
        {groupedTemplates.length === 0 ? (
          <EmptyTemplates />
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
