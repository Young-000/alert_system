import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

import { EmptyPlaceView } from '@/components/places/EmptyPlaceView';
import { LocationPermissionBanner } from '@/components/places/LocationPermissionBanner';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlaceFormModal } from '@/components/places/PlaceFormModal';
import { colors } from '@/constants/colors';
import { useGeofence } from '@/hooks/useGeofence';
import { usePlaces } from '@/hooks/usePlaces';

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
    ): Promise<boolean> => {
      if ('id' in data) {
        const success = await updatePlace(data.id, data.dto);
        if (success) {
          // Re-register geofences with updated places
          void startMonitoring(places);
        }
        return success;
      }
      const success = await createPlace(data);
      if (success) {
        // Start monitoring with new place included
        const updatedPlaces = [...places, { ...data, id: 'temp', isActive: true } as Place];
        void startMonitoring(updatedPlaces);
      }
      return success;
    },
    [createPlace, updatePlace, places, startMonitoring],
  );

  const handleDeleteConfirm = useCallback(
    async (id: string): Promise<void> => {
      const success = await deletePlace(id);
      if (success) {
        const remaining = places.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          void startMonitoring(remaining);
        }
      }
      setShowDeleteConfirm(null);
    },
    [deletePlace, places, startMonitoring],
  );

  const handleToggle = useCallback(
    (id: string): void => {
      togglePlace(id);
      // Geofence will be re-registered on next app activation
    },
    [togglePlace],
  );

  const canAddMore = existingTypes.length < 2;

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

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Content */}
        {places.length === 0 ? (
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
