import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorRetryView } from '@/components/ErrorRetryView';
import { EmptyPlaceView } from '@/components/places/EmptyPlaceView';
import { LocationPermissionBanner } from '@/components/places/LocationPermissionBanner';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlaceFormModal } from '@/components/places/PlaceFormModal';
import { colors } from '@/constants/colors';
import { useGeofence } from '@/hooks/useGeofence';
import { usePlaces } from '@/hooks/usePlaces';
import { notifyIfToggleFailed } from '@/utils/toggle-feedback';

import type { PlaceSubmitResult } from '@/components/places/PlaceFormModal';
import type { CreatePlaceDto, Place, PlaceType, UpdatePlaceDto } from '@/types/place';

export default function PlacesScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    places,
    isLoading,
    isRefreshing,
    error,
    refresh,
    createPlace,
    updatePlace,
    deletePlace,
    togglePlace,
  } = usePlaces();

  const {
    permissionStatus,
    requestPermission,
    openSettings,
    startMonitoring,
  } = useGeofence();

  const [showForm, setShowForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const existingTypes: PlaceType[] = places.map((p) => p.placeType);

  const handleAddPlace = useCallback((): void => {
    setEditingPlace(undefined);
    setShowForm(true);
  }, []);

  const handleEditPlace = useCallback((place: Place): void => {
    setEditingPlace(place);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (
      data: CreatePlaceDto | { id: string; dto: UpdatePlaceDto },
    ): Promise<PlaceSubmitResult> => {
      // 지오펜스는 저장 직후 서버가 돌려준 목록으로 다시 등록한다.
      //
      // 예전에는 렌더 클로저의 `places`를 썼다. 수정은 저장 전 좌표·반경으로
      // 다시 등록됐고, 생성은 `id: 'temp'`인 가짜 장소를 끼워 넣어 등록했다.
      // 'temp'는 지오펜스 region의 identifier가 그대로 되고, 그 지점을 드나들면
      // 서버에 `placeId: 'temp'`로 올라가 존재하지 않는 장소로 거절된다
      // (이벤트는 오프라인 큐로 갔다가 버려진다). 앱을 다시 켜도 재등록하는
      // 경로가 없어서, 설정에서 토글하거나 장소를 다시 건드릴 때까지 남는다.
      const result =
        'id' in data
          ? await updatePlace(data.id, data.dto)
          : await createPlace(data);

      if (!result.saved) return { ok: false, message: result.message };

      // 재조회가 실패하면(places === null) 재등록을 건너뛴다. 옛 목록으로
      // 등록하느니 다음 등록 시점까지 그대로 두는 편이 낫다.
      if (result.places) {
        void startMonitoring(result.places);
      }
      return { ok: true };
    },
    [createPlace, updatePlace, startMonitoring],
  );

  const handleDeleteConfirm = useCallback(
    async (id: string): Promise<void> => {
      const success = await deletePlace(id);
      if (success) {
        const remaining = places.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          void startMonitoring(remaining);
        }
      } else {
        RNAlert.alert('삭제하지 못했어요', '잠시 후 다시 시도해주세요.');
      }
      setShowDeleteConfirm(null);
    },
    [deletePlace, places, startMonitoring],
  );

  const handleToggle = useCallback(
    (id: string): void => {
      notifyIfToggleFailed(togglePlace(id));
      // Geofence will be re-registered on next app activation
    },
    [togglePlace],
  );

  // 조회에 실패했으면 `existingTypes`가 빈 배열이라 이미 2개를 등록한 사용자에게도
  // 추가 버튼이 열린다. 무엇이 등록돼 있는지 모르는 상태에서는 권하지 않는다.
  const canAddMore = !error && existingTypes.length < 2;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>장소 관리</Text>
          {canAddMore && (
            <Pressable
              style={styles.addButton}
              onPress={handleAddPlace}
              accessibilityRole="button"
              accessibilityLabel="장소 추가"
            >
              <Text style={styles.addButtonText}>+ 추가</Text>
            </Pressable>
          )}
        </View>

        {/* Permission Banner */}
        <LocationPermissionBanner
          status={permissionStatus}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
        />

        {/* Content
            목록이 비는 이유는 둘이다: 정말 없거나, 못 불러왔거나.
            후자에 "등록된 장소가 없어요 / 장소 등록하기"를 띄우면 이미 집·회사를
            등록해 둔 사용자를 실패가 예정된 등록 폼으로 밀어 넣는다
            (서버가 409 `이미 등록된 집 장소가 있습니다.`로 거절한다). */}
        {error ? (
          <ErrorRetryView
            message={error}
            onRetry={() => void refresh()}
            isRetrying={isRefreshing}
          />
        ) : places.length === 0 ? (
          <EmptyPlaceView onAddPlace={handleAddPlace} />
        ) : (
          <View>
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onToggle={handleToggle}
                onEdit={handleEditPlace}
                onDelete={(id) => setShowDeleteConfirm(id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <PlaceFormModal
        visible={showForm}
        editingPlace={editingPlace}
        existingTypes={existingTypes}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
      />

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
            <Text style={styles.modalTitle}>장소 삭제</Text>
            <Text style={styles.modalMessage}>
              이 장소를 삭제하면 해당 위치의 출퇴근 자동 감지가 중지됩니다. 삭제하시겠습니까?
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
                onPress={() => {
                  if (showDeleteConfirm) {
                    void handleDeleteConfirm(showDeleteConfirm);
                  }
                }}
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
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Delete confirmation modal (same style as settings logout modal)
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
