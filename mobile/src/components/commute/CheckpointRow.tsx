import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { CheckpointType, TransportMode } from '@/types/home';

export type CheckpointFormItem = {
  tempId: string;
  name: string;
  checkpointType: CheckpointType;
  transportMode?: TransportMode;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
};

type CheckpointRowProps = {
  checkpoint: CheckpointFormItem;
  index: number;
  isLast: boolean;
  canDelete: boolean;
  onChange: (updated: CheckpointFormItem) => void;
  onDelete: () => void;
};

const CHECKPOINT_TYPES: { value: CheckpointType; label: string }[] = [
  { value: 'home', label: '집' },
  { value: 'subway', label: '지하철' },
  { value: 'bus_stop', label: '버스정류장' },
  { value: 'transfer_point', label: '환승' },
  { value: 'work', label: '회사' },
  { value: 'custom', label: '기타' },
];

const TRANSPORT_MODES: { value: TransportMode; label: string }[] = [
  { value: 'walk', label: '도보' },
  { value: 'subway', label: '지하철' },
  { value: 'bus', label: '버스' },
  { value: 'transfer', label: '환승' },
  { value: 'taxi', label: '택시' },
  { value: 'bike', label: '자전거' },
];

function parseNumberInput(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const num = parseInt(text, 10);
  return isNaN(num) ? undefined : num;
}

export function CheckpointRow({
  checkpoint,
  index,
  isLast,
  canDelete,
  onChange,
  onDelete,
}: CheckpointRowProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Header row: sequence + name + delete */}
      <View style={styles.headerRow}>
        <View style={styles.sequenceCircle}>
          <Text style={styles.sequenceText}>{index + 1}</Text>
        </View>
        <TextInput
          style={styles.nameInput}
          value={checkpoint.name}
          onChangeText={(text) => onChange({ ...checkpoint, name: text })}
          placeholder="체크포인트 이름"
          placeholderTextColor={colors.gray400}
          maxLength={30}
          accessibilityLabel={`체크포인트 ${index + 1} 이름`}
        />
        {canDelete && (
          <Pressable
            style={styles.deleteButton}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`체크포인트 ${index + 1} 삭제`}
            hitSlop={8}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </Pressable>
        )}
      </View>

      {/* Checkpoint type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillContainer}
      >
        {CHECKPOINT_TYPES.map((type) => {
          const isSelected = checkpoint.checkpointType === type.value;
          return (
            <Pressable
              key={type.value}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => onChange({ ...checkpoint, checkpointType: type.value })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Transport mode (not shown for last checkpoint) */}
      {!isLast && (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>이동 수단</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillContainer}
          >
            {TRANSPORT_MODES.map((mode) => {
              const isSelected = checkpoint.transportMode === mode.value;
              return (
                <Pressable
                  key={mode.value}
                  style={[styles.smallPill, isSelected && styles.smallPillSelected]}
                  onPress={() => onChange({ ...checkpoint, transportMode: mode.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      isSelected && styles.smallPillTextSelected,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Duration inputs (not shown for last checkpoint) */}
      {!isLast && (
        <View style={styles.durationRow}>
          <View style={styles.durationField}>
            <Text style={styles.subLabel}>이동 시간 (분)</Text>
            <TextInput
              style={styles.durationInput}
              value={
                checkpoint.expectedDurationToNext !== undefined
                  ? String(checkpoint.expectedDurationToNext)
                  : ''
              }
              onChangeText={(text) =>
                onChange({ ...checkpoint, expectedDurationToNext: parseNumberInput(text) })
              }
              placeholder="0"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              accessibilityLabel={`체크포인트 ${index + 1} 이동 시간`}
            />
          </View>
          <View style={styles.durationField}>
            <Text style={styles.subLabel}>대기 시간 (분)</Text>
            <TextInput
              style={styles.durationInput}
              value={
                checkpoint.expectedWaitTime !== undefined
                  ? String(checkpoint.expectedWaitTime)
                  : ''
              }
              onChangeText={(text) =>
                onChange({ ...checkpoint, expectedWaitTime: parseNumberInput(text) })
              }
              placeholder="0"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              accessibilityLabel={`체크포인트 ${index + 1} 대기 시간`}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sequenceCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray900,
    backgroundColor: colors.white,
  },
  deleteButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 18,
  },
  pillScroll: {
    marginBottom: 8,
  },
  pillContainer: {
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray200,
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600,
  },
  pillTextSelected: {
    color: colors.white,
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  smallPillSelected: {
    backgroundColor: colors.primaryLight,
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray600,
  },
  smallPillTextSelected: {
    color: colors.primaryDark,
  },
  subSection: {
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
    marginBottom: 6,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationField: {
    flex: 1,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.gray900,
    backgroundColor: colors.white,
    textAlign: 'center',
  },
});
