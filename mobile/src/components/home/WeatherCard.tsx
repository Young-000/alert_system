import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { formatTemperature } from '@/utils/format';
import { getWeatherAdvice, translateCondition } from '@/utils/weather';
import { SkeletonBox } from '@/components/SkeletonBox';

import type { AirQualityData, AqiStatus, WeatherData } from '@/types/home';

type WeatherCardProps = {
  weather: WeatherData | null;
  weatherError: string | null;
  airQuality: AirQualityData | null;
  aqiStatus: AqiStatus;
  onRetry: () => void;
};

export function WeatherCard({
  weather,
  weatherError,
  airQuality,
  aqiStatus,
  onRetry,
}: WeatherCardProps): React.JSX.Element {
  // Error state
  if (weatherError && !weather) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>{weatherError}</Text>
        <Text style={styles.retryButton} onPress={onRetry}>
          다시 시도
        </Text>
      </View>
    );
  }

  // Loading state
  if (!weather) {
    return (
      <View style={styles.card}>
        <SkeletonBox width={80} height={48} borderRadius={8} />
        <SkeletonBox width={60} height={20} style={styles.mt12} />
        <View style={styles.detailRow}>
          <SkeletonBox width={100} height={16} />
          <SkeletonBox width={80} height={16} />
        </View>
        <SkeletonBox width={140} height={16} style={styles.mt12} />
      </View>
    );
  }

  const conditionText = weather.conditionKr || translateCondition(weather.condition);
  const advice = getWeatherAdvice(weather, aqiStatus);

  return (
    <View style={styles.card} accessibilityRole="summary">
      {/* Main temperature + emoji */}
      <View style={styles.tempRow}>
        <Text style={styles.emoji}>{weather.conditionEmoji || ''}</Text>
        <Text style={styles.temperature}>
          {formatTemperature(weather.temperature)}
        </Text>
      </View>

      {/* Condition text */}
      <Text style={styles.condition}>{conditionText}</Text>

      {/* Detail row: AQI + Humidity */}
      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>미세먼지</Text>
          <View
            style={[
              styles.aqiBadge,
              { backgroundColor: aqiStatus.backgroundColor },
            ]}
          >
            <Text style={[styles.aqiText, { color: aqiStatus.color }]}>
              {aqiStatus.label}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>습도</Text>
          <Text style={styles.detailValue}>{weather.humidity}%</Text>
        </View>
      </View>

      {/* Feels like */}
      {weather.feelsLike != null && (
        <Text style={styles.feelsLike}>
          체감온도 {formatTemperature(weather.feelsLike)}
        </Text>
      )}

      {/* Advice */}
      <View style={styles.adviceRow}>
        <Text style={styles.adviceEmoji}>💡</Text>
        <Text style={styles.adviceText}>{advice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 36,
  },
  temperature: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.gray900,
  },
  condition: {
    fontSize: 16,
    color: colors.gray600,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.gray500,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  aqiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aqiText: {
    fontSize: 13,
    fontWeight: '600',
  },
  feelsLike: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 8,
  },
  adviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  adviceEmoji: {
    fontSize: 16,
  },
  adviceText: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  mt12: {
    marginTop: 12,
  },
});
