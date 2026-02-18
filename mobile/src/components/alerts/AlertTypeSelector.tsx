import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { AlertType } from '@/types/alert';

type AlertTypeOption = {
  type: AlertType;
  label: string;
  icon: string;
};

const ALERT_TYPE_OPTIONS: AlertTypeOption[] = [
  { type: 'weather', label: '날씨', icon: '☀️' },
  { type: 'airQuality', label: '미세먼지', icon: '😷' },
  { type: 'subway', label: '지하철', icon: '🚇' },
  { type: 'bus', label: '버스', icon: '🚌' },
];

type AlertTypeSelectorProps = {
  selectedTypes: AlertType[];
  onChangeTypes: (types: AlertType[]) => void;
};

export function AlertTypeSelector({
  selectedTypes,
  onChangeTypes,
}: AlertTypeSelectorProps): React.JSX.Element {
  const toggleType = useCallback(
    (type: AlertType) => {
      const isSelected = selectedTypes.includes(type);
      if (isSelected) {
        // Prevent deselecting if it's the last one
        if (selectedTypes.length <= 1) return;
        onChangeTypes(selectedTypes.filter((t) => t !== type));
      } else {
        onChangeTypes([...selectedTypes, type]);
      }
    },
    [selectedTypes, onChangeTypes],
  );

  return (
    <View style={styles.grid}>
      {ALERT_TYPE_OPTIONS.map((option) => {
        const isSelected = selectedTypes.includes(option.type);
        return (
          <Pressable
            key={option.type}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => toggleType(option.type)}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} ${isSelected ? '선택됨' : '선택 안됨'}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.chipIcon}>{option.icon}</Text>
            <Text
              style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
            >
              {option.label}
            </Text>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    gap: 6,
    minWidth: '45%' as unknown as number,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    flex: 1,
  },
  chipLabelSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
