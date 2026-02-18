import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { DepartureCountdown } from './DepartureCountdown';
import { EmptySmartDepartureView } from './EmptySmartDepartureView';

import type { SmartDepartureSnapshotDto } from '@/types/smart-departure';

type SmartDepartureCardProps = {
  commute: SmartDepartureSnapshotDto | null;
  return_: SmartDepartureSnapshotDto | null;
  commuteMinutes: number | null;
  returnMinutes: number | null;
  isLoading: boolean;
};

type CardState = 'relaxed' | 'warning' | 'urgent' | 'past' | 'departed' | 'empty';

function getCardState(minutes: number | null, status?: string): CardState {
  if (minutes === null) return 'empty';
  if (status === 'departed') return 'departed';
  if (minutes <= 0) return 'past';
  if (minutes <= 10) return 'urgent';
  if (minutes <= 30) return 'warning';
  return 'relaxed';
}

const STATE_BORDER_COLORS: Record<CardState, string> = {
  relaxed: '#DBEAFE',
  warning: '#FDE68A',
  urgent: '#FECACA',
  past: '#FECACA',
  departed: '#A7F3D0',
  empty: colors.gray200,
};

function formatTime(isoOrHhmm: string): string {
  if (isoOrHhmm.includes('T')) {
    const d = new Date(isoOrHhmm);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return isoOrHhmm;
}

function SnapshotDetail({
  snapshot,
  minutes,
}: {
  snapshot: SmartDepartureSnapshotDto;
  minutes: number | null;
}): React.JSX.Element {
  const departureTime = formatTime(snapshot.optimalDepartureAt);
  const arrivalTime = snapshot.arrivalTarget;
  const effectiveMinutes = minutes ?? snapshot.minutesUntilDeparture;

  return (
    <View style={detailStyles.container}>
      <DepartureCountdown
        minutesUntilDeparture={effectiveMinutes}
        status={snapshot.status}
      />
      <View style={detailStyles.infoRow}>
        <Text style={detailStyles.timeText}>
          출발 {departureTime}
        </Text>
        <Text style={detailStyles.arrow}>→</Text>
        <Text style={detailStyles.timeText}>
          도착 {arrivalTime} 예정
        </Text>
      </View>
      <Text style={detailStyles.travelText}>
        예상 소요 {snapshot.estimatedTravelMin}분
        {snapshot.realtimeAdjustmentMin && snapshot.realtimeAdjustmentMin > 0
          ? ' (교통 지연)'
          : snapshot.realtimeAdjustmentMin && snapshot.realtimeAdjustmentMin < 0
            ? ' (교통 원활)'
            : ''}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
  },
  arrow: {
    fontSize: 14,
    color: colors.gray400,
  },
  travelText: {
    fontSize: 13,
    color: colors.gray500,
    paddingHorizontal: 4,
  },
});

export function SmartDepartureCard({
  commute,
  return_,
  commuteMinutes,
  returnMinutes,
  isLoading,
}: SmartDepartureCardProps): React.JSX.Element {
  const router = useRouter();

  // Determine which snapshot to show based on time of day
  const activeSnapshot = useMemo((): {
    snapshot: SmartDepartureSnapshotDto | null;
    minutes: number | null;
  } => {
    const hour = new Date().getHours();

    // Before 14:00 -> show commute; after -> show return
    if (hour < 14) {
      if (commute && commute.status !== 'expired') {
        return { snapshot: commute, minutes: commuteMinutes };
      }
      if (return_ && return_.status !== 'expired') {
        return { snapshot: return_, minutes: returnMinutes };
      }
    } else {
      if (return_ && return_.status !== 'expired') {
        return { snapshot: return_, minutes: returnMinutes };
      }
      if (commute && commute.status !== 'expired') {
        return { snapshot: commute, minutes: commuteMinutes };
      }
    }

    return { snapshot: null, minutes: null };
  }, [commute, return_, commuteMinutes, returnMinutes]);

  const handleSetup = (): void => {
    router.push('/smart-departure');
  };

  // Empty state
  if (!commute && !return_ && !isLoading) {
    return (
      <View style={[styles.card, { borderColor: colors.gray200 }]}>
        <EmptySmartDepartureView onSetup={handleSetup} />
      </View>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={[styles.card, { borderColor: colors.gray200 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오늘의 스마트 출발</Text>
        </View>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLineShort} />
        </View>
      </View>
    );
  }

  const { snapshot, minutes } = activeSnapshot;
  if (!snapshot) {
    return (
      <View style={[styles.card, { borderColor: colors.gray200 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오늘의 스마트 출발</Text>
        </View>
        <Text style={styles.noDataText}>오늘 예정된 출발이 없어요</Text>
      </View>
    );
  }

  const cardState = getCardState(minutes, snapshot.status);
  const borderColor = STATE_BORDER_COLORS[cardState];
  const typeLabel =
    snapshot.departureType === 'commute' ? '출근' : '퇴근';

  return (
    <Pressable
      style={[styles.card, { borderColor }]}
      onPress={handleSetup}
      accessibilityRole="button"
      accessibilityLabel={`스마트 출발 카드 - ${typeLabel}`}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘의 스마트 출발</Text>
        <Text style={styles.headerBadge}>{typeLabel}</Text>
      </View>
      <SnapshotDetail snapshot={snapshot} minutes={minutes} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  noDataText: {
    fontSize: 14,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: 12,
  },
  skeletonRow: {
    gap: 8,
  },
  skeletonBlock: {
    height: 48,
    backgroundColor: colors.skeletonBase,
    borderRadius: 10,
  },
  skeletonLine: {
    height: 16,
    width: '80%',
    backgroundColor: colors.skeletonBase,
    borderRadius: 4,
  },
  skeletonLineShort: {
    height: 14,
    width: '50%',
    backgroundColor: colors.skeletonBase,
    borderRadius: 4,
  },
});
