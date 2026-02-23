import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { Badge } from '@/types/challenge';

type BadgeCollectionViewProps = {
  badges: Badge[];
  totalBadges: number;
  earnedCount: number;
};

type BadgeDefinition = {
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
};

const ALL_BADGES: BadgeDefinition[] = [
  { badgeId: 'lightning', badgeName: '번개', badgeEmoji: '\u26A1' },
  { badgeId: 'rocket', badgeName: '로켓', badgeEmoji: '\uD83D\uDE80' },
  { badgeId: 'fire', badgeName: '불꽃', badgeEmoji: '\uD83D\uDD25' },
  { badgeId: 'crown', badgeName: '왕관', badgeEmoji: '\uD83D\uDC51' },
  { badgeId: 'calendar', badgeName: '달력', badgeEmoji: '\uD83D\uDCC5' },
  { badgeId: 'star', badgeName: '별', badgeEmoji: '\u2B50' },
];

function formatEarnedDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

type BadgeItemProps = {
  definition: BadgeDefinition;
  earned: Badge | undefined;
};

function BadgeItem({ definition, earned }: BadgeItemProps): React.JSX.Element {
  const isEarned = earned !== undefined;

  return (
    <View
      style={styles.badgeItem}
      accessibilityLabel={
        isEarned
          ? `${definition.badgeName} 배지, 획득 완료`
          : `${definition.badgeName} 배지, 미획득`
      }
    >
      <View style={[styles.badgeCircle, !isEarned && styles.badgeCircleLocked]}>
        <Text style={[styles.badgeEmoji, !isEarned && styles.badgeEmojiLocked]}>
          {isEarned ? definition.badgeEmoji : '\uD83D\uDD12'}
        </Text>
      </View>
      <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>
        {definition.badgeName}
      </Text>
      {isEarned ? (
        <Text style={styles.earnedDate}>{formatEarnedDate(earned.earnedAt)}</Text>
      ) : null}
    </View>
  );
}

export function BadgeCollectionView({
  badges,
  earnedCount,
}: BadgeCollectionViewProps): React.JSX.Element {
  const badgeMap = useMemo(() => {
    const map = new Map<string, Badge>();
    for (const badge of badges) {
      map.set(badge.badgeId, badge);
    }
    return map;
  }, [badges]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        내 배지 ({earnedCount}/{ALL_BADGES.length})
      </Text>
      <View style={styles.grid}>
        {ALL_BADGES.map((def) => (
          <BadgeItem
            key={def.badgeId}
            definition={def}
            earned={badgeMap.get(def.badgeId)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeCircleLocked: {
    backgroundColor: colors.gray100,
    opacity: 0.6,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: colors.gray400,
  },
  earnedDate: {
    fontSize: 11,
    color: colors.gray400,
  },
});
