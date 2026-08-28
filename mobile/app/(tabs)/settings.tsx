import React from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInfoSection } from '@/components/settings/AppInfoSection';
import { GeofenceSection } from '@/components/settings/GeofenceSection';
import { NotificationSection } from '@/components/settings/NotificationSection';
import { QuickLinksSection } from '@/components/settings/QuickLinksSection';
import { SmartDepartureSection } from '@/components/settings/SmartDepartureSection';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useGeofence } from '@/hooks/useGeofence';
import { usePlaces } from '@/hooks/usePlaces';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSmartDeparture } from '@/hooks/useSmartDeparture';
import { notifyIfToggleFailed } from '@/utils/toggle-feedback';

export default function SettingsScreen(): React.JSX.Element {
  const { user, isLoggedIn, logout } = useAuth();
  const { isEnabled, isLoading: isPushLoading, error: pushError, enable, disable } =
    usePushNotifications({ enabled: isLoggedIn });
  // `error`를 버리면 조회 실패가 "장소 0개"로 위장된다 — 장소를 등록해 둔
  // 사용자가 "장소를 등록하면 자동 감지가 시작됩니다"를 읽게 된다.
  const { places, error: placesError } = usePlaces();
  const activePlacesCount = places.filter((place) => place.isActive).length;
  const {
    settings: smartDepartureSettings,
    isLoading: isSmartDepartureLoading,
    error: smartDepartureError,
    toggleSetting: toggleSmartDeparture,
  } = useSmartDeparture();
  const {
    isEnabled: isGeofenceEnabled,
    isPermissionLoading: isGeofenceLoading,
    permissionStatus,
    offlineCount,
    syncMonitoredPlaces,
    stopMonitoring,
  } = useGeofence();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handlePushToggle = (value: boolean): void => {
    if (value) {
      void enable();
    } else {
      void disable();
    }
  };

  const handleLogout = (): void => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = (): void => {
    setShowLogoutConfirm(false);
    void logout();
  };

  const cancelLogout = (): void => {
    setShowLogoutConfirm(false);
  };

  // 같은 화면의 형제 토글과 같은 계약으로 맞춘다 — 스마트 출발은
  // `notifyIfToggleFailed`, 푸시는 `pushError`를 섹션에 그려 실패를 표면화한다.
  // 자동 감지만 boolean을 버리고 있어서, 실패하면 스위치가 깜빡였다 제자리로
  // 돌아올 뿐 이유가 어디에도 없었다.
  const handleGeofenceToggle = (value: boolean): void => {
    notifyIfToggleFailed(value ? syncMonitoredPlaces(places) : stopMonitoring());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>설정</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {isLoggedIn
                ? user?.name?.[0]?.toUpperCase() ?? '?'
                : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {isLoggedIn ? (
              <>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </>
            ) : (
              <Text style={styles.profileName}>게스트</Text>
            )}
          </View>
        </View>

        {/* Quick Links */}
        <QuickLinksSection />

        {/* Geofence Auto Detection */}
        {isLoggedIn && (
          <GeofenceSection
            isEnabled={isGeofenceEnabled}
            isLoading={isGeofenceLoading}
            permissionStatus={permissionStatus}
            placesCount={places.length}
            activePlacesCount={activePlacesCount}
            placesError={placesError}
            offlineCount={offlineCount}
            onToggle={handleGeofenceToggle}
          />
        )}

        {/* Smart Departure */}
        {isLoggedIn && (
          <SmartDepartureSection
            settings={smartDepartureSettings}
            isLoading={isSmartDepartureLoading}
            error={smartDepartureError}
            onToggle={(id) => notifyIfToggleFailed(toggleSmartDeparture(id))}
          />
        )}

        {/* Push Notifications */}
        {isLoggedIn && (
          <NotificationSection
            isEnabled={isEnabled}
            isLoading={isPushLoading}
            error={pushError}
            onToggle={handlePushToggle}
          />
        )}

        {/* App Info */}
        <AppInfoSection />

        {/* Logout */}
        {isLoggedIn && (
          <View style={styles.logoutSection}>
            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="로그아웃"
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelLogout}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>로그아웃</Text>
            <Text style={styles.modalMessage}>정말 로그아웃하시겠습니까?</Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelLogout}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
                accessibilityRole="button"
                accessibilityLabel="로그아웃 확인"
              >
                <Text style={styles.modalButtonTextConfirm}>로그아웃</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.gray500,
  },
  logoutSection: {
    marginTop: 8,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray100,
  },
  modalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  modalButtonTextCancel: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
