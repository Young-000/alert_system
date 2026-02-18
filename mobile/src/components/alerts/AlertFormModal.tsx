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
import { buildCronExpression, parseCronDays, parseCronTime } from '@/utils/cron';

import { AlertTypeSelector } from './AlertTypeSelector';
import { DaySelector } from './DaySelector';
import { TimePicker } from './TimePicker';

import type { Alert, AlertType, DayOfWeek } from '@/types/alert';

type AlertFormModalProps = {
  visible: boolean;
  editingAlert: Alert | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    schedule: string;
    alertTypes: AlertType[];
  }) => void;
};

export function AlertFormModal({
  visible,
  editingAlert,
  isSaving,
  onClose,
  onSave,
}: AlertFormModalProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([1, 2, 3, 4, 5]);
  const [selectedTypes, setSelectedTypes] = useState<AlertType[]>(['weather']);
  const [nameError, setNameError] = useState('');
  const [typeError, setTypeError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (visible) {
      if (editingAlert) {
        setName(editingAlert.name);
        const { hour: h, minute: m } = parseCronTime(editingAlert.schedule);
        setHour(h);
        setMinute(m);
        setSelectedDays(parseCronDays(editingAlert.schedule));
        setSelectedTypes([...editingAlert.alertTypes]);
      } else {
        // Reset for create
        setName('');
        setHour(8);
        setMinute(0);
        setSelectedDays([1, 2, 3, 4, 5]);
        setSelectedTypes(['weather']);
      }
      setNameError('');
      setTypeError('');
    }
  }, [visible, editingAlert]);

  const handleSave = useCallback(() => {
    // Validation
    const trimmedName = name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('알림 이름을 입력해주세요');
      hasError = true;
    } else {
      setNameError('');
    }

    if (selectedTypes.length === 0) {
      setTypeError('최소 1개 알림 유형을 선택해주세요');
      hasError = true;
    } else {
      setTypeError('');
    }

    if (hasError) return;

    const schedule = buildCronExpression(hour, minute, selectedDays);
    onSave({
      name: trimmedName,
      schedule,
      alertTypes: selectedTypes,
    });
  }, [name, hour, minute, selectedDays, selectedTypes, onSave]);

  const isEditing = editingAlert !== null;
  const title = isEditing ? '알림 수정' : '새 알림 추가';

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
          {/* Alert Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>알림 이름</Text>
            <TextInput
              style={[styles.nameInput, nameError ? styles.nameInputError : null]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (text.trim()) setNameError('');
              }}
              placeholder="예: 아침 날씨 알림"
              placeholderTextColor={colors.gray400}
              maxLength={30}
              returnKeyType="done"
              accessibilityLabel="알림 이름 입력"
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}
          </View>

          {/* Time Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>알림 시간</Text>
            <TimePicker
              hour={hour}
              minute={minute}
              onChangeHour={setHour}
              onChangeMinute={setMinute}
            />
          </View>

          {/* Day Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>반복 요일</Text>
            <DaySelector
              selectedDays={selectedDays}
              onChangeDays={setSelectedDays}
            />
          </View>

          {/* Alert Type Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>알림 유형</Text>
            <AlertTypeSelector
              selectedTypes={selectedTypes}
              onChangeTypes={(types) => {
                setSelectedTypes(types);
                if (types.length > 0) setTypeError('');
              }}
            />
            {typeError ? (
              <Text style={styles.errorText}>{typeError}</Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
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
