import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { useHomeData } from '@/hooks/useHomeData';
import { useSmartDepartureToday } from '@/hooks/useSmartDepartureToday';
import { getGreeting } from '@/utils/weather';
import { buildBriefing } from '@/utils/briefing';
import { SkeletonCard } from '@/components/SkeletonBox';
import { BriefingCard } from '@/components/home/BriefingCard';
import { SmartDepartureCard } from '@/components/smart-departure/SmartDepartureCard';
import { WeatherCard } from '@/components/home/WeatherCard';
import { TransitCard } from '@/components/home/TransitCard';
import { NextAlertCard } from '@/components/home/NextAlertCard';
import { EmptyRouteCard } from '@/components/home/EmptyRouteCard';
import { GuestView } from '@/components/home/GuestView';
import { NetworkErrorView } from '@/components/home/NetworkErrorView';

export default function HomeScreen(): React.JSX.Element {
  const data = useHomeData();
  const departure = useSmartDepartureToday();

  // ── Guest (not logged in) ──
  if (!data.isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <GuestView />
      </SafeAreaView>
    );
  }

  // ── Initial Loading ──
  if (data.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.greetingSkeleton} />
          </View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  // ── Full Network Error ──
  if (data.loadError && !data.weather && data.routes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NetworkErrorView onRetry={data.retryLoad} />
      </SafeAreaView>
    );
  }

  // ── Build briefing data ──
  const briefing = data.activeRoute
    ? buildBriefing({
        weather: data.weather,
        aqiStatus: data.aqiStatus,
        commuteStats: data.commuteStats,
        transitInfos: data.transitInfos,
        routeName: data.activeRoute.name,
      })
    : null;

  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isRefreshing}
            onRefresh={data.onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          {data.userName ? (
            <Text style={styles.userName}>{data.userName}님</Text>
          ) : null}
        </View>

        {/* Partial error notice */}
        {data.loadError ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>{data.loadError}</Text>
          </View>
        ) : null}

        {/* Briefing card */}
        {briefing ? <BriefingCard briefing={briefing} /> : null}

        {/* Smart Departure card */}
        {data.isLoggedIn && (
          <SmartDepartureCard
            commute={departure.commute}
            return_={departure.return_}
            commuteMinutes={departure.commuteMinutes}
            returnMinutes={departure.returnMinutes}
            isLoading={departure.isLoading}
          />
        )}

        {/* Weather card */}
        <WeatherCard
          weather={data.weather}
          weatherError={data.weatherError}
          airQuality={data.airQuality}
          aqiStatus={data.aqiStatus}
          onRetry={data.retryLoad}
        />

        {/* Transit / Empty Route */}
        {data.activeRoute ? (
          <TransitCard
            route={data.activeRoute}
            transitInfos={data.transitInfos}
            lastTransitUpdate={data.lastTransitUpdate}
            isTransitRefreshing={data.isTransitRefreshing}
          />
        ) : (
          <EmptyRouteCard />
        )}

        {/* Next Alert */}
        {data.nextAlert ? (
          <NextAlertCard
            time={data.nextAlert.time}
            label={data.nextAlert.label}
          />
        ) : null}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
  },
  userName: {
    fontSize: 15,
    color: colors.gray500,
    marginTop: 2,
  },
  greetingSkeleton: {
    width: 180,
    height: 26,
    backgroundColor: colors.skeletonBase,
    borderRadius: 8,
  },
  errorNotice: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorNoticeText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
