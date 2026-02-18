import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert as RNAlert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyRouteView } from '@/components/commute/EmptyRouteView';
import { GuestCommuteView } from '@/components/commute/GuestCommuteView';
import { NotificationItem } from '@/components/commute/NotificationItem';
import { NotificationStatsSummary } from '@/components/commute/NotificationStatsSummary';
import { RouteCard } from '@/components/commute/RouteCard';
import { RouteFormModal } from '@/components/commute/RouteFormModal';
import { SwipeableRow } from '@/components/alerts/SwipeableRow';
import { SkeletonCard } from '@/components/SkeletonBox';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { useRoutes } from '@/hooks/useRoutes';

import type { RouteResponse } from '@/types/home';
import type { CreateRouteDto, UpdateRouteDto } from '@/types/route';

export default function CommuteScreen(): React.JSX.Element {
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const {
    routes,
    isLoading: isRoutesLoading,
    isRefreshing: isRoutesRefreshing,
    error: routesError,
    isSaving,
    refresh: refreshRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    togglePreferred,
  } = useRoutes();

  const {
    items: historyItems,
    stats,
    isLoading: isHistoryLoading,
    isRefreshing: isHistoryRefreshing,
    error: historyError,
    refresh: refreshHistory,
  } = useNotificationHistory();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteResponse | null>(null);

  const isLoading = isRoutesLoading || isHistoryLoading;
  const isRefreshing = isRoutesRefreshing || isHistoryRefreshing;

  const routeCount = useMemo(() => routes.length, [routes]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([refreshRoutes(), refreshHistory()]);
  }, [refreshRoutes, refreshHistory]);

  const handleOpenCreate = useCallback(() => {
    setEditingRoute(null);
    setModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((route: RouteResponse) => {
    setEditingRoute(route);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingRoute(null);
  }, []);

  const handleSave = useCallback(
    async (dto: Omit<CreateRouteDto, 'userId'> | UpdateRouteDto) => {
      let success: boolean;
      if (editingRoute) {
        success = await updateRoute(editingRoute.id, dto as UpdateRouteDto);
      } else {
        success = await createRoute(dto as Omit<CreateRouteDto, 'userId'>);
      }
      if (success) {
        handleCloseModal();
      } else {
        RNAlert.alert('오류', '저장에 실패했습니다. 다시 시도해주세요.');
      }
    },
    [editingRoute, createRoute, updateRoute, handleCloseModal],
  );

  const handleDeleteRoute = useCallback(
    (route: RouteResponse) => {
      RNAlert.alert(
        '경로 삭제',
        `"${route.name}"을 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => void deleteRoute(route.id),
          },
        ],
      );
    },
    [deleteRoute],
  );

  // ─── Auth loading ──────────────────────────────────
  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>출퇴근</Text>
          <LoadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Guest view ────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>출퇴근</Text>
          <GuestCommuteView />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading state ─────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>출퇴근</Text>
          <LoadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main content ──────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>출퇴근</Text>
          {routeCount > 0 && (
            <Text style={styles.routeCounter}>{routeCount}개</Text>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.primary}
            />
          }
        >
          {/* ─── Route Section ────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>내 경로</Text>
              <Pressable
                onPress={handleOpenCreate}
                style={styles.addButton}
                accessibilityRole="button"
                accessibilityLabel="경로 추가"
                hitSlop={8}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>

            {routesError ? (
              <ErrorBlock
                message={routesError}
                onRetry={() => void refreshRoutes()}
              />
            ) : routes.length === 0 ? (
              <EmptyRouteView onAdd={handleOpenCreate} />
            ) : (
              routes.map((route) => (
                <SwipeableRow
                  key={route.id}
                  onDelete={() => handleDeleteRoute(route)}
                >
                  <RouteCard
                    route={route}
                    onPress={() => handleOpenEdit(route)}
                    onTogglePreferred={() => togglePreferred(route.id)}
                  />
                </SwipeableRow>
              ))
            )}
          </View>

          {/* ─── Notification History Section ─────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>알림 기록</Text>

            {historyError ? (
              <ErrorBlock
                message={historyError}
                onRetry={() => void refreshHistory()}
              />
            ) : (
              <>
                <NotificationStatsSummary stats={stats} />
                {historyItems.length === 0 ? (
                  <EmptyHistoryView />
                ) : (
                  historyItems.map((item) => (
                    <NotificationItem key={item.id} item={item} />
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Route Form Modal */}
      <RouteFormModal
        visible={modalVisible}
        editingRoute={editingRoute}
        isSaving={isSaving}
        onClose={handleCloseModal}
        onSave={(dto) => void handleSave(dto)}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────

function LoadingSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.errorBlock}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="다시 시도"
      >
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

function EmptyHistoryView(): React.JSX.Element {
  return (
    <View style={styles.emptyHistory}>
      <Text style={styles.emptyHistoryIcon}>📭</Text>
      <Text style={styles.emptyHistoryText}>알림 기록이 없어요</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
  },
  routeCounter: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.white,
    lineHeight: 22,
  },
  skeletonContainer: {
    paddingTop: 4,
  },
  // Error block
  errorBlock: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  // Empty history
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.gray500,
  },
});
