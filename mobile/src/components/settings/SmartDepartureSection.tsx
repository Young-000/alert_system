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
import { shouldOfferLoadRetry } from '@/utils/settings-load-retry';

import type { SmartDepartureSettingDto } from '@/types/smart-departure';

type SmartDepartureSectionProps = {
  settings: SmartDepartureSettingDto[];
  isLoading: boolean;
  error: string | null;
  /** 다시 받아오는 중이면 버튼을 잠그고 문구를 바꾼다. */
  isRetrying: boolean;
  /**
   * 설정을 다시 받아온다. 옵셔널이 아니라 **필수** — 옵셔널이면 미배선이
   * `tsc`를 조용히 통과해 회복 수단이 없는 상태로 되돌아간다.
   */
  onRetry: () => void;
  onToggle: (id: string) => void;
};

// 조회 실패를 설정 0개로 흘려보내면 화면이 사실이 아닌 말을 한다.
// 이미 설정해 둔 사용자에게 "설정하면 최적 출발 시각을 알려드려요"를 띄우는 것이
// 그것이다. 바로 위 GeofenceSection이 같은 이유로 같은 규칙을 쓴다.
function getStatusText(
  settings: SmartDepartureSettingDto[],
  error: string | null,
): string {
  if (error) {
    return '설정을 불러오지 못했습니다.';
  }
  const enabledCount = settings.filter((s) => s.isEnabled).length;
  if (settings.length === 0) {
    return '설정하면 최적 출발 시각을 알려드려요';
  }
  if (enabledCount === 0) {
    return '모든 알림이 꺼져 있습니다';
  }
  return `${enabledCount}개 알림 활성 중`;
}

export function SmartDepartureSection({
  settings,
  isLoading,
  error,
  isRetrying,
  onRetry,
  onToggle,
}: SmartDepartureSectionProps): React.JSX.Element {
  const router = useRouter();
  const statusText = getStatusText(settings, error);
  // 바로 위 GeofenceSection과 같은 규칙을 쓴다. 이 섹션에는 실패 문구를
  // 덮는 상위 안내가 없어 `isSupersededByOtherNotice`는 해당하지 않는다.
  const canRetry = shouldOfferLoadRetry({ loadError: error, isLoading });
  const commute = settings.find((s) => s.departureType === 'commute');
  const returnSetting = settings.find((s) => s.departureType === 'return');

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>스마트 출발</Text>
      <View style={styles.card}>
        {/* Overview Row */}
        <Pressable
          style={styles.row}
          onPress={() => router.push('/smart-departure')}
          accessibilityRole="button"
          accessibilityLabel="스마트 출발 설정"
        >
          <View style={styles.labelContainer}>
            <Text style={styles.icon}>🚀</Text>
            <View style={styles.textContainer}>
              <Text style={styles.label}>스마트 출발</Text>
              <Text style={styles.description}>{statusText}</Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.chevron}>{'>'}</Text>
          )}
        </Pressable>

        {/* 조회 실패에서 빠져나갈 길. 전용 화면(`/smart-departure`)에도 재시도가
            있지만 훅 인스턴스가 화면별로 따로라, 거기서 되살려도 이 섹션은
            낡은 채로 남는다. 문구는 위 `description`이 이미 말했다. */}
        {canRetry && (
          <>
            <View style={styles.separator} />
            <Pressable
              style={styles.retryRow}
              onPress={onRetry}
              disabled={isRetrying}
              accessibilityRole="button"
              accessibilityLabel="스마트 출발 설정 다시 불러오기"
              accessibilityState={{ disabled: isRetrying }}
            >
              <Text style={styles.retryIcon}>↻</Text>
              <Text style={styles.retryLabel}>
                {isRetrying ? '불러오는 중…' : '다시 시도'}
              </Text>
            </Pressable>
          </>
        )}

        {/* Commute Toggle */}
        {commute && (
          <>
            <View style={styles.separator} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleIcon}>🌅</Text>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>출근 알림</Text>
                <Text style={styles.toggleTime}>
                  도착 {commute.arrivalTarget}
                </Text>
              </View>
              <Switch
                value={commute.isEnabled}
                onValueChange={() => onToggle(commute.id)}
                trackColor={{
                  false: colors.gray300,
                  true: colors.primaryLight,
                }}
                thumbColor={
                  commute.isEnabled ? colors.primary : colors.gray400
                }
                accessibilityRole="switch"
                accessibilityLabel="출근 스마트 출발 토글"
                accessibilityState={{ checked: commute.isEnabled }}
              />
            </View>
          </>
        )}

        {/* Return Toggle */}
        {returnSetting && (
          <>
            <View style={styles.separator} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleIcon}>🌙</Text>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>퇴근 알림</Text>
                <Text style={styles.toggleTime}>
                  도착 {returnSetting.arrivalTarget}
                </Text>
              </View>
              <Switch
                value={returnSetting.isEnabled}
                onValueChange={() => onToggle(returnSetting.id)}
                trackColor={{
                  false: colors.gray300,
                  true: colors.primaryLight,
                }}
                thumbColor={
                  returnSetting.isEnabled ? colors.primary : colors.gray400
                }
                accessibilityRole="switch"
                accessibilityLabel="퇴근 스마트 출발 토글"
                accessibilityState={{ checked: returnSetting.isEnabled }}
              />
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
  chevron: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: '600',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // 터치 타겟 최소 44px (체크리스트 6-6)
    minHeight: 44,
  },
  retryIcon: {
    fontSize: 16,
    marginRight: 12,
    color: colors.primary,
  },
  retryLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray900,
  },
  toggleTime: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 1,
  },
});
