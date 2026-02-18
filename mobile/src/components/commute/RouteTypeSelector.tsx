import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { RouteType } from '@/types/home';

type RouteTypeSelectorProps = {
  selected: RouteType;
  onChange: (type: RouteType) => void;
};

const ROUTE_TYPES: { value: RouteType; label: string }[] = [
  { value: 'morning', label: '출근' },
  { value: 'evening', label: '퇴근' },
  { value: 'custom', label: '커스텀' },
];

export function RouteTypeSelector({
  selected,
  onChange,
}: RouteTypeSelectorProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {ROUTE_TYPES.map((type) => {
        const isSelected = selected === type.value;
        return (
          <Pressable
            key={type.value}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onChange(type.value)}
            accessibilityRole="button"
            accessibilityLabel={`${type.label} 경로 타입`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.gray100,
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
  },
  pillTextSelected: {
    color: colors.white,
  },
});
