import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { getTimeContext } from '@/utils/route';
import { AdviceChip } from './AdviceChip';

import type { ContextBriefingResult } from '@/types/briefing';
import type { BriefingData, WeatherData, AqiStatus } from '@/types/home';

// ─── Props ──────────────────────────────────────────

type BriefingCardProps = {
  /** New context briefing with advices (from useBriefingAdvice). */
  contextBriefing: ContextBriefingResult | null;
  /** Fallback legacy briefing (from buildBriefing). */
  legacyBriefing: BriefingData | null;
  /** Weather data for the summary line. */
  weather: WeatherData | null;
  /** AQI status for the summary line. */
  aqiStatus: AqiStatus;
};

// ─── Component ──────────────────────────────────────

export function BriefingCard({
  contextBriefing,
  legacyBriefing,
  weather,
  aqiStatus,
}: BriefingCardProps): React.JSX.Element | null {
  const context = getTimeContext();
  const backgroundColor =
    context === 'morning'
      ? colors.briefingMorning
      : context === 'evening'
        ? colors.briefingEvening
        : colors.briefingTomorrow;

  // If we have context briefing with advices, use the new design
  if (contextBriefing && contextBriefing.advices.length > 0) {
    const summaryLine = buildSummaryLine(weather, aqiStatus);

    return (
      <View
        style={[styles.card, { backgroundColor }]}
        accessibilityRole="summary"
        accessibilityLabel={buildAccessibilityLabel(contextBriefing, summaryLine)}
      >
        <Text style={styles.contextLabel}>
          {contextBriefing.contextLabel}
        </Text>

        <View style={styles.chipGrid}>
          {contextBriefing.advices.map((advice, index) => (
            <AdviceChip
              key={`${advice.category}-${index}`}
              icon={advice.icon}
              message={advice.message}
              severity={advice.severity}
            />
          ))}
        </View>

        {summaryLine ? (
          <Text style={styles.summaryLine} numberOfLines={1}>
            {summaryLine}
          </Text>
        ) : null}
      </View>
    );
  }

  // Fallback: legacy briefing card (simple text)
  if (legacyBriefing) {
    return (
      <View
        style={[styles.card, { backgroundColor }]}
        accessibilityRole="summary"
        accessibilityLabel={`${legacyBriefing.contextLabel}. ${legacyBriefing.main}. ${legacyBriefing.sub}`}
      >
        <Text style={styles.contextLabel}>{legacyBriefing.contextLabel}</Text>
        <Text style={styles.legacyMain}>{legacyBriefing.main}</Text>
        <Text style={styles.legacySub} numberOfLines={1}>
          {legacyBriefing.sub}
        </Text>
      </View>
    );
  }

  // Nothing to show
  return null;
}

// ─── Helpers ────────────────────────────────────────

function buildSummaryLine(
  weather: WeatherData | null,
  aqiStatus: AqiStatus,
): string {
  const parts: string[] = [];

  if (weather) {
    const temp = `${Math.round(weather.temperature)}°C`;
    const condition = weather.conditionKr || weather.condition;
    parts.push(`${temp} ${condition}`);
  }

  if (aqiStatus.label !== '-') {
    parts.push(`미세먼지 ${aqiStatus.label}`);
  }

  return parts.join(' · ');
}

function buildAccessibilityLabel(
  briefing: ContextBriefingResult,
  summaryLine: string,
): string {
  const adviceTexts = briefing.advices
    .map((a) => a.message)
    .join('. ');
  const parts = [briefing.contextLabel, adviceTexts];
  if (summaryLine) parts.push(summaryLine);
  return parts.join('. ');
}

// ─── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryLine: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 10,
  },
  // Legacy fallback styles
  legacyMain: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  legacySub: {
    fontSize: 13,
    color: colors.gray500,
  },
});
