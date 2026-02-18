import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert as RNAlert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertFormModal } from '@/components/alerts/AlertFormModal';
import { AlertListItem } from '@/components/alerts/AlertListItem';
import { EmptyAlertView } from '@/components/alerts/EmptyAlertView';
import { GuestAlertView } from '@/components/alerts/GuestAlertView';
import { SwipeableRow } from '@/components/alerts/SwipeableRow';
import { SkeletonCard } from '@/components/SkeletonBox';
import { colors } from '@/constants/colors';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';

import type { Alert, AlertType } from '@/types/alert';

export default function AlertsScreen(): React.JSX.Element {
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const {
    alerts,
    isLoading,
    isRefreshing,
    error,
    isSaving,
    refresh,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
  } = useAlerts();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  // Active count for header
  const activeCount = useMemo(
    () => alerts.filter((a) => a.enabled).length,
    [alerts],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingAlert(null);
    setModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((alert: Alert) => {
    setEditingAlert(alert);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingAlert(null);
  }, []);

  const handleSave = useCallback(
    async (data: { name: string; schedule: string; alertTypes: AlertType[] }) => {
      let success: boolean;
      if (editingAlert) {
        success = await updateAlert(editingAlert.id, data);
      } else {
        success = await createAlert(data);
      }
      if (success) {
        handleCloseModal();
      }
    },
    [editingAlert, createAlert, updateAlert, handleCloseModal],
  );

  const handleDelete = useCallback(
    (alert: Alert) => {
      RNAlert.alert(
        '알림 삭제',
        `"${alert.name}"을 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => void deleteAlert(alert.id),
          },
        ],
      );
    },
    [deleteAlert],
  );

  const renderItem = useCallback(
    ({ item }: { item: Alert }) => (
      <SwipeableRow onDelete={() => handleDelete(item)}>
        <AlertListItem
          alert={item}
          onPress={() => handleOpenEdit(item)}
          onToggle={() => toggleAlert(item.id)}
        />
      </SwipeableRow>
    ),
    [handleDelete, handleOpenEdit, toggleAlert],
  );

  const keyExtractor = useCallback((item: Alert) => item.id, []);

  // ─── Render States ─────────────────────────────────

  // Auth loading
  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>알림 설정</Text>
          <LoadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Guest view
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>알림 설정</Text>
          <GuestAlertView />
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>알림 설정</Text>
          <LoadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>알림 설정</Text>
          <ErrorView message={error} onRetry={() => void refresh()} />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>알림 설정</Text>
          <EmptyAlertView onAdd={handleOpenCreate} />
        </View>
        <AlertFormModal
          visible={modalVisible}
          editingAlert={editingAlert}
          isSaving={isSaving}
          onClose={handleCloseModal}
          onSave={(data) => void handleSave(data)}
        />
      </SafeAreaView>
    );
  }

  // List view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header with active counter */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>알림 설정</Text>
          <Text style={styles.activeCounter}>
            {activeCount}/{alerts.length} 활성
          </Text>
        </View>

        <FlatList
          data={alerts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
        />
      </View>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={handleOpenCreate}
        accessibilityRole="button"
        accessibilityLabel="새 알림 추가"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Modal */}
      <AlertFormModal
        visible={modalVisible}
        editingAlert={editingAlert}
        isSaving={isSaving}
        onClose={handleCloseModal}
        onSave={(data) => void handleSave(data)}
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

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>{message}</Text>
      <Text style={styles.errorDescription}>
        네트워크 연결을 확인해주세요
      </Text>
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
    marginBottom: 20,
  },
  activeCounter: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 100,
  },
  skeletonContainer: {
    paddingTop: 4,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.white,
    lineHeight: 30,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
