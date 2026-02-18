import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { formatRelativeTime } from '@/utils/format';
import { buildRouteSummary } from '@/utils/route';
import { SkeletonBox } from '@/components/SkeletonBox';

import type {
  BusArrival,
  RouteResponse,
  SubwayArrival,
  TransitArrivalInfo,
} from '@/types/home';

type TransitCardProps = {
  route: RouteResponse;
  transitInfos: TransitArrivalInfo[];
  lastTransitUpdate: number | null;
  isTransitRefreshing: boolean;
};

export function TransitCard({
  route,
  transitInfos,
  lastTransitUpdate,
  isTransitRefreshing,
}: TransitCardProps): React.JSX.Element {
  // Update relative time display every 10 seconds
  const [relativeTime, setRelativeTime] = useState(
    formatRelativeTime(lastTransitUpdate),
  );

  useEffect(() => {
    setRelativeTime(formatRelativeTime(lastTransitUpdate));
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastTransitUpdate));
    }, 10_000);
    return () => clearInterval(timer);
  }, [lastTransitUpdate]);

  const routeTypeBadge =
    route.routeType === 'morning'
      ? '출근'
      : route.routeType === 'evening'
        ? '퇴근'
        : '커스텀';

  const sortedCheckpoints = [...route.checkpoints].sort(
    (a, b) => a.sequenceOrder - b.sequenceOrder,
  );
  const routeSummary = buildRouteSummary(sortedCheckpoints);

  return (
    <View style={styles.card} accessibilityRole="summary">
      {/* Route header */}
      <View style={styles.headerRow}>
        <View style={styles.routeTypeBadge}>
          <Text style={styles.routeTypeBadgeText}>{routeTypeBadge}</Text>
        </View>
        <Text style={styles.routeName} numberOfLines={1}>
          {route.name}
        </Text>
      </View>

      {/* Route summary */}
      {routeSummary ? (
        <Text style={styles.routeSummary} numberOfLines={1}>
          {routeSummary}
        </Text>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Transit header */}
      <View style={styles.transitHeaderRow}>
        <Text style={styles.transitHeaderLabel}>실시간 교통</Text>
        <Text style={styles.timestamp}>{relativeTime}</Text>
      </View>

      {/* Transit items */}
      {transitInfos.length === 0 && !isTransitRefreshing && (
        <Text style={styles.emptyText}>실시간 교통 정보가 없습니다</Text>
      )}

      {transitInfos.length === 0 && isTransitRefreshing && (
        <View>
          <SkeletonBox width="100%" height={40} borderRadius={8} />
          <SkeletonBox
            width="100%"
            height={40}
            borderRadius={8}
            style={styles.mt8}
          />
        </View>
      )}

      {transitInfos.map((info, index) => (
        <TransitItem key={`${info.type}-${info.name}-${index}`} info={info} />
      ))}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Start commute button (disabled in Phase 1) */}
      <Pressable
        style={styles.startButton}
        accessibilityRole="button"
        accessibilityLabel="출발하기"
        disabled
      >
        <Text style={styles.startButtonText}>출발하기</Text>
      </Pressable>
    </View>
  );
}

// ─── Transit Item Sub-Component ───────────────────

function TransitItem({
  info,
}: {
  info: TransitArrivalInfo;
}): React.JSX.Element {
  const typeEmoji = info.type === 'subway' ? '🚇' : '🚌';
  const typeLabel = info.type === 'subway' ? '지하철' : '버스';

  if (info.error) {
    return (
      <View style={styles.transitItem}>
        <View style={styles.transitItemLeft}>
          <Text style={styles.transitEmoji}>{typeEmoji}</Text>
          <View>
            <Text style={styles.transitTypeLabel}>{typeLabel}</Text>
            <Text style={styles.transitName}>{info.name}</Text>
          </View>
        </View>
        <Text style={styles.transitError}>{info.error}</Text>
      </View>
    );
  }

  if (info.isLoading) {
    return (
      <View style={styles.transitItem}>
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </View>
    );
  }

  if (info.arrivals.length === 0) {
    return (
      <View style={styles.transitItem}>
        <View style={styles.transitItemLeft}>
          <Text style={styles.transitEmoji}>{typeEmoji}</Text>
          <View>
            <Text style={styles.transitTypeLabel}>{typeLabel}</Text>
            <Text style={styles.transitName}>{info.name}</Text>
          </View>
        </View>
        <Text style={styles.transitNoData}>운행 정보 없음</Text>
      </View>
    );
  }

  const arrival = info.arrivals[0]!;
  const isSoon = arrival.arrivalTime <= 2;

  return (
    <View style={styles.transitItem}>
      <View style={styles.transitItemLeft}>
        <Text style={styles.transitEmoji}>{typeEmoji}</Text>
        <View>
          <Text style={styles.transitTypeLabel}>{typeLabel}</Text>
          <Text style={styles.transitName}>{info.name}</Text>
        </View>
      </View>
      <View style={styles.transitItemRight}>
        {info.type === 'subway' ? (
          <SubwayArrivalInfo
            arrival={arrival as SubwayArrival}
            isSoon={isSoon}
          />
        ) : (
          <BusArrivalInfo arrival={arrival as BusArrival} isSoon={isSoon} />
        )}
      </View>
    </View>
  );
}

function SubwayArrivalInfo({
  arrival,
  isSoon,
}: {
  arrival: SubwayArrival;
  isSoon: boolean;
}): React.JSX.Element {
  const timeText =
    arrival.arrivalTime <= 0 ? '곧 도착' : `${arrival.arrivalTime}분`;

  return (
    <View style={styles.arrivalInfo}>
      <Text style={styles.arrivalDestination} numberOfLines={1}>
        {arrival.destination}행
      </Text>
      <View style={styles.arrivalTimeRow}>
        {isSoon && <Text style={styles.soonIcon}>⚡</Text>}
        <Text
          style={[styles.arrivalTime, isSoon && styles.arrivalTimeSoon]}
        >
          {timeText}
        </Text>
      </View>
    </View>
  );
}

function BusArrivalInfo({
  arrival,
  isSoon,
}: {
  arrival: BusArrival;
  isSoon: boolean;
}): React.JSX.Element {
  const timeText =
    arrival.arrivalTime <= 0 ? '곧 도착' : `${arrival.arrivalTime}분`;
  const stopsText = `(${arrival.remainingStops}정거장)`;

  return (
    <View style={styles.arrivalInfo}>
      <Text style={styles.arrivalDestination} numberOfLines={1}>
        {arrival.routeName}번
      </Text>
      <View style={styles.arrivalTimeRow}>
        {isSoon && <Text style={styles.soonIcon}>⚡</Text>}
        <Text
          style={[styles.arrivalTime, isSoon && styles.arrivalTimeSoon]}
        >
          {timeText}
        </Text>
        <Text style={styles.remainingStops}>{stopsText}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeTypeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  routeSummary: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 14,
  },
  transitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transitHeaderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  timestamp: {
    fontSize: 12,
    color: colors.gray400,
  },
  transitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  transitItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transitItemRight: {
    alignItems: 'flex-end',
  },
  transitEmoji: {
    fontSize: 20,
  },
  transitTypeLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 1,
  },
  transitName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray800,
  },
  transitError: {
    fontSize: 13,
    color: colors.danger,
  },
  transitNoData: {
    fontSize: 13,
    color: colors.gray400,
  },
  arrivalInfo: {
    alignItems: 'flex-end',
  },
  arrivalDestination: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 2,
  },
  arrivalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrivalTime: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  arrivalTimeSoon: {
    color: colors.danger,
  },
  soonIcon: {
    fontSize: 14,
  },
  remainingStops: {
    fontSize: 12,
    color: colors.gray400,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: 16,
  },
  startButton: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray500,
  },
  mt8: {
    marginTop: 8,
  },
});
