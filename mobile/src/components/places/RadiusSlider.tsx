import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

const MIN_RADIUS = 100;
const MAX_RADIUS = 500;
const STEP = 50;
const STEPS = (MAX_RADIUS - MIN_RADIUS) / STEP;

type RadiusSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RadiusSlider({ value, onChange }: RadiusSliderProps): React.JSX.Element {
  const stepButtons = Array.from({ length: STEPS + 1 }, (_, i) => MIN_RADIUS + i * STEP);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>감지 반경</Text>
        <Text style={styles.value}>{value}m</Text>
      </View>
      <View style={styles.stepsRow}>
        {stepButtons.map((step) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepDot,
                step <= value && styles.stepDotActive,
                step === value && styles.stepDotCurrent,
              ]}
            >
              <View
                style={[
                  styles.stepDotInner,
                  step <= value && styles.stepDotInnerActive,
                ]}
              />
            </View>
            {step < MAX_RADIUS && (
              <View
                style={[
                  styles.stepLine,
                  step < value && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.buttonsRow}>
        {stepButtons.map((step) => (
          <View key={step} style={styles.stepButtonContainer}>
            <Text
              style={[
                styles.stepLabel,
                step === value && styles.stepLabelActive,
              ]}
              onPress={() => onChange(step)}
              accessibilityRole="button"
              accessibilityLabel={`반경 ${step}미터로 설정`}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primaryLight,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  stepDotInnerActive: {
    backgroundColor: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.gray200,
  },
  stepLineActive: {
    backgroundColor: colors.primaryLight,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  stepButtonContainer: {
    width: 16,
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 10,
    color: colors.gray400,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
