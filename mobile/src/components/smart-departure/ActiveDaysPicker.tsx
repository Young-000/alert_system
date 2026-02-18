import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type ActiveDaysPickerProps = {
  value: number[];
  onChange: (days: number[]) => void;
};

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
];

export function ActiveDaysPicker({
  value,
  onChange,
}: ActiveDaysPickerProps): React.JSX.Element {
  const handleToggle = (day: number): void => {
    const isSelected = value.includes(day);
    if (isSelected) {
      // Prevent deselecting all days
      if (value.length <= 1) return;
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>활성 요일</Text>
      <View style={styles.row}>
        {DAY_LABELS.map((day) => {
          const isActive = value.includes(day.value);
          return (
            <Pressable
              key={day.value}
              style={[styles.dayButton, isActive && styles.dayButtonActive]}
              onPress={() => handleToggle(day.value)}
              accessibilityRole="button"
              accessibilityLabel={`${day.label}요일 ${isActive ? '해제' : '선택'}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.dayText, isActive && styles.dayTextActive]}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
  },
  dayTextActive: {
    color: colors.primary,
  },
});
