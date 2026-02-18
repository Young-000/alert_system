import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type CountdownState = 'relaxed' | 'warning' | 'urgent' | 'past' | 'departed';

type DepartureCountdownProps = {
  minutesUntilDeparture: number;
  status: string;
};

function getCountdownState(
  minutes: number,
  status: string,
): CountdownState {
  if (status === 'departed') return 'departed';
  if (minutes <= 0) return 'past';
  if (minutes <= 10) return 'urgent';
  if (minutes <= 30) return 'warning';
  return 'relaxed';
}

const STATE_COLORS: Record<CountdownState, string> = {
  relaxed: '#3B82F6',
  warning: '#F59E0B',
  urgent: '#EF4444',
  past: '#EF4444',
  departed: '#10B981',
};

const STATE_BG_COLORS: Record<CountdownState, string> = {
  relaxed: '#DBEAFE',
  warning: '#FEF3C7',
  urgent: '#FEE2E2',
  past: '#FEE2E2',
  departed: '#D1FAE5',
};

function formatCountdownText(minutes: number, status: string): string {
  if (status === 'departed') return '출발했어요!';
  if (minutes <= 0) return `출발 시각이 ${Math.abs(minutes)}분 지났어요`;
  if (minutes <= 10) return '곧 출발하세요!';
  return `출발까지 ${minutes}분`;
}

export function DepartureCountdown({
  minutesUntilDeparture,
  status,
}: DepartureCountdownProps): React.JSX.Element {
  const state = getCountdownState(minutesUntilDeparture, status);
  const stateColor = STATE_COLORS[state];
  const stateBg = STATE_BG_COLORS[state];
  const text = formatCountdownText(minutesUntilDeparture, status);

  return (
    <View
      style={[styles.container, { backgroundColor: stateBg }]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Text style={[styles.emoji]}>
        {state === 'departed' ? '✅' : state === 'past' ? '⏰' : '🚀'}
      </Text>
      <Text style={[styles.text, { color: stateColor }]}>{text}</Text>
      {status !== 'departed' && minutesUntilDeparture > 0 && (
        <Text style={[styles.minutes, { color: stateColor }]}>
          {minutesUntilDeparture}분
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  minutes: {
    fontSize: 22,
    fontWeight: '800',
  },
});
