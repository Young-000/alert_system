import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type PreAlertPickerProps = {
  value: number[];
  onChange: (alerts: number[]) => void;
};

const ALERT_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: '30분 전' },
  { value: 15, label: '15분 전' },
  { value: 10, label: '10분 전' },
  { value: 5, label: '5분 전' },
  { value: 0, label: '출발 시각' },
];

export function PreAlertPicker({
  value,
  onChange,
}: PreAlertPickerProps): React.JSX.Element {
  const handleToggle = (alertMin: number): void => {
    const isSelected = value.includes(alertMin);
    if (isSelected) {
      onChange(value.filter((v) => v !== alertMin));
    } else {
      onChange([...value, alertMin].sort((a, b) => b - a));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>사전 알림</Text>
      <View style={styles.row}>
        {ALERT_OPTIONS.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => handleToggle(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} 알림 ${isSelected ? '해제' : '선택'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                {opt.label}
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
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
  },
  chipTextActive: {
    color: colors.primary,
  },
});
