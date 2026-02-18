import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { colors } from '@/constants/colors';
import { RadiusSlider } from './RadiusSlider';

import type { CreatePlaceDto, Place, PlaceType, UpdatePlaceDto } from '@/types/place';

type PlaceFormModalProps = {
  visible: boolean;
  editingPlace?: Place;
  existingTypes: PlaceType[];
  onClose: () => void;
  onSubmit: (data: CreatePlaceDto | { id: string; dto: UpdatePlaceDto }) => Promise<boolean>;
};

const PLACE_TYPE_OPTIONS: { value: PlaceType; label: string; icon: string }[] = [
  { value: 'home', label: '집', icon: '🏠' },
  { value: 'work', label: '회사', icon: '🏢' },
];

export function PlaceFormModal({
  visible,
  editingPlace,
  existingTypes,
  onClose,
  onSubmit,
}: PlaceFormModalProps): React.JSX.Element {
  const isEditing = !!editingPlace;

  const [placeType, setPlaceType] = useState<PlaceType>('home');
  const [label, setLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [radiusM, setRadiusM] = useState(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [error, setError] = useState('');

  // Populate form for editing
  useEffect(() => {
    if (editingPlace) {
      setPlaceType(editingPlace.placeType);
      setLabel(editingPlace.label);
      setLatitude(editingPlace.latitude.toString());
      setLongitude(editingPlace.longitude.toString());
      setAddress(editingPlace.address ?? '');
      setRadiusM(editingPlace.radiusM);
    } else {
      resetForm();
    }
  }, [editingPlace, visible]);

  const resetForm = (): void => {
    // Pick first available type
    const available = PLACE_TYPE_OPTIONS.find(
      (opt) => !existingTypes.includes(opt.value),
    );
    setPlaceType(available?.value ?? 'home');
    setLabel('');
    setLatitude('');
    setLongitude('');
    setAddress('');
    setRadiusM(200);
    setError('');
  };

  const handleUseCurrentLocation = useCallback(async (): Promise<void> => {
    setIsFetchingLocation(true);
    setError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('위치 권한이 필요합니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());

      // Reverse geocode for address
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode) {
          const parts = [
            geocode.district,
            geocode.street,
            geocode.streetNumber,
          ].filter(Boolean);
          const fullAddress =
            parts.length > 0 ? parts.join(' ') : geocode.name ?? '';
          setAddress(fullAddress);
        }
      } catch {
        // Reverse geocoding is optional; silently continue
      }
    } catch {
      setError('현재 위치를 가져올 수 없습니다.');
    } finally {
      setIsFetchingLocation(false);
    }
  }, []);

  const validate = (): boolean => {
    if (!label.trim()) {
      setError('장소 이름을 입력해주세요.');
      return false;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('유효한 위도를 입력해주세요. (-90 ~ 90)');
      return false;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('유효한 경도를 입력해주세요. (-180 ~ 180)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isEditing && editingPlace) {
        const dto: UpdatePlaceDto = {
          label: label.trim(),
          latitude: lat,
          longitude: lng,
          address: address.trim() || undefined,
          radiusM,
        };
        const success = await onSubmit({ id: editingPlace.id, dto });
        if (success) onClose();
        else setError('저장에 실패했습니다.');
      } else {
        const dto: CreatePlaceDto = {
          placeType,
          label: label.trim(),
          latitude: lat,
          longitude: lng,
          address: address.trim() || undefined,
          radiusM,
        };
        const success = await onSubmit(dto);
        if (success) onClose();
        else setError('저장에 실패했습니다. 이미 등록된 장소 유형일 수 있습니다.');
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTypes = PLACE_TYPE_OPTIONS.filter(
    (opt) => isEditing || !existingTypes.includes(opt.value),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.content}
          onPress={() => {
            /* prevent close when tapping content */
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {isEditing ? '장소 수정' : '장소 등록'}
            </Text>

            {/* Place Type */}
            {!isEditing && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>장소 유형</Text>
                <View style={styles.typeRow}>
                  {availableTypes.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.typeButton,
                        placeType === opt.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setPlaceType(opt.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`${opt.label} 선택`}
                      accessibilityState={{ selected: placeType === opt.value }}
                    >
                      <Text style={styles.typeIcon}>{opt.icon}</Text>
                      <Text
                        style={[
                          styles.typeLabel,
                          placeType === opt.value && styles.typeLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {availableTypes.length === 0 && (
                  <Text style={styles.noTypeText}>
                    모든 장소 유형이 이미 등록되어 있습니다.
                  </Text>
                )}
              </View>
            )}

            {/* Label */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>장소 이름</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="예: 우리집, 회사"
                placeholderTextColor={colors.gray400}
                maxLength={100}
                accessibilityLabel="장소 이름 입력"
              />
            </View>

            {/* Current Location Button */}
            <Pressable
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={isFetchingLocation}
              accessibilityRole="button"
              accessibilityLabel="현재 위치 사용"
            >
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.locationButtonIcon}>📍</Text>
              )}
              <Text style={styles.locationButtonText}>
                {isFetchingLocation ? '위치 가져오는 중...' : '현재 위치 사용'}
              </Text>
            </Pressable>

            {/* Latitude / Longitude */}
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateField}>
                <Text style={styles.fieldLabel}>위도</Text>
                <TextInput
                  style={styles.input}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="37.5665"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  accessibilityLabel="위도 입력"
                />
              </View>
              <View style={styles.coordinateField}>
                <Text style={styles.fieldLabel}>경도</Text>
                <TextInput
                  style={styles.input}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="126.9780"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  accessibilityLabel="경도 입력"
                />
              </View>
            </View>

            {/* Address (optional, auto-filled) */}
            {address ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>주소</Text>
                <Text style={styles.addressText}>{address}</Text>
              </View>
            ) : null}

            {/* Radius Slider */}
            <View style={styles.fieldGroup}>
              <RadiusSlider value={radiusM} onChange={setRadiusM} />
            </View>

            {/* Error */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  (isSubmitting || availableTypes.length === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || (!isEditing && availableTypes.length === 0)}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? '수정 완료' : '등록하기'}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isEditing ? '수정 완료' : '등록하기'}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 24,
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
  input: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    gap: 8,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeIcon: {
    fontSize: 20,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray700,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  noTypeText: {
    fontSize: 13,
    color: colors.warning,
    marginTop: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  locationButtonIcon: {
    fontSize: 16,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  coordinateField: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: colors.gray600,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.gray700,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
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
});
