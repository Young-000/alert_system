import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { DayOfWeek } from '@/types/alert';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const PRESETS: { label: string; days: DayOfWeek[] }[] = [
  { label: '평일', days: [1, 2, 3, 4, 5] },
  { label: '매일', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '주말', days: [0, 6] },
];

type DaySelectorProps = {
  selectedDays: DayOfWeek[];
  onChangeDays: (days: DayOfWeek[]) => void;
};

export function DaySelector({
  selectedDays,
  onChangeDays,
}: DaySelectorProps): React.JSX.Element {
  const toggleDay = useCallback(
    (day: DayOfWeek) => {
      const isSelected = selectedDays.includes(day);
      if (isSelected) {
        // Prevent deselecting if it's the last one
        if (selectedDays.length <= 1) return;
        onChangeDays(selectedDays.filter((d) => d !== day));
      } else {
        onChangeDays([...selectedDays, day]);
      }
    },
    [selectedDays, onChangeDays],
  );

  const applyPreset = useCallback(
    (days: DayOfWeek[]) => {
      onChangeDays(days);
    },
    [onChangeDays],
  );

  return (
    <View>
      {/* Day circles */}
      <View style={styles.dayRow}>
        {DAY_LABELS.map((label, index) => {
          const day = index as DayOfWeek;
          const isSelected = selectedDays.includes(day);
          return (
            <Pressable
              key={day}
              style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
              onPress={() => toggleDay(day)}
              accessibilityRole="button"
              accessibilityLabel={`${label}요일 ${isSelected ? '선택됨' : '선택 안됨'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Presets */}
      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            style={styles.presetButton}
            onPress={() => applyPreset(preset.days)}
            accessibilityRole="button"
            accessibilityLabel={`${preset.label} 프리셋`}
          >
            <Text style={styles.presetText}>{preset.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
  },
  dayTextSelected: {
    color: colors.white,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray600,
  },
});
