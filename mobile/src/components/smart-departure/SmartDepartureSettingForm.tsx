import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { ActiveDaysPicker } from './ActiveDaysPicker';
import { PreAlertPicker } from './PreAlertPicker';
import { PrepTimeSlider } from './PrepTimeSlider';
import { TimePickerSheet } from './TimePickerSheet';

import type {
  CreateSmartDepartureSettingDto,
  DepartureType,
  SmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
} from '@/types/smart-departure';
import type { RouteResponse } from '@/types/home';
import type {
  DeleteSettingResult,
  SaveSettingResult,
} from '@/hooks/useSmartDeparture';

type SmartDepartureSettingFormProps = {
  departureType: DepartureType;
  existingSetting?: SmartDepartureSettingDto;
  routes: RouteResponse[];
  /**
   * 저장 결과를 사유와 함께 돌려준다. boolean으로 접으면 폼이 사유를 추측해야 하고,
   * 서버가 실제로 준 문구(`경로를 찾을 수 없습니다: <id>` 등)가 화면에 닿지 못한다.
   */
  onSubmit: (
    data:
      | CreateSmartDepartureSettingDto
      | { id: string; dto: UpdateSmartDepartureSettingDto },
  ) => Promise<SaveSettingResult>;
  onDelete?: (id: string) => Promise<DeleteSettingResult>;
};

const DEFAULT_ARRIVAL_COMMUTE = '09:00';
const DEFAULT_ARRIVAL_RETURN = '19:00';
const DEFAULT_PREP_TIME = 30;
const DEFAULT_ACTIVE_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_PRE_ALERTS = [30, 10, 0];

export function SmartDepartureSettingForm({
  departureType,
  existingSetting,
  routes,
  onSubmit,
  onDelete,
}: SmartDepartureSettingFormProps): React.JSX.Element {
  const isEditing = !!existingSetting;
  const typeLabel = departureType === 'commute' ? '출근' : '퇴근';
  const typeIcon = departureType === 'commute' ? '🌅' : '🌙';
  const defaultArrival =
    departureType === 'commute'
      ? DEFAULT_ARRIVAL_COMMUTE
      : DEFAULT_ARRIVAL_RETURN;

  const [arrivalTarget, setArrivalTarget] = useState(
    existingSetting?.arrivalTarget ?? defaultArrival,
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    existingSetting?.prepTimeMinutes ?? DEFAULT_PREP_TIME,
  );
  const [activeDays, setActiveDays] = useState<number[]>(
    existingSetting?.activeDays ?? DEFAULT_ACTIVE_DAYS,
  );
  const [preAlerts, setPreAlerts] = useState<number[]>(
    existingSetting?.preAlerts ?? DEFAULT_PRE_ALERTS,
  );
  const [routeId, setRouteId] = useState(
    existingSetting?.routeId ?? routes[0]?.id ?? '',
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync form when existingSetting changes
  useEffect(() => {
    if (existingSetting) {
      setArrivalTarget(existingSetting.arrivalTarget);
      setPrepTimeMinutes(existingSetting.prepTimeMinutes);
      setActiveDays(existingSetting.activeDays);
      setPreAlerts(existingSetting.preAlerts);
      setRouteId(existingSetting.routeId);
    }
  }, [existingSetting]);

  const selectedRoute = routes.find((r) => r.id === routeId);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) return;

    if (!routeId) {
      setError('경로를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing && existingSetting) {
        const dto: UpdateSmartDepartureSettingDto = {
          routeId,
          arrivalTarget,
          prepTimeMinutes,
          activeDays,
          preAlerts,
        };
        const result = await onSubmit({ id: existingSetting.id, dto });
        if (!result.saved) setError(result.message);
      } else {
        const dto: CreateSmartDepartureSettingDto = {
          routeId,
          departureType,
          arrivalTarget,
          prepTimeMinutes,
          activeDays,
          preAlerts,
        };
        const result = await onSubmit(dto);
        if (!result.saved) setError(result.message);
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!existingSetting || !onDelete) return;
    setIsSubmitting(true);
    try {
      const result = await onDelete(existingSetting.id);
      if (!result.deleted) setError(result.message);
    } catch {
      setError('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{typeIcon}</Text>
          <Text style={styles.sectionTitle}>{typeLabel} 설정</Text>
        </View>

        {/* Arrival Target Time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>도착 희망 시각</Text>
          <Pressable
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`도착 희망 시각 ${arrivalTarget}`}
          >
            <Text style={styles.timeButtonText}>{arrivalTarget}</Text>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </View>

        {/* Prep Time */}
        <PrepTimeSlider value={prepTimeMinutes} onChange={setPrepTimeMinutes} />

        {/* Active Days */}
        <ActiveDaysPicker value={activeDays} onChange={setActiveDays} />

        {/* Pre-Alerts */}
        <PreAlertPicker value={preAlerts} onChange={setPreAlerts} />

        {/* Route Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>연결 경로</Text>
          {routes.length === 0 ? (
            <Text style={styles.noRouteText}>
              경로를 먼저 설정해주세요.
            </Text>
          ) : (
            <View style={styles.routeList}>
              {routes.map((route) => (
                <Pressable
                  key={route.id}
                  style={[
                    styles.routeOption,
                    route.id === routeId && styles.routeOptionActive,
                  ]}
                  onPress={() => setRouteId(route.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${route.name} 경로 선택`}
                  accessibilityState={{ selected: route.id === routeId }}
                >
                  <Text
                    style={[
                      styles.routeOptionText,
                      route.id === routeId && styles.routeOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {route.name}
                  </Text>
                  {route.totalExpectedDuration ? (
                    <Text style={styles.routeDuration}>
                      약 {route.totalExpectedDuration}분
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
          {selectedRoute ? (
            <Text style={styles.routeHint}>
              예상 소요시간: {selectedRoute.totalExpectedDuration ?? '?'}분
            </Text>
          ) : null}
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.submitButton,
              (isSubmitting || routes.length === 0) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || routes.length === 0}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? '설정 수정' : '설정 저장'}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? '수정 완료' : '설정 저장'}
              </Text>
            )}
          </Pressable>

          {isEditing && onDelete && (
            <Pressable
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="설정 삭제"
            >
              <Text style={styles.deleteButtonText}>설정 삭제</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Time Picker */}
      <TimePickerSheet
        visible={showTimePicker}
        value={arrivalTarget}
        onConfirm={setArrivalTarget}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 6,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  chevron: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: '600',
  },
  routeList: {
    gap: 8,
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  routeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  routeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
    marginRight: 8,
  },
  routeOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  routeDuration: {
    fontSize: 13,
    color: colors.gray400,
  },
  noRouteText: {
    fontSize: 14,
    color: colors.warning,
    fontStyle: 'italic',
  },
  routeHint: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },
  actions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
