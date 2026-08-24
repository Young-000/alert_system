import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptySmartDepartureView } from '@/components/smart-departure/EmptySmartDepartureView';
import { SmartDepartureSettingForm } from '@/components/smart-departure/SmartDepartureSettingForm';
import { colors } from '@/constants/colors';
import { useRoutes } from '@/hooks/useRoutes';
import { useSmartDeparture } from '@/hooks/useSmartDeparture';
import { notifyIfToggleFailed } from '@/utils/toggle-feedback';

import type {
  CreateSmartDepartureSettingDto,
  DepartureType,
  UpdateSmartDepartureSettingDto,
} from '@/types/smart-departure';

type FormMode =
  | { type: 'closed' }
  | { type: 'create'; departureType: DepartureType }
  | { type: 'edit'; departureType: DepartureType };

export default function SmartDepartureScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    settings,
    isLoading,
    isRefreshing,
    error,
    refresh,
    createSetting,
    updateSetting,
    deleteSetting,
    toggleSetting,
    getSettingByType,
  } = useSmartDeparture();
  const { routes } = useRoutes();

  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );

  const commuteSetting = getSettingByType('commute');
  const returnSetting = getSettingByType('return');

  const handleFormSubmit = useCallback(
    async (
      data:
        | CreateSmartDepartureSettingDto
        | { id: string; dto: UpdateSmartDepartureSettingDto },
    ): Promise<boolean> => {
      if ('id' in data) {
        const success = await updateSetting(data.id, data.dto);
        if (success) setFormMode({ type: 'closed' });
        return success;
      }
      const success = await createSetting(data);
      if (success) setFormMode({ type: 'closed' });
      return success;
    },
    [createSetting, updateSetting],
  );

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteSetting(id);
      if (success) {
        setFormMode({ type: 'closed' });
        setShowDeleteConfirm(null);
      }
      return success;
    },
    [deleteSetting],
  );

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (showDeleteConfirm) {
      // 폼의 onDelete는 확인 모달만 열고 항상 true를 돌려주므로, 실제 삭제 실패는
      // 여기서만 드러난다. 알리지 않으면 확인 모달만 그대로 남아 아무 일도 안 한 것처럼 보인다.
      const success = await handleDelete(showDeleteConfirm);
      if (!success) {
        RNAlert.alert('삭제하지 못했어요', '잠시 후 다시 시도해주세요.');
      }
    }
  }, [showDeleteConfirm, handleDelete]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Show form
  if (formMode.type !== 'closed') {
    const existingSetting =
      formMode.type === 'edit'
        ? getSettingByType(formMode.departureType)
        : undefined;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => setFormMode({ type: 'closed' })}
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
            >
              <Text style={styles.backIcon}>{'<'}</Text>
            </Pressable>
            <Text style={styles.title}>
              {formMode.departureType === 'commute' ? '출근' : '퇴근'} 설정
            </Text>
          </View>

          <SmartDepartureSettingForm
            departureType={formMode.departureType}
            existingSetting={existingSetting}
            routes={routes}
            onSubmit={handleFormSubmit}
            onDelete={(id) => {
              setShowDeleteConfirm(id);
              return Promise.resolve(true);
            }}
          />
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDeleteConfirm(null)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>설정 삭제</Text>
              <Text style={styles.modalMessage}>
                이 스마트 출발 설정을 삭제하시겠습니까?{'\n'}관련 알림도 함께
                삭제됩니다.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowDeleteConfirm(null)}
                  accessibilityRole="button"
                  accessibilityLabel="취소"
                >
                  <Text style={styles.modalButtonTextCancel}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => void handleDeleteConfirm()}
                  accessibilityRole="button"
                  accessibilityLabel="삭제 확인"
                >
                  <Text style={styles.modalButtonTextConfirm}>삭제</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  // Main settings list
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
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
          <Text style={styles.title}>스마트 출발</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Empty State */}
        {settings.length === 0 && routes.length === 0 ? (
          <View style={styles.emptyRouteContainer}>
            <Text style={styles.emptyRouteIcon}>🗺️</Text>
            <Text style={styles.emptyRouteTitle}>경로를 먼저 설정해주세요</Text>
            <Text style={styles.emptyRouteDesc}>
              스마트 출발은 등록된 경로를 기반으로{'\n'}최적 출발 시각을
              계산합니다.
            </Text>
            <Pressable
              style={styles.emptyRouteButton}
              onPress={() => router.push('/(tabs)/commute')}
              accessibilityRole="button"
              accessibilityLabel="경로 설정하러 가기"
            >
              <Text style={styles.emptyRouteButtonText}>경로 설정하기</Text>
            </Pressable>
          </View>
        ) : settings.length === 0 ? (
          <EmptySmartDepartureView
            onSetup={() =>
              setFormMode({ type: 'create', departureType: 'commute' })
            }
          />
        ) : null}

        {/* Commute Setting Card */}
        {commuteSetting ? (
          <SettingCard
            setting={commuteSetting}
            label="출근"
            icon="🌅"
            onToggle={(id) => notifyIfToggleFailed(toggleSetting(id))}
            onEdit={() =>
              setFormMode({ type: 'edit', departureType: 'commute' })
            }
          />
        ) : settings.length > 0 || routes.length > 0 ? (
          <AddSettingCard
            label="출근 설정 추가"
            icon="🌅"
            onPress={() =>
              setFormMode({ type: 'create', departureType: 'commute' })
            }
          />
        ) : null}

        {/* Return Setting Card */}
        {returnSetting ? (
          <SettingCard
            setting={returnSetting}
            label="퇴근"
            icon="🌙"
            onToggle={(id) => notifyIfToggleFailed(toggleSetting(id))}
            onEdit={() =>
              setFormMode({ type: 'edit', departureType: 'return' })
            }
          />
        ) : settings.length > 0 || routes.length > 0 ? (
          <AddSettingCard
            label="퇴근 설정 추가"
            icon="🌙"
            onPress={() =>
              setFormMode({ type: 'create', departureType: 'return' })
            }
          />
        ) : null}

        {/* Info Banner */}
        {settings.length > 0 && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerIcon}>ℹ️</Text>
            <Text style={styles.infoBannerText}>
              스마트 출발 알림은 출퇴근 기록이 많을수록 정확해집니다.{'\n'}
              최소 5일 이상의 기록이 권장됩니다.
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-Components ─────────────────────────────────

type SettingCardProps = {
  setting: {
    id: string;
    arrivalTarget: string;
    prepTimeMinutes: number;
    isEnabled: boolean;
    activeDays: number[];
    preAlerts: number[];
  };
  label: string;
  icon: string;
  onToggle: (id: string) => void;
  onEdit: () => void;
};

function SettingCard({
  setting,
  label,
  icon,
  onToggle,
  onEdit,
}: SettingCardProps): React.JSX.Element {
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const activeDayText = setting.activeDays
    .sort((a, b) => a - b)
    .map((d) => dayLabels[d])
    .join(', ');

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Text style={cardStyles.icon}>{icon}</Text>
          <View style={cardStyles.titleContainer}>
            <Text style={cardStyles.label}>{label} 설정</Text>
            <Text style={cardStyles.time}>도착 {setting.arrivalTarget}</Text>
          </View>
        </View>
        <Switch
          value={setting.isEnabled}
          onValueChange={() => onToggle(setting.id)}
          trackColor={{ false: colors.gray300, true: colors.primaryLight }}
          thumbColor={setting.isEnabled ? colors.primary : colors.gray400}
          accessibilityRole="switch"
          accessibilityLabel={`${label} 스마트 출발 ${setting.isEnabled ? '활성' : '비활성'}`}
          accessibilityState={{ checked: setting.isEnabled }}
        />
      </View>

      <View style={cardStyles.details}>
        <View style={cardStyles.detailRow}>
          <Text style={cardStyles.detailLabel}>준비시간</Text>
          <Text style={cardStyles.detailValue}>{setting.prepTimeMinutes}분</Text>
        </View>
        <View style={cardStyles.detailRow}>
          <Text style={cardStyles.detailLabel}>활성 요일</Text>
          <Text style={cardStyles.detailValue}>{activeDayText}</Text>
        </View>
        <View style={cardStyles.detailRow}>
          <Text style={cardStyles.detailLabel}>사전 알림</Text>
          <Text style={cardStyles.detailValue}>
            {setting.preAlerts
              .sort((a, b) => b - a)
              .map((m) => (m === 0 ? '출발' : `${m}분 전`))
              .join(', ')}
          </Text>
        </View>
      </View>

      <Pressable
        style={cardStyles.editButton}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${label} 설정 수정`}
      >
        <Text style={cardStyles.editButtonText}>수정</Text>
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  time: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  details: {
    gap: 6,
    marginBottom: 12,
    paddingLeft: 34,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.gray500,
  },
  detailValue: {
    fontSize: 13,
    color: colors.gray700,
    fontWeight: '500',
  },
  editButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});

type AddSettingCardProps = {
  label: string;
  icon: string;
  onPress: () => void;
};

function AddSettingCard({
  label,
  icon,
  onPress,
}: AddSettingCardProps): React.JSX.Element {
  return (
    <Pressable
      style={addStyles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={addStyles.icon}>{icon}</Text>
      <Text style={addStyles.label}>{label}</Text>
      <Text style={addStyles.plus}>+</Text>
    </Pressable>
  );
}

const addStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray500,
  },
  plus: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
});

// ─── Main Screen Styles ─────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  emptyRouteContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyRouteIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyRouteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  emptyRouteDesc: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyRouteButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyRouteButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  infoBannerIcon: {
    fontSize: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray600,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 32,
  },
  // Delete confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray100,
  },
  modalButtonConfirm: {
    backgroundColor: colors.danger,
  },
  modalButtonTextCancel: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
