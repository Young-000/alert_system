import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

const MIN_PREP = 10;
const MAX_PREP = 60;
const STEP = 5;
const STEPS = (MAX_PREP - MIN_PREP) / STEP;

type PrepTimeSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function PrepTimeSlider({
  value,
  onChange,
}: PrepTimeSliderProps): React.JSX.Element {
  const stepValues = Array.from(
    { length: STEPS + 1 },
    (_, i) => MIN_PREP + i * STEP,
  );

  // Show a subset of labels to avoid crowding
  const showLabel = (v: number): boolean =>
    v === MIN_PREP || v === MAX_PREP || v % 10 === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>준비시간</Text>
        <Text style={styles.value}>{value}분</Text>
      </View>
      <View style={styles.stepsRow}>
        {stepValues.map((step) => (
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
            {step < MAX_PREP && (
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
      <View style={styles.labelsRow}>
        {stepValues.map((step) => (
          <View key={step} style={styles.labelContainer}>
            {showLabel(step) ? (
              <Text
                style={[
                  styles.stepLabel,
                  step === value && styles.stepLabelActive,
                ]}
                onPress={() => onChange(step)}
                accessibilityRole="button"
                accessibilityLabel={`준비시간 ${step}분으로 설정`}
              >
                {step}
              </Text>
            ) : (
              <Text
                style={styles.stepLabelHidden}
                onPress={() => onChange(step)}
                accessibilityRole="button"
                accessibilityLabel={`준비시간 ${step}분으로 설정`}
              >
                {'·'}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    width: 14,
    height: 14,
    borderRadius: 7,
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
    width: 5,
    height: 5,
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
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  labelContainer: {
    width: 14,
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
  stepLabelHidden: {
    fontSize: 10,
    color: colors.gray300,
    textAlign: 'center',
  },
});
