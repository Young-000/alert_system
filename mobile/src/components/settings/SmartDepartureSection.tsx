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

import type { SmartDepartureSettingDto } from '@/types/smart-departure';

type SmartDepartureSectionProps = {
  settings: SmartDepartureSettingDto[];
  isLoading: boolean;
  onToggle: (id: string) => void;
};

function getStatusText(settings: SmartDepartureSettingDto[]): string {
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
  onToggle,
}: SmartDepartureSectionProps): React.JSX.Element {
  const router = useRouter();
  const statusText = getStatusText(settings);
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
