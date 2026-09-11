import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { DepartureCountdown } from './DepartureCountdown';
import { EmptySmartDepartureView } from './EmptySmartDepartureView';
import { resolveDepartureCardState } from '@/utils/departure-card';

import type { SmartDepartureSnapshotDto } from '@/types/smart-departure';

type SmartDepartureCardProps = {
  commute: SmartDepartureSnapshotDto | null;
  return_: SmartDepartureSnapshotDto | null;
  commuteMinutes: number | null;
  returnMinutes: number | null;
  isLoading: boolean;
  /** 조회 실패 사유. 있으면 설정이 없는 척하지 않는다. */
  error: string | null;
  /**
   * 조회 실패에서 되부르는 길. 필수로 둔다 — 옵셔널이면 홈이 넘기지 않아도
   * 타입이 통과해서, 카드가 실패 문구만 띄우고 끝나는 상태로 되돌아간다.
   */
  onRetry: () => void;
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
  error,
  onRetry,
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

  const cardStateKind = resolveDepartureCardState({
    error,
    isLoading,
    hasSetting: !!commute || !!return_,
  });

  // 조회 실패 — 빈 상태로 위장하지 않는다. 설정이 없다고 말하면 이미 설정한
  // 사용자가 다시 만들게 되고, 서버는 409로 거절한다.
  //
  // 다음 행동은 재조회다. 설정 화면으로 보내면 길이 끊긴다 — 그 화면이 보는 것은
  // `GET /smart-departure/settings`인데 여기서 실패한 것은 `GET /smart-departure/today`라,
  // 설정은 멀쩡히 뜨고 이 카드만 실패로 남는다.
  if (cardStateKind === 'error') {
    return (
      <View style={[styles.card, { borderColor: colors.gray200 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오늘의 스마트 출발</Text>
        </View>
        <Text style={styles.noDataText} accessibilityRole="alert">
          {error}
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (cardStateKind === 'empty') {
    return (
      <View style={[styles.card, { borderColor: colors.gray200 }]}>
        <EmptySmartDepartureView onSetup={handleSetup} />
      </View>
    );
  }

  // Loading skeleton
  if (cardStateKind === 'loading') {
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
  retryButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
