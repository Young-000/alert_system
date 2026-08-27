import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';

type GeofenceSectionProps = {
  isEnabled: boolean;
  isLoading: boolean;
  permissionStatus: 'undetermined' | 'foreground_only' | 'always' | 'denied';
  placesCount: number;
  /** 실제로 감지 대상이 되는 장소 수. 꺼둔 장소는 감지되지 않는다. */
  activePlacesCount: number;
  /** 장소 조회가 실패했을 때의 사유. 있으면 장소 수를 신뢰할 수 없다. */
  placesError: string | null;
  offlineCount: number;
  onToggle: (value: boolean) => void;
};

// 조회 실패를 장소 수 0으로 흘려보내면 화면이 사실이 아닌 말을 한다.
// 장소를 이미 등록한 사용자에게 "장소를 등록하면 자동 감지가 시작됩니다"를
// 띄우는 상황이 그것이었다. 모를 때는 모른다고 말한다.
function getStatusText(
  permissionStatus: string,
  placesCount: number,
  activePlacesCount: number,
  placesError: string | null,
  isEnabled: boolean,
): string {
  if (permissionStatus === 'denied') {
    return '위치 권한이 거부되었습니다.';
  }
  if (permissionStatus === 'undetermined' || permissionStatus === 'foreground_only') {
    return '위치 권한 설정이 필요합니다.';
  }
  if (placesError) {
    return isEnabled
      ? '감지 중입니다. 장소 목록은 불러오지 못했습니다.'
      : '장소를 불러오지 못했습니다.';
  }
  if (placesCount === 0) {
    return '장소를 등록하면 자동 감지가 시작됩니다.';
  }
  if (activePlacesCount === 0) {
    return '켜둔 장소가 없습니다.';
  }
  if (isEnabled) {
    return `${activePlacesCount}개 장소 감지 중`;
  }
  return '자동 감지가 꺼져 있습니다.';
}

export function GeofenceSection({
  isEnabled,
  isLoading,
  permissionStatus,
  placesCount,
  activePlacesCount,
  placesError,
  offlineCount,
  onToggle,
}: GeofenceSectionProps): React.JSX.Element {
  const router = useRouter();
  const statusText = getStatusText(
    permissionStatus,
    placesCount,
    activePlacesCount,
    placesError,
    isEnabled,
  );

  // 켜져 있으면 언제나 끌 수 있어야 한다.
  //
  // 예전 조건(`permissionStatus === 'always' && placesCount > 0`)은 감지가 도는
  // 중에도 장소 수가 0이면 스위치를 잠갔다. 장소 조회가 실패했거나 마지막 장소를
  // 지운 사용자는 백그라운드 위치 감지가 돌고 있는데 화면에서 끌 방법이 없었다.
  // 켜는 쪽만 조건을 건다 — 감지할 장소가 없으면 켤 이유가 없으니까.
  const canToggle =
    isEnabled || (permissionStatus === 'always' && activePlacesCount > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>출퇴근 자동 감지</Text>
      <View style={styles.card}>
        {/* Toggle Row */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.icon}>📍</Text>
            <View style={styles.textContainer}>
              <Text style={styles.label}>자동 감지</Text>
              <Text style={styles.description}>{statusText}</Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={onToggle}
              disabled={!canToggle}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={isEnabled ? colors.primary : colors.gray400}
              accessibilityRole="switch"
              accessibilityLabel="출퇴근 자동 감지 토글"
              accessibilityState={{ checked: isEnabled }}
            />
          )}
        </View>

        <View style={styles.separator} />

        {/* Places Management Link */}
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('/places')}
          accessibilityRole="button"
          accessibilityLabel="장소 관리"
        >
          <Text style={styles.linkIcon}>🗺️</Text>
          <Text style={styles.linkLabel}>장소 관리</Text>
          <Text style={styles.chevron}>{'>'}</Text>
        </Pressable>

        {/* Offline Queue Indicator */}
        {offlineCount > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.offlineRow}>
              <Text style={styles.offlineIcon}>📤</Text>
              <Text style={styles.offlineText}>
                전송 대기 중인 이벤트 {offlineCount}건
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
  },
  chevron: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: '600',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  offlineIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  offlineText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
});
