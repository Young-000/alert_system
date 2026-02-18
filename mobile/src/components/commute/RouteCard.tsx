import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { RouteResponse } from '@/types/home';

type RouteCardProps = {
  route: RouteResponse;
  onPress: () => void;
  onTogglePreferred: () => void;
};

const ROUTE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  morning: { label: '출근', color: colors.primary, bg: colors.primaryLight },
  evening: { label: '퇴근', color: colors.orange, bg: colors.orangeLight },
  custom: { label: '커스텀', color: colors.gray600, bg: colors.gray100 },
};

function calculateDuration(route: RouteResponse): string {
  if (route.totalExpectedDuration) {
    return `약 ${route.totalExpectedDuration}분`;
  }

  const sum = route.checkpoints.reduce(
    (acc, cp) => acc + (cp.expectedDurationToNext ?? 0),
    0,
  );
  return sum > 0 ? `약 ${sum}분` : '-- 분';
}

export function RouteCard({
  route,
  onPress,
  onTogglePreferred,
}: RouteCardProps): React.JSX.Element {
  const typeInfo = ROUTE_TYPE_LABELS[route.routeType] ?? ROUTE_TYPE_LABELS.custom;
  const checkpointCount = route.checkpoints.length;
  const duration = calculateDuration(route);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${route.name} 경로, ${typeInfo.label}, ${checkpointCount}개 체크포인트, ${duration}`}
    >
      {/* Star toggle */}
      <Pressable
        style={styles.starButton}
        onPress={(e) => {
          e.stopPropagation();
          onTogglePreferred();
        }}
        accessibilityRole="button"
        accessibilityLabel={route.isPreferred ? '즐겨찾기 해제' : '즐겨찾기 등록'}
        hitSlop={8}
      >
        <Text style={styles.starIcon}>
          {route.isPreferred ? '★' : '☆'}
        </Text>
      </Pressable>

      {/* Route info */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {route.name}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {checkpointCount}개 체크포인트 · {duration}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  starButton: {
    marginRight: 12,
    padding: 4,
  },
  starIcon: {
    fontSize: 22,
    color: colors.warning,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: colors.gray500,
  },
});
