import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';

import { CheckpointRow } from './CheckpointRow';
import { RouteTypeSelector } from './RouteTypeSelector';

import type { CheckpointFormItem } from './CheckpointRow';
import type { RouteResponse, RouteType } from '@/types/home';
import type { CreateCheckpointDto, CreateRouteDto, UpdateRouteDto } from '@/types/route';

type RouteFormModalProps = {
  visible: boolean;
  editingRoute: RouteResponse | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (dto: Omit<CreateRouteDto, 'userId'> | UpdateRouteDto) => void;
};

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `temp-${tempIdCounter}`;
}

function makeDefaultCheckpoints(): CheckpointFormItem[] {
  return [
    { tempId: nextTempId(), name: '', checkpointType: 'home', transportMode: 'walk' },
    { tempId: nextTempId(), name: '', checkpointType: 'work' },
  ];
}

function routeToFormCheckpoints(route: RouteResponse): CheckpointFormItem[] {
  return route.checkpoints
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((cp) => ({
      tempId: nextTempId(),
      name: cp.name,
      checkpointType: cp.checkpointType,
      transportMode: cp.transportMode,
      expectedDurationToNext: cp.expectedDurationToNext,
      expectedWaitTime: cp.expectedWaitTime === 0 ? undefined : cp.expectedWaitTime,
    }));
}

function formToCheckpointDtos(items: CheckpointFormItem[]): CreateCheckpointDto[] {
  return items.map((item, index) => ({
    sequenceOrder: index,
    name: item.name,
    checkpointType: item.checkpointType,
    transportMode: item.transportMode,
    expectedDurationToNext: item.expectedDurationToNext,
    expectedWaitTime: item.expectedWaitTime,
  }));
}

export function RouteFormModal({
  visible,
  editingRoute,
  isSaving,
  onClose,
  onSave,
}: RouteFormModalProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('morning');
  const [checkpoints, setCheckpoints] = useState<CheckpointFormItem[]>(
    makeDefaultCheckpoints(),
  );
  const [nameError, setNameError] = useState('');

  // Pre-fill form when editing / reset when creating
  useEffect(() => {
    if (visible) {
      if (editingRoute) {
        setName(editingRoute.name);
        setRouteType(editingRoute.routeType);
        setCheckpoints(routeToFormCheckpoints(editingRoute));
      } else {
        setName('');
        setRouteType('morning');
        setCheckpoints(makeDefaultCheckpoints());
      }
      setNameError('');
    }
  }, [visible, editingRoute]);

  const handleAddCheckpoint = useCallback(() => {
    setCheckpoints((prev) => [
      ...prev,
      { tempId: nextTempId(), name: '', checkpointType: 'custom' },
    ]);
  }, []);

  const handleUpdateCheckpoint = useCallback(
    (tempId: string, updated: CheckpointFormItem) => {
      setCheckpoints((prev) =>
        prev.map((cp) => (cp.tempId === tempId ? updated : cp)),
      );
    },
    [],
  );

  const handleDeleteCheckpoint = useCallback((tempId: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.tempId !== tempId));
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('경로 이름을 입력해주세요');
      return;
    }
    if (trimmedName.length > 50) {
      setNameError('경로 이름은 50자 이내로 입력해주세요');
      return;
    }
    setNameError('');

    // Validate checkpoint names
    const hasEmptyCheckpoint = checkpoints.some((cp) => !cp.name.trim());
    if (hasEmptyCheckpoint) {
      return; // Individual checkpoint validation is visual
    }

    const checkpointDtos = formToCheckpointDtos(checkpoints);

    if (editingRoute) {
      const dto: UpdateRouteDto = {
        name: trimmedName,
        routeType,
        checkpoints: checkpointDtos,
      };
      onSave(dto);
    } else {
      const dto: Omit<CreateRouteDto, 'userId'> = {
        name: trimmedName,
        routeType,
        checkpoints: checkpointDtos,
      };
      onSave(dto);
    }
  }, [name, routeType, checkpoints, editingRoute, onSave]);

  const isEditing = editingRoute !== null;
  const title = isEditing ? '경로 수정' : '새 경로 추가';
  const canDeleteCheckpoint = checkpoints.length > 2;

  // Save disabled: name empty, any checkpoint name empty, or saving
  const isSaveDisabled =
    isSaving ||
    !name.trim() ||
    checkpoints.some((cp) => !cp.name.trim());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Handle bar */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Text style={styles.closeText}>취소</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Route Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>경로 이름</Text>
            <TextInput
              style={[styles.nameInput, nameError ? styles.nameInputError : null]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (text.trim()) setNameError('');
              }}
              placeholder="예: 출근 경로"
              placeholderTextColor={colors.gray400}
              maxLength={50}
              returnKeyType="done"
              accessibilityLabel="경로 이름 입력"
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}
          </View>

          {/* Route Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>경로 유형</Text>
            <RouteTypeSelector selected={routeType} onChange={setRouteType} />
          </View>

          {/* Checkpoints */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              체크포인트 ({checkpoints.length}개)
            </Text>
            {checkpoints.map((cp, index) => (
              <CheckpointRow
                key={cp.tempId}
                checkpoint={cp}
                index={index}
                isLast={index === checkpoints.length - 1}
                canDelete={canDeleteCheckpoint}
                onChange={(updated) => handleUpdateCheckpoint(cp.tempId, updated)}
                onDelete={() => handleDeleteCheckpoint(cp.tempId)}
              />
            ))}
            <Pressable
              style={styles.addCheckpointButton}
              onPress={handleAddCheckpoint}
              accessibilityRole="button"
              accessibilityLabel="체크포인트 추가"
            >
              <Text style={styles.addCheckpointText}>+ 체크포인트 추가</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaveDisabled}
            accessibilityRole="button"
            accessibilityLabel="저장"
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? '저장 중...' : '저장'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray500,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 10,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.gray900,
    backgroundColor: colors.gray50,
  },
  nameInputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  addCheckpointButton: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addCheckpointText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
